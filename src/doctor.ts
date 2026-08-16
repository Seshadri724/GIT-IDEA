// Diagnostics and lifecycle checks for .decisions/*.md records.
// Implements ROADMAP.md Phase 4 & PRD.md R9, R11 & ARCHITECTURE.md §8.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { listDecisions, Decision } from './store.js';

const execFileAsync = promisify(execFile);

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
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === '.decisions') {
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

async function getFileLastModifiedTime(cwd: string, relFile: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync('git', ['log', '-1', '--format=%ct', '--', relFile], { cwd });
    const seconds = parseInt(stdout.trim(), 10);
    if (!isNaN(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  } catch {
    // Git command failed or not a git repository; fall back to fs stat
  }

  const fullPath = path.join(cwd, relFile);
  const stat = await fs.stat(fullPath).catch(() => null);
  return stat ? stat.mtimeMs : null;
}

export async function runDoctor(cwd: string): Promise<DoctorReport> {
  const decisions = await listDecisions(cwd);
  const issues: DoctorIssue[] = [];
  const repoFiles = await getRepoFiles(cwd);
  const decisionIds = new Set(decisions.map((d) => d.id));

  for (const d of decisions) {
    // 1. Structure validation
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

    // 2. Dangling reference checks
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

    // 3. Scope & Git staleness checks
    if (d.scope.length > 0) {
      const decisionTime = new Date(d.date).getTime();

      for (const pattern of d.scope) {
        const regex = globToRegExp(pattern);
        const matchedFiles = repoFiles.filter((f) => regex.test(f));

        if (matchedFiles.length === 0) {
          issues.push({
            severity: 'warning',
            decisionId: d.id,
            message: `Scope pattern '${pattern}' matches no files in repository`,
          });
        } else {
          for (const relFile of matchedFiles) {
            const lastModTime = await getFileLastModifiedTime(cwd, relFile);
            if (lastModTime && lastModTime > decisionTime + 86400000) {
              // modified >24h after decision date
              issues.push({
                severity: 'warning',
                decisionId: d.id,
                message: `Governed file '${relFile}' modified after decision date (${d.date}); record may be stale`,
              });
            }
          }
        }
      }
    }
  }

  // 4. Contradiction checks among active decisions
  const activeDecisions = decisions.filter((d) => d.status === 'active');
  for (let i = 0; i < activeDecisions.length; i++) {
    for (let j = i + 1; j < activeDecisions.length; j++) {
      const a = activeDecisions[i];
      const b = activeDecisions[j];

      // Skip if one supersedes the other
      if (a.supersedes.includes(b.id) || b.supersedes.includes(a.id)) continue;
      if (a.superseded_by === b.id || b.superseded_by === a.id) continue;

      // Check for overlapping scope patterns
      const overlappingScopes = a.scope.filter((sA) => b.scope.includes(sA));
      if (overlappingScopes.length > 0) {
        issues.push({
          severity: 'error',
          decisionId: a.id,
          message: `Contradiction detected: active decision '${a.id}' conflicts with '${b.id}' over overlapping scope [${overlappingScopes.join(', ')}]. Neither supersedes the other.`,
        });
      }
    }
  }

  return {
    totalDecisions: decisions.length,
    issues,
  };
}
