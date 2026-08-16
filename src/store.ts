// Reads, writes, and parses .decisions/*.md — the only module that touches
// the filesystem. See ARCHITECTURE.md §3 for the file format this implements.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export type DecisionStatus = 'active' | 'superseded' | 'abandoned' | 'stale';

export interface RejectedAlternative {
  name: string;
  reason: string;
}

export interface DecisionProvenance {
  session_id?: string;
  commit?: string;
  source?: string;
}

export interface Decision {
  id: string;
  title: string;
  status: DecisionStatus;
  date: string;
  scope: string[];
  tags: string[];
  supersedes: string[];
  superseded_by: string | null;
  provenance?: DecisionProvenance;
  chose: string;
  rejected: RejectedAlternative[];
  why: string;
  changes_mind: string;
}

export interface RecordDecisionInput {
  title: string;
  chose: string;
  why: string;
  rejected?: RejectedAlternative[];
  changes_mind?: string;
  scope?: string[];
  supersedes?: string[];
  provenance?: DecisionProvenance;
}

const HEADINGS = ['Chose', 'Rejected', 'Why', 'What would change our mind'] as const;

export function decisionsDir(cwd: string): string {
  return path.join(cwd, '.decisions');
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'decision';
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function serializeBody(input: {
  chose: string;
  rejected: RejectedAlternative[];
  why: string;
  changes_mind: string;
}): string {
  const parts = [`## Chose\n\n${input.chose.trim()}\n`];

  if (input.rejected.length > 0) {
    const bullets = input.rejected
      .map((r) => `- **${r.name.trim()}** — ${r.reason.trim()}`)
      .join('\n');
    parts.push(`## Rejected\n\n${bullets}\n`);
  }

  parts.push(`## Why\n\n${input.why.trim()}\n`);

  if (input.changes_mind.trim()) {
    parts.push(`## What would change our mind\n\n${input.changes_mind.trim()}\n`);
  }

  return parts.join('\n');
}

function parseBody(body: string): {
  chose: string;
  rejected: RejectedAlternative[];
  why: string;
  changes_mind: string;
} {
  const sections: Record<string, string> = {};
  const re = /^##\s+(.+?)\s*$/gm;
  const matches = [...body.matchAll(re)];

  for (let i = 0; i < matches.length; i++) {
    const heading = matches[i][1].trim();
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : body.length;
    sections[heading] = body.slice(start, end).trim();
  }

  const rejectedRaw = sections['Rejected'] ?? '';
  const rejected: RejectedAlternative[] = rejectedRaw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('-'))
    .map((line) => {
      const stripped = line.replace(/^-+\s*/, '');
      const m = stripped.match(/^\*\*(.+?)\*\*\s*[—-]\s*(.*)$/);
      return m ? { name: m[1].trim(), reason: m[2].trim() } : { name: stripped, reason: '' };
    });

  return {
    chose: sections['Chose'] ?? '',
    rejected,
    why: sections['Why'] ?? '',
    changes_mind: sections['What would change our mind'] ?? '',
  };
}

function toDecision(id: string, raw: string): Decision {
  const { data, content } = matter(raw);
  const body = parseBody(content);
  return {
    id: data.id ?? id,
    title: data.title ?? '',
    status: (data.status ?? 'active') as DecisionStatus,
    date: data.date ? String(data.date).slice(0, 10) : today(),
    scope: Array.isArray(data.scope) ? data.scope : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    supersedes: Array.isArray(data.supersedes) ? data.supersedes : [],
    superseded_by: data.superseded_by ?? null,
    provenance: data.provenance && typeof data.provenance === 'object' ? data.provenance : undefined,
    ...body,
  };
}

function toFileContents(d: Decision): string {
  const frontmatter: Record<string, unknown> = {
    id: d.id,
    title: d.title,
    status: d.status,
    date: d.date,
    scope: d.scope,
    tags: d.tags,
    supersedes: d.supersedes,
    superseded_by: d.superseded_by,
  };
  if (d.provenance) {
    frontmatter.provenance = d.provenance;
  }
  return matter.stringify(serializeBody(d), frontmatter);
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function filePath(cwd: string, id: string): Promise<string> {
  return path.join(decisionsDir(cwd), `${id}.md`);
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function uniqueId(cwd: string, base: string): Promise<string> {
  let id = base;
  let n = 2;
  while (await exists(await filePath(cwd, id))) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

export async function recordDecision(cwd: string, input: RecordDecisionInput): Promise<string> {
  const dir = decisionsDir(cwd);
  await ensureDir(dir);

  const date = today();
  const baseId = `${date}-${slugify(input.title)}`;
  const id = await uniqueId(cwd, baseId);

  const decision: Decision = {
    id,
    title: input.title,
    status: 'active',
    date,
    scope: input.scope ?? [],
    tags: [],
    supersedes: input.supersedes ?? [],
    superseded_by: null,
    provenance: input.provenance,
    chose: input.chose,
    rejected: input.rejected ?? [],
    why: input.why,
    changes_mind: input.changes_mind ?? '',
  };

  await fs.writeFile(await filePath(cwd, id), toFileContents(decision), 'utf8');

  for (const oldId of decision.supersedes) {
    const old = await getDecision(cwd, oldId);
    if (!old) continue;
    old.status = 'superseded';
    old.superseded_by = id;
    await fs.writeFile(await filePath(cwd, oldId), toFileContents(old), 'utf8');
  }

  return id;
}

export async function getDecision(cwd: string, id: string): Promise<Decision | null> {
  const p = await filePath(cwd, id);
  if (!(await exists(p))) return null;
  const raw = await fs.readFile(p, 'utf8');
  return toDecision(id, raw);
}

export async function listDecisions(cwd: string): Promise<Decision[]> {
  const dir = decisionsDir(cwd);
  if (!(await exists(dir))) return [];

  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md') && f !== 'GRAPH.md');
  const decisions = await Promise.all(
    files.map(async (f) => {
      const id = f.slice(0, -3);
      const raw = await fs.readFile(path.join(dir, f), 'utf8');
      return toDecision(id, raw);
    }),
  );

  return decisions.sort((a, b) => b.date.localeCompare(a.date));
}

// Exported for tests that need to assert on the fixed heading set.
export const DECISION_HEADINGS = HEADINGS;
