import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { withTempRepo } from './helpers.js';
import { recordDecision } from '../dist/store.js';
import { generateGraph } from '../dist/graph.js';

test('generateGraph creates GRAPH.md with mermaid flowchart', async () => {
  await withTempRepo(async (dir) => {
    const id1 = await recordDecision(dir, {
      title: 'Monolith first',
      chose: 'Single binary',
      why: 'Simpler deployment',
    });

    await recordDecision(dir, {
      title: 'Microservices split',
      chose: 'Separate services',
      why: 'Team scalability',
      supersedes: [id1],
    });

    const graphPath = await generateGraph(dir);
    const content = await fs.readFile(graphPath, 'utf8');

    assert.match(content, /```mermaid/);
    assert.match(content, /flowchart LR/);
    assert.match(content, /Monolith first/);
    assert.match(content, /Microservices split/);
    assert.match(content, /-->\|supersedes\|/);
  });
});
