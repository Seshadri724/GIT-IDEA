// First-run consent for transcript auto-capture (ARCHITECTURE.md §12, PRD R7).
// Stored per-developer under the home directory, not inside the repo: consent
// is a personal choice about sending *your* session transcripts to a model,
// so it must not travel with `git clone` the way .decisions/ does.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function consentFile(): string {
  return path.join(os.homedir(), '.ideagit', 'consent.json');
}

async function readAll(): Promise<Record<string, boolean>> {
  try {
    return JSON.parse(await fs.readFile(consentFile(), 'utf8'));
  } catch {
    return {};
  }
}

async function writeAll(data: Record<string, boolean>): Promise<void> {
  const file = consentFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

export async function hasConsent(cwd: string): Promise<boolean> {
  const data = await readAll();
  return data[path.resolve(cwd)] === true;
}

export async function grantConsent(cwd: string): Promise<void> {
  const data = await readAll();
  data[path.resolve(cwd)] = true;
  await writeAll(data);
}

export async function revokeConsent(cwd: string): Promise<void> {
  const data = await readAll();
  delete data[path.resolve(cwd)];
  await writeAll(data);
}

export const DISCLOSURE = `IdeaGit can auto-capture candidate decisions from your coding sessions.

At the end of each session, the transcript is sent to a model (via headless
\`claude -p\`, using your existing Claude Code auth) to look for decisions worth
recording. This is off by default.

- Transcripts can contain secrets, customer data, or unreleased plans. A
  best-effort redaction pass runs first, but redaction is NOT guaranteed —
  it only catches known secret shapes (API keys, tokens, PEM blocks,
  connection-string credentials). Do not enable this on repositories with
  regulated data (health, financial, government) or anything you would not
  otherwise send to a hosted model.
- Nothing is written to .decisions/ automatically. Candidates are queued for
  your review (\`ideagit review\`); only what you accept becomes a record.
- This setting is per-repository and stored on this machine only
  (~/.ideagit/consent.json), not committed to the repo.
- See PRIVACY.md in this repository for what's collected, where it goes, and
  how to request deletion.`;
