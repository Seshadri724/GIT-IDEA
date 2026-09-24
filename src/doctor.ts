// Diagnostics and lifecycle checks for .decisions/*.md records.
// Validates file integrity, references, scopes, and real semantic contradictions.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { listDecisions, Decision } from './store.js';

export interface DoctorIssue {
  severity: 'error' | 'warning' | 'info';
  decisionId: string;
  message: string;
}

export interface DoctorReport {
  totalDecisions: number;
  issues: DoctorIssue[];
}

function globToRegExp(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, ' ')
    .replace(/\*/g, '[^/]*')
    .replace(/ /g, '.*');
  return new RegExp(`^${escaped}$`);
}

async function getRepoFiles(dir: string, baseDir: string = dir): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];

  for (const entry of entries) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === 'dist'
    ) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await getRepoFiles(fullPath, baseDir);
      files.push(...sub);
    } else if (entry.isFile()) {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      files.push(relPath);
    }
  }

  return files;
}

function getTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_-]+/)
    .filter((w) => w.length >= 3);
}

function hasWholeTokenOverlap(targetTokens: string[], candidateTokens: string[]): boolean {
  if (candidateTokens.length === 0) return false;
  // All tokens in candidate (e.g. "redis cluster") must appear as whole tokens in target
  return candidateTokens.every((c) => targetTokens.includes(c));
}

/**
 * Checks if decision B contradicts decision A.
 * A contradiction occurs when Decision A explicitly rejected what Decision B chose (or vice versa).
 */
function isContradiction(a: Decision, b: Decision): string | null {
  const bChoseTokens = getTokens(b.chose);
  const bTitleTokens = getTokens(b.title);
  const aChoseTokens = getTokens(a.chose);
  const aTitleTokens = getTokens(a.title);

  // Check if A's rejected list contains B's chosen option
  for (const r of a.rejected) {
    const rTokens = getTokens(r.name);
    if (
      rTokens.length > 0 &&
      (hasWholeTokenOverlap(bChoseTokens, rTokens) || hasWholeTokenOverlap(bTitleTokens, rTokens))
    ) {
      return `Active decision '${a.id}' explicitly rejected '${r.name}', but active decision '${b.id}' chose it without a supersedes link.`;
    }
  }

  // Check if B's rejected list contains A's chosen option
  for (const r of b.rejected) {
    const rTokens = getTokens(r.name);
    if (
      rTokens.length > 0 &&
      (hasWholeTokenOverlap(aChoseTokens, rTokens) || hasWholeTokenOverlap(aTitleTokens, rTokens))
    ) {
      return `Active decision '${b.id}' explicitly rejected '${r.name}', but active decision '${a.id}' chose it without a supersedes link.`;
    }
  }

  return null;
}

export async function runDoctor(cwd: string): Promise<DoctorReport> {
  const issues: DoctorIssue[] = [];
  const decisions = await listDecisions(cwd, (id, err) => {
    issues.push({ severity: 'error', decisionId: id, message: `Unparseable record: ${err.message.split('\n')[0]}` });
  });
  const repoFiles = await getRepoFiles(cwd);
  const decisionIds = new Set(decisions.map((d) => d.id));

  for (const d of decisions) {
    // 1. Structure validation (hard errors)
    if (!d.title.trim()) {
      issues.push({ severity: 'error', decisionId: d.id, message: 'Missing title' });
    }
    if (!d.chose.trim()) {
      issues.push({ severity: 'error', decisionId: d.id, message: 'Missing ## Chose section' });
    }
    if (!d.why.trim()) {
      issues.push({ severity: 'error', decisionId: d.id, message: 'Missing ## Why section' });
    }

    const validStatuses = ['active', 'superseded', 'abandoned', 'stale'];
    if (!validStatuses.includes(d.status)) {
      issues.push({ severity: 'error', decisionId: d.id, message: `Invalid status '${d.status}'` });
    }

    // 2. Dangling reference checks (hard errors)
    for (const oldId of d.supersedes) {
      if (!decisionIds.has(oldId)) {
        issues.push({
          severity: 'error',
          decisionId: d.id,
          message: `Dangling supersedes reference: '${oldId}' does not exist`,
        });
      }
    }

    if (d.superseded_by && !decisionIds.has(d.superseded_by)) {
      issues.push({
        severity: 'error',
        decisionId: d.id,
        message: `Dangling superseded_by reference: '${d.superseded_by}' does not exist`,
      });
    }

    if (d.status === 'superseded' && !d.superseded_by) {
      issues.push({
        severity: 'warning',
        decisionId: d.id,
        message: "Status is 'superseded' but 'superseded_by' field is null",
      });
    }

    if (d.status === 'stale') {
      issues.push({
        severity: 'info',
        decisionId: d.id,
        message: 'Decision is explicitly marked stale and should be reviewed or superseded.',
      });
    }

    // 3. Scope checks (warnings)
    if (d.scope.length > 0) {
      for (const pattern of d.scope) {
        const regex = globToRegExp(pattern);
        const matchedFiles = repoFiles.filter((f) => regex.test(f));

        if (matchedFiles.length === 0) {
          issues.push({
            severity: 'warning',
            decisionId: d.id,
            message: `Scope pattern '${pattern}' matches no files in repository`,
          });
        }
      }
    }
  }

  // 4. Contradiction checks among active decisions (warnings, not CI hard errors)
  const activeDecisions = decisions.filter((d) => d.status === 'active');
  for (let i = 0; i < activeDecisions.length; i++) {
    for (let j = i + 1; j < activeDecisions.length; j++) {
      const a = activeDecisions[i];
      const b = activeDecisions[j];

      // Skip if one supersedes the other
      if (a.supersedes.includes(b.id) || b.supersedes.includes(a.id)) continue;
      if (a.superseded_by === b.id || b.superseded_by === a.id) continue;

      const contradictionMessage = isContradiction(a, b);
      if (contradictionMessage) {
        issues.push({
          severity: 'warning',
          decisionId: a.id,
          message: `Contradiction suspected: ${contradictionMessage}`,
        });
      }
    }
  }

  return {
    totalDecisions: decisions.length,
    issues,
  };
}
