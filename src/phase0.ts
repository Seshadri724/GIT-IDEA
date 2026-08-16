// Real-session Phase 0 evaluation harness (ROADMAP.md Phase 0). The unit
// tests in test/phase0.test.js only check that fixtures are well-formed and
// that extraction fails open — they never score real model output against
// ground truth, and the fixtures are synthetic. This module is the missing
// piece: point it at a directory of hand-labeled REAL sessions and it runs
// live extraction, then walks a human through scoring recall and fabrication
// against the roadmap's gate (>=70% recall, zero fabrications on no-decision
// sessions).
//
// Session files are never committed — see .gitignore for .ideagit-phase0/.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { runExtraction, RunExtractionOptions } from './extract.js';
import { RecordDecisionInput } from './store.js';

export interface Phase0Session {
  name: string;
  transcript: string;
  expectedDecisions: { title: string; chose: string; why: string }[];
}

export interface Phase0SessionResult {
  name: string;
  expectedDecisions: Phase0Session['expectedDecisions'];
  predicted: RecordDecisionInput[];
}

export async function loadSessions(dir: string): Promise<Phase0Session[]> {
  const files = (await fs.readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    throw new Error(
      `No session files in ${dir}. Add real, anonymized, hand-labeled sessions as JSON files: ` +
        `{ "name": string, "transcript": string, "expectedDecisions": [{ "title", "chose", "why" }] }. ` +
        `Write expectedDecisions before you run this, not after.`,
    );
  }
  return Promise.all(files.map(async (f) => JSON.parse(await fs.readFile(path.join(dir, f), 'utf8')) as Phase0Session));
}

export async function runSessions(
  sessions: Phase0Session[],
  opts: RunExtractionOptions = {},
): Promise<Phase0SessionResult[]> {
  const results: Phase0SessionResult[] = [];
  for (const s of sessions) {
    const predicted = await runExtraction(s.transcript, opts);
    results.push({ name: s.name, expectedDecisions: s.expectedDecisions, predicted });
  }
  return results;
}

export function formatSessionForReview(result: Phase0SessionResult): string {
  const lines = [`### ${result.name}`, '', `Expected (${result.expectedDecisions.length}):`];
  result.expectedDecisions.forEach((d, i) => lines.push(`  ${i + 1}. ${d.title} — ${d.why}`));
  lines.push('', `Predicted (${result.predicted.length}):`);
  result.predicted.forEach((d, i) => lines.push(`  ${i + 1}. ${d.title} — ${d.why}`));
  return lines.join('\n');
}

export interface Phase0Tally {
  expectedTotal: number;
  matchedTotal: number;
  fabricatedOnNoDecisionSessions: number;
}

export interface Phase0Verdict {
  recall: number;
  passes: boolean;
  reason: string;
}

/** ROADMAP.md Phase 0 gate: >=70% agreement, zero fabricated decisions on no-decision sessions. */
export function evaluateGate(tally: Phase0Tally): Phase0Verdict {
  const recall = tally.expectedTotal === 0 ? 1 : tally.matchedTotal / tally.expectedTotal;
  const zeroFabrication = tally.fabricatedOnNoDecisionSessions === 0;

  if (!zeroFabrication) {
    return {
      recall,
      passes: false,
      reason: `${tally.fabricatedOnNoDecisionSessions} fabricated decision(s) on no-decision session(s) — gate requires zero`,
    };
  }
  if (recall < 0.7) {
    return { recall, passes: false, reason: `recall ${(recall * 100).toFixed(0)}% is below the 70% gate` };
  }
  return { recall, passes: true, reason: 'gate met' };
}
