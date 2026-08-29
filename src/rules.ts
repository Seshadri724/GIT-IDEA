// Compile active decisions into rules for Cursor (.cursorrules / .cursor/rules/)
// or Claude Code (CLAUDE.md / instructions).
// Exports a formatted Markdown snippet for developers to include in their system prompt.

import { listDecisions } from './store.js';

export async function compileRules(cwd: string): Promise<string> {
  const all = await listDecisions(cwd);
  const active = all.filter((d) => d.status === 'active');

  if (active.length === 0) {
    return `# Architecture Constraints & Decision Memory (IdeaGit Rules)\n\nNo active decisions recorded in \`.decisions/\`.\n`;
  }

  const lines: string[] = [
    '# Architecture Constraints & Decision Memory (IdeaGit Rules)',
    '',
    'Always adhere to these active technical decisions before writing code or proposing changes:',
    '',
  ];

  for (const d of active) {
    const scopeStr = d.scope.length > 0 ? ` (Scope: \`${d.scope.join('`, `')}\`)` : '';
    lines.push(`### ${d.title}${scopeStr}`);
    lines.push(`- **Chose**: ${d.chose}`);
    if (d.rejected.length > 0) {
      const rejectedList = d.rejected.map((r) => `${r.name} (${r.reason})`).join('; ');
      lines.push(`- **Rejected**: ${rejectedList}`);
    }
    lines.push(`- **Why**: ${d.why}`);
    if (d.changes_mind) {
      lines.push(`- **Revisit if**: ${d.changes_mind}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
