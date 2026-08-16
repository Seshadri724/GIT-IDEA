// IdeaGit MCP server: two tools over stdio, backed by .decisions/ in the
// current working directory. See ARCHITECTURE.md §5 for the tool contracts.

import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { recordDecision, Decision } from './store.js';
import { searchDecisions } from './search.js';

const cwd = process.cwd();

const INSTRUCTIONS = `Before proposing a change to architecture, dependencies, data storage, or
project structure, call search_decisions with a description of the change.
If a prior decision conflicts, show the decision, its date and scope, and raise
the conflict with the user before proceeding. Do not silently treat a search
miss as approval.

When a result is related but not contradictory, say that it is related. When a
result is stale or superseded, say so clearly rather than presenting it as a
current constraint.

After a session where a real structural decision was made — a choice between
real alternatives that someone could plausibly propose again — call
record_decision to save it. Skip routine implementation details and anything
with no alternative that was actually considered.`;

function formatDecision(d: Decision): string {
  const lines = [`# ${d.title}`, ``, `id: ${d.id}  ·  status: ${d.status}  ·  date: ${d.date}`];
  if (d.scope.length) lines.push(`scope: ${d.scope.join(', ')}`);
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
      }),
    },
    async (input) => {
      const id = await recordDecision(cwd, input);
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
        query: z.string().describe('What you are about to propose or want to check against — free text.'),
        status: z
          .enum(['active', 'superseded', 'abandoned', 'stale', 'any'])
          .optional()
          .describe('Defaults to "active" — only currently-in-effect decisions.'),
        scope: z
          .string()
          .optional()
          .describe('A file path — restrict to decisions whose scope glob matches it.'),
      }),
    },
    async (input) => {
      const results = await searchDecisions(cwd, input);

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
