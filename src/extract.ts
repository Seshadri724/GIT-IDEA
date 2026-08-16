// Transcript -> candidate decisions, via headless `claude -p`. See
// ARCHITECTURE.md §7. This prompt is unvalidated (ROADMAP.md Phase 0 has not
// run) — treat its output as a draft for human confirmation, never as
// something record_decision writes automatically.

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RecordDecisionInput } from './store.js';
import { redactSecrets, containsSecret } from './redact.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = path.join(__dirname, '..', 'prompts', 'extract.md');

const CANDIDATE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      chose: { type: 'string' },
      why: { type: 'string' },
      rejected: {
        type: 'array',
        items: {
          type: 'object',
          properties: { name: { type: 'string' }, reason: { type: 'string' } },
          required: ['name', 'reason'],
        },
      },
      changes_mind: { type: 'string' },
      scope: { type: 'array', items: { type: 'string' } },
    },
    required: ['title', 'chose', 'why'],
  },
};

let promptCache: string | null = null;

async function loadPromptTemplate(): Promise<string> {
  if (promptCache === null) promptCache = await readFile(PROMPT_PATH, 'utf8');
  return promptCache;
}

/** Full prompt with the (redacted) transcript inlined — used for the direct-API-call fallback (ARCHITECTURE.md §7 option 3) and for inspecting exactly what the model sees. */
export async function buildPrompt(transcriptText: string): Promise<string> {
  const template = await loadPromptTemplate();
  return template.replace('{{TRANSCRIPT}}', redactSecrets(transcriptText));
}

/** Just the instructions, transcript excluded — used as the `-p` argument so the (much larger) transcript can go over stdin instead of argv, which has OS length limits. */
export async function extractionInstructions(): Promise<string> {
  const template = await loadPromptTemplate();
  return template.split('## Transcript')[0].trim();
}

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === 'string');
}

function isRejectedArray(x: unknown): x is { name: string; reason: string }[] {
  if (x === undefined) return true;
  if (!Array.isArray(x)) return false;
  return x.every(
    (v) => v && typeof v === 'object' && typeof (v as any).name === 'string' && typeof (v as any).reason === 'string',
  );
}

/** Structural check plus the nested-field validation the schema alone doesn't
 * enforce at runtime (ROADMAP.md Phase 3, step 2) — a model can return JSON
 * that matches the schema shape but has the wrong types inside arrays. */
function isCandidate(x: unknown): x is RecordDecisionInput {
  if (!x || typeof x !== 'object') return false;
  const c = x as Record<string, unknown>;
  if (typeof c.title !== 'string' || typeof c.chose !== 'string' || typeof c.why !== 'string') return false;
  if (!isRejectedArray(c.rejected)) return false;
  if (c.changes_mind !== undefined && typeof c.changes_mind !== 'string') return false;
  if (c.scope !== undefined && !isStringArray(c.scope)) return false;
  return true;
}

/** Defense in depth: the transcript sent to the model is redacted, but a
 * candidate can still surface secret-shaped text (the model paraphrasing
 * something redaction missed, or copying from its own training). Any field
 * that still looks like a secret drops the whole candidate rather than
 * writing a partially-scrubbed record — ARCHITECTURE.md §12. */
function candidateLeaksSecret(c: RecordDecisionInput): boolean {
  const fields = [c.title, c.chose, c.why, c.changes_mind ?? '', ...(c.rejected ?? []).flatMap((r) => [r.name, r.reason])];
  return fields.some((f) => containsSecret(f));
}

export interface RunExtractionOptions {
  model?: string;
  timeoutMs?: number;
  onError?: (err: Error) => void;
  /** Override the `claude` binary — for tests exercising the fail-open path without a live call. */
  bin?: string;
}

/**
 * Runs extraction over a transcript via headless `claude -p`. Fails open by
 * design (ARCHITECTURE.md §12): any failure — auth, timeout, malformed
 * output — resolves to an empty array rather than throwing, because this
 * runs from a SessionEnd hook that must never disrupt the session.
 */
export async function runExtraction(
  transcriptText: string,
  opts: RunExtractionOptions = {},
): Promise<RecordDecisionInput[]> {
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const redactedTranscript = redactSecrets(transcriptText);

  try {
    const instructions = await extractionInstructions();
    const args = [
      '-p',
      instructions,
      '--output-format',
      'json',
      '--json-schema',
      JSON.stringify(CANDIDATE_SCHEMA),
      '--model',
      opts.model ?? 'claude-opus-5',
    ];

    const stdout = await new Promise<string>((resolve, reject) => {
      const child = spawn(opts.bin ?? 'claude', args, { stdio: ['pipe', 'pipe', 'pipe'] });
      let out = '';
      let err = '';
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`claude -p timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      child.stdout.on('data', (d) => (out += d.toString()));
      child.stderr.on('data', (d) => (err += d.toString()));
      child.on('error', (e) => {
        clearTimeout(timer);
        reject(e);
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) reject(new Error(`claude -p exited ${code}: ${err.slice(0, 500)}`));
        else resolve(out);
      });

      child.stdin.write(redactedTranscript);
      child.stdin.end();
    });

    const envelope = JSON.parse(stdout);
    if (envelope.is_error) throw new Error(`claude -p reported an error: ${envelope.result}`);

    const parsed = JSON.parse(envelope.result);
    if (!Array.isArray(parsed)) throw new Error('extraction result was not a JSON array');

    return parsed.filter(isCandidate).filter((c) => !candidateLeaksSecret(c));
  } catch (err) {
    opts.onError?.(err instanceof Error ? err : new Error(String(err)));
    return [];
  }
}
