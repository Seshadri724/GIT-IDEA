#!/usr/bin/env node
// SessionEnd hook: extracts candidate decisions from the finished session and
// queues them for review. Must never disrupt the session it's attached to —
// SessionEnd hooks can't block anyway (the session is already ending), and
// per ARCHITECTURE.md §12 this must fail open: log the problem, exit 0.
//
// Register in .claude/settings.json:
// {
//   "hooks": {
//     "SessionEnd": [{ "hooks": [{ "type": "command",
//       "command": "node /path/to/ideagit/hooks/session-end.js" }] }]
//   }
// }

import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { readTranscriptText } from '../dist/transcript.js';
import { runExtraction } from '../dist/extract.js';
import { writePending, pendingDir } from '../dist/pending.js';
import { hasConsent } from '../dist/consent.js';

const MIN_TRANSCRIPT_CHARS = 200; // below this, nothing worth extracting

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function logError(cwd, err) {
  try {
    const dir = pendingDir(cwd);
    await mkdir(dir, { recursive: true });
    await appendFile(
      path.join(dir, 'errors.log'),
      `${new Date().toISOString()} ${err.stack || err.message || err}\n`,
      'utf8',
    );
  } catch {
    // Even logging failed. There is nothing left to do that keeps this hook fail-open.
  }
}

async function main() {
  const input = JSON.parse(await readStdin());
  const cwd = input.cwd || process.cwd();

  // Auto-capture is opt-in (ARCHITECTURE.md §12, PRD R7): no transcript
  // leaves the machine until the developer runs `ideagit consent`.
  if (!(await hasConsent(cwd))) {
    process.stdout.write(
      JSON.stringify({
        systemMessage: 'ideagit: auto-capture is off — run `ideagit consent` to enable it.',
      }),
    );
    return;
  }

  const text = await readTranscriptText(input.transcript_path);
  if (text.length < MIN_TRANSCRIPT_CHARS) return;

  const candidates = await runExtraction(text, {
    onError: (err) => logError(cwd, err),
  });

  if (candidates.length === 0) return;

  for (const candidate of candidates) {
    await writePending(cwd, input.session_id, candidate);
  }

  process.stdout.write(
    JSON.stringify({
      systemMessage: `ideagit: ${candidates.length} candidate decision${candidates.length === 1 ? '' : 's'} ready — run \`ideagit review\`.`,
    }),
  );
}

main().catch(async (err) => {
  await logError(process.cwd(), err);
});
// No process.exit() call: exit 0 is the default for a script that returns
// normally, and main()'s own catch swallows everything so it always does.
