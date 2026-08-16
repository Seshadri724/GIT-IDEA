// Candidate decisions extracted from a session, awaiting human confirmation
// (ROADMAP.md Phase 2, step 2). Stored as loose JSON files rather than
// .decisions/*.md because they aren't real decisions yet — R5 requires
// one-keystroke confirmation before anything joins the log.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { decisionsDir, RecordDecisionInput } from './store.js';

export interface PendingCandidate extends RecordDecisionInput {
  pendingId: string;
  sessionId: string;
  extractedAt: string;
}

export function pendingDir(cwd: string): string {
  return path.join(decisionsDir(cwd), '.pending');
}

export async function writePending(
  cwd: string,
  sessionId: string,
  candidate: RecordDecisionInput,
): Promise<string> {
  const dir = pendingDir(cwd);
  await fs.mkdir(dir, { recursive: true });
  const pendingId = randomUUID();
  const record: PendingCandidate = {
    ...candidate,
    pendingId,
    sessionId,
    extractedAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(dir, `${pendingId}.json`), JSON.stringify(record, null, 2), 'utf8');
  return pendingId;
}

export async function listPending(cwd: string): Promise<PendingCandidate[]> {
  const dir = pendingDir(cwd);
  try {
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'));
    const records = await Promise.all(
      files.map(async (f) => JSON.parse(await fs.readFile(path.join(dir, f), 'utf8')) as PendingCandidate),
    );
    return records.sort((a, b) => a.extractedAt.localeCompare(b.extractedAt));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

export async function removePending(cwd: string, pendingId: string): Promise<void> {
  await fs.rm(path.join(pendingDir(cwd), `${pendingId}.json`), { force: true });
}
