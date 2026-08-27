// IdeaGit MCP server: three tools over stdio, backed by .decisions/ in the
// target repository directory. See ARCHITECTURE.md §5 for the tool contracts.

import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { recordDecision, Decision } from './store.js';
import { searchDecisions } from './search.js';
import { checkProposal } from './proposal.js';

export function getTargetCwd(explicitPath?: string): string {
  return explicitPath || process.env.IDEAGIT_CWD || process.env.IDEAGIT_DIR || process.cwd();
}

const INSTRUCTIONS = `Before proposing a change to architecture, dependencies, data storage, API design, or
project structure, you MUST call check_proposal or search_decisions with the topic or technology you plan to introduce.
If a prior decision conflicts, show the decision, its date, reasoning, and scope, and raise
the conflict with the user before writing code or changing plans. Do not silently treat a search
miss as approval.

When a result is related but not contradictory, mention that it is related context. When a
result is stale or superseded, state that clearly rather than presenting it as a current constraint.

After a session where a real structural technical decision was made — a choice between
real alternatives that someone could plausibly propose again — call record_decision to persist it.
Skip routine bug fixes, trivial refactors, and anything where no viable alternative was considered.`;

function formatDecision(d: Decision): string {
  const lines = [`# ${d.title}`, ``, `id: ${d.id}  ·  status: ${d.status}  ·  date: ${d.date}`];
  if (d.scope.length) lines.push(`scope: ${d.scope.join(', ')}`);
  if (d.tags.length) lines.push(`tags: ${d.tags.join(', ')}`);
  if (d.superseded_by) lines.push(`superseded by: ${d.superseded_by}`);
  if (d.provenance) {
    const provParts: string[] = [];
    if (d.provenance.session_id) provParts.push(`session: ${d.provenance.session_id}`);
    if (d.provenance.commit) provParts.push(`commit: ${d.provenance.commit}`);
    if (d.provenance.source) provParts.push(`source: ${d.provenance.source}`);
    if (provParts.length) lines.push(`provenance: ${provParts.join('  ·  ')}`);
  }
  lines.push('', '## Chose', '', d.chose);
  if (d.rejected.length) {
    lines.push('', '## Rejected', '');
    for (const r of d.rejected) lines.push(`- **${r.name}** — ${r.reason}`);
  }
  lines.push('', '## Why', '', d.why);
  if (d.changes_mind) lines.push('', '## What would change our mind', '', d.changes_mind);
  return lines.join('\n');
}

serveStdio(() => {
  const server = new McpServer(
    { name: 'ideagit', version: '0.1.0' },
    { instructions: INSTRUCTIONS },
  );

  server.registerTool(
    'check_proposal',
    {
      description:
        'Check a proposed architectural, dependency, or structural change against recorded decisions. ' +
        'Returns whether the change CONFLICTS with a prior rejected alternative, is RELATED to an existing decision, or has NONE.',
      inputSchema: z.object({
        proposal: z.string().describe('The proposed architectural change, library, or design you plan to introduce.'),
        scope: z.string().optional().describe('Optional file path being modified.'),
        repo_path: z
          .string()
          .optional()
          .describe('Optional repository root directory. Defaults to current working directory or IDEAGIT_CWD.'),
      }),
    },
    async (input) => {
      const { repo_path, ...opts } = input;
      const cwd = getTargetCwd(repo_path);
      const result = await checkProposal(cwd, opts);
      return {
        content: [
          {
            type: 'text',
            text: `Verdict: ${result.verdict.toUpperCase()}\n\n${result.explanation}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'record_decision',
    {
      description:
        'Record a decision made during this session: what was chosen, what was rejected and why, ' +
        'and what would change the answer. Call this after a real structural decision is made — a choice ' +
        'between alternatives someone could plausibly propose again — not for routine implementation details.',
      inputSchema: z.object({
        title: z.string().describe('One line stating the choice, not the question. E.g. "Keep sessions in Postgres rather than adding Redis".'),
        chose: z.string().describe('What was decided, in enough detail that a stranger understands the outcome.'),
        why: z.string().describe('The actual deciding factor — not a restatement of the conclusion.'),
        rejected: z
          .array(z.object({ name: z.string(), reason: z.string() }))
          .optional()
          .describe('Alternatives that were considered and rejected, with why each was rejected.'),
        changes_mind: z
          .string()
          .optional()
          .describe('What would make this decision worth revisiting.'),
        scope: z
          .array(z.string())
          .optional()
          .describe('Glob patterns for the files this decision governs, e.g. ["src/session/**"].'),
        tags: z
          .array(z.string())
          .optional()
          .describe('Tags for categorizing and discovering decisions, e.g. ["database", "auth"].'),
        supersedes: z
          .array(z.string())
          .optional()
          .describe('IDs of prior decisions this one retires.'),
        provenance: z
          .object({
            session_id: z.string().optional(),
            commit: z.string().optional(),
            source: z.string().optional(),
          })
          .optional()
          .describe('Session ID, git commit, or source link for evidence.'),
        repo_path: z
          .string()
          .optional()
          .describe('Optional repository root directory. Defaults to current working directory or IDEAGIT_CWD.'),
      }),
    },
    async (input) => {
      const { repo_path, ...data } = input;
      const cwd = getTargetCwd(repo_path);
      const id = await recordDecision(cwd, data);
      return { content: [{ type: 'text', text: `Recorded decision ${id}` }] };
    },
  );

  server.registerTool(
    'search_decisions',
    {
      description:
        'Search recorded decisions before proposing a structural, architectural, or dependency change. ' +
        'Returns matching decisions with their full reasoning so you can check whether the change was already ' +
        'considered and rejected.',
      inputSchema: z.object({
        query: z.string().describe('What you are about to propose or want to check against — free text or keywords.'),
        status: z
          .enum(['active', 'superseded', 'abandoned', 'stale', 'any'])
          .optional()
          .describe('Defaults to "active" — only currently-in-effect decisions.'),
        scope: z
          .string()
          .optional()
          .describe('A file path — restrict to decisions whose scope glob matches it.'),
        repo_path: z
          .string()
          .optional()
          .describe('Optional repository root directory. Defaults to current working directory or IDEAGIT_CWD.'),
      }),
    },
    async (input) => {
      const { repo_path, ...opts } = input;
      const cwd = getTargetCwd(repo_path);
      const results = await searchDecisions(cwd, opts);

      if (results.length === 0) {
        return { content: [{ type: 'text', text: 'No matching decisions found.' }] };
      }

      const text =
        results.length <= 5
          ? results.map(formatDecision).join('\n\n---\n\n')
          : results.map((d) => `- ${d.id} — ${d.title}`).join('\n');

      return { content: [{ type: 'text', text }] };
    },
  );

  return server;
});
