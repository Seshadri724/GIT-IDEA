// Mermaid graph generator for .decisions/*.md records.
// Implements ARCHITECTURE.md §9 & ROADMAP.md Phase 5.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { listDecisions, decisionsDir, Decision } from './store.js';

function sanitizeNodeId(id: string): string {
  return 'node_' + id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function escapeLabel(text: string): string {
  return text.replace(/"/g, "'").replace(/\n/g, ' ');
}

export async function generateGraph(cwd: string): Promise<string> {
  const dir = decisionsDir(cwd);
  await fs.mkdir(dir, { recursive: true });

  const decisions = await listDecisions(cwd);
  const targetPath = path.join(dir, 'GRAPH.md');

  if (decisions.length === 0) {
    const emptyContent = `# Decision Graph\n\nNo recorded decisions found in \`.decisions/\`.\n`;
    await fs.writeFile(targetPath, emptyContent, 'utf8');
    return targetPath;
  }

  const lines: string[] = [
    '# Decision Graph',
    '',
    '```mermaid',
    'flowchart LR',
  ];

  const nodeMap = new Map<string, string>();
  for (const d of decisions) {
    nodeMap.set(d.id, sanitizeNodeId(d.id));
  }

  // Node definitions
  for (const d of decisions) {
    const nodeVar = nodeMap.get(d.id)!;
    const statusSuffix = d.status !== 'active' ? ` (${d.status})` : '';
    const label = `${d.date}<br/>${escapeLabel(d.title)}${statusSuffix}`;
    lines.push(`    ${nodeVar}["${label}"]`);
  }

  lines.push('');

  // Edges for supersedes relationships
  const addedEdges = new Set<string>();
  for (const d of decisions) {
    const currentVar = nodeMap.get(d.id)!;
    for (const oldId of d.supersedes) {
      const oldVar = nodeMap.get(oldId);
      if (oldVar) {
        const edgeKey = `${oldVar}->${currentVar}`;
        if (!addedEdges.has(edgeKey)) {
          lines.push(`    ${oldVar} -->|supersedes| ${currentVar}`);
          addedEdges.add(edgeKey);
        }
      }
    }
  }

  lines.push('```', '');

  const content = lines.join('\n');
  await fs.writeFile(targetPath, content, 'utf8');
  return targetPath;
}
