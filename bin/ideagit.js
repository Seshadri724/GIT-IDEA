#!/usr/bin/env node
// `ideagit` — no args / `serve` starts the MCP server over stdio.
// `review` walks pending candidates queued by hooks/session-end.js.
// `doctor` / `graph` land in Phase 3-4 (see ROADMAP.md).
// `phase0` runs the real-session evaluation required before trusting
// auto-capture (ROADMAP.md Phase 0) — see src/phase0.ts.
// `init` prints a ready-to-paste MCP config with the absolute path filled in.

import { createInterface } from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { recordDecision } from '../dist/store.js';
import { listPending, removePending } from '../dist/pending.js';
import { hasConsent, grantConsent, revokeConsent, DISCLOSURE } from '../dist/consent.js';
import { runDoctor } from '../dist/doctor.js';
import { generateGraph } from '../dist/graph.js';
import { loadSessions, runSessions, evaluateGate, formatSessionForReview } from '../dist/phase0.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const cmd = process.argv[2] ?? 'serve';

function formatCandidate(c) {
  const lines = [`# ${c.title}`, '', '## Chose', '', c.chose];
  if (c.rejected?.length) {
    lines.push('', '## Rejected', '');
    for (const r of c.rejected) lines.push(`- **${r.name}** — ${r.reason}`);
  }
  lines.push('', '## Why', '', c.why);
  if (c.changes_mind) lines.push('', '## What would change our mind', '', c.changes_mind);
  if (c.scope?.length) lines.push('', `scope: ${c.scope.join(', ')}`);
  return lines.join('\n');
}

async function editCandidate(candidate) {
  const editor = process.env.EDITOR || process.env.VISUAL || (process.platform === 'win32' ? 'notepad' : 'vi');
  const tmpFile = path.join(os.tmpdir(), `ideagit-edit-${randomUUID()}.json`);
  const { pendingId, sessionId, extractedAt, ...editable } = candidate;
  await writeFile(tmpFile, JSON.stringify(editable, null, 2), 'utf8');
  spawnSync(editor, [tmpFile], { stdio: 'inherit' });
  try {
    const updated = JSON.parse(await readFile(tmpFile, 'utf8'));
    return { ...candidate, ...updated };
  } catch (err) {
    console.error(`Couldn't parse edited JSON, keeping original: ${err.message}`);
    return candidate;
  } finally {
    await unlink(tmpFile).catch(() => {});
  }
}

async function review() {
  const cwd = process.cwd();
  let candidates = await listPending(cwd);

  if (candidates.length === 0) {
    console.log('No pending candidates.');
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  for (let candidate of candidates) {
    for (;;) {
      console.log('\n' + '─'.repeat(60));
      console.log(formatCandidate(candidate));
      console.log('─'.repeat(60));

      // Piped/non-TTY stdin can hit EOF between candidates (readline then
      // auto-closes); treat that the same as the user answering 'q'.
      if (rl.closed) {
        console.log('Input closed — stopping review.');
        return;
      }
      let answer;
      try {
        answer = (await rl.question('[a]ccept / [s]kip / [e]dit / [q]uit review > ')).trim().toLowerCase();
      } catch (err) {
        if (err.code === 'ERR_USE_AFTER_CLOSE') {
          console.log('Input closed — stopping review.');
          return;
        }
        throw err;
      }

      if (answer === 'a') {
        const { pendingId, sessionId, extractedAt, ...input } = candidate;
        const id = await recordDecision(cwd, input);
        await removePending(cwd, candidate.pendingId);
        console.log(`Recorded ${id}`);
        break;
      }
      if (answer === 's') {
        await removePending(cwd, candidate.pendingId);
        console.log('Skipped.');
        break;
      }
      if (answer === 'e') {
        candidate = await editCandidate(candidate);
        continue; // re-show the edited candidate before deciding
      }
      if (answer === 'q') {
        rl.close();
        return;
      }
      console.log('Unrecognized answer — a / s / e / q.');
    }
  }

  rl.close();
}

async function consent() {
  const cwd = process.cwd();
  const sub = process.argv[3];

  if (sub === 'revoke') {
    await revokeConsent(cwd);
    console.log('Auto-capture consent revoked for this repository.');
    return;
  }

  if (sub === 'status') {
    console.log(`Auto-capture is ${(await hasConsent(cwd)) ? 'ON' : 'OFF'} for ${cwd}`);
    return;
  }

  if (await hasConsent(cwd)) {
    console.log(`Auto-capture is already ON for ${cwd}.\nRun \`ideagit consent revoke\` to turn it off.`);
    return;
  }

  console.log(DISCLOSURE);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question('\nEnable auto-capture for this repository? [y/N] > ')).trim().toLowerCase();
  rl.close();

  if (answer === 'y' || answer === 'yes') {
    await grantConsent(cwd);
    console.log('Enabled. Candidates will be queued for `ideagit review` after each session.');
  } else {
    console.log('Not enabled.');
  }
}

async function doctor() {
  const cwd = process.cwd();
  const report = await runDoctor(cwd);
  console.log(`Examined ${report.totalDecisions} decision(s).`);

  if (report.issues.length === 0) {
    console.log('✓ All decision records are healthy.');
    return;
  }

  console.log(`\nFound ${report.issues.length} issue(s):\n`);
  let hasError = false;
  for (const issue of report.issues) {
    const icon = issue.severity === 'error' ? '✖' : '⚠';
    if (issue.severity === 'error') hasError = true;
    console.log(`  ${icon} [${issue.decisionId}] ${issue.message}`);
  }

  if (hasError) {
    process.exitCode = 1;
  }
}

async function graph() {
  const cwd = process.cwd();
  const targetPath = await generateGraph(cwd);
  console.log(`Generated Mermaid decision graph at ${targetPath}`);
}

async function phase0() {
  const dir = path.resolve(process.argv[3] ?? '.ideagit-phase0/sessions');
  let sessions;
  try {
    sessions = await loadSessions(dir);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
    return;
  }

  console.log(`Loaded ${sessions.length} real session(s) from ${dir}. Running extraction — this calls \`claude -p\` for real, so it takes a while.\n`);
  const results = await runSessions(sessions);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let expectedTotal = 0;
  let matchedTotal = 0;
  let fabricatedOnNoDecisionSessions = 0;

  for (const result of results) {
    console.log('\n' + '─'.repeat(60));
    console.log(formatSessionForReview(result));
    console.log('─'.repeat(60));

    expectedTotal += result.expectedDecisions.length;

    if (result.expectedDecisions.length === 0) {
      fabricatedOnNoDecisionSessions += result.predicted.length;
      if (result.predicted.length > 0) {
        console.log(`⚠ ${result.predicted.length} decision(s) fabricated on a no-decision session.`);
      }
      continue;
    }

    const answer = await rl.question(
      `How many predicted decisions above correctly match an expected one (title, chose, AND why)? [0-${result.expectedDecisions.length}] > `,
    );
    const n = Math.max(0, Math.min(parseInt(answer, 10) || 0, result.expectedDecisions.length));
    matchedTotal += n;
  }
  rl.close();

  const verdict = evaluateGate({ expectedTotal, matchedTotal, fabricatedOnNoDecisionSessions });
  console.log(`\nRecall: ${(verdict.recall * 100).toFixed(0)}% (${matchedTotal}/${expectedTotal})`);
  console.log(`Fabricated on no-decision sessions: ${fabricatedOnNoDecisionSessions}`);
  console.log(verdict.passes ? `✓ Phase 0 gate met.` : `✖ Phase 0 gate NOT met — ${verdict.reason}`);
  if (!verdict.passes) {
    console.log('Per ROADMAP.md: keep explicit record_decision as the supported workflow and do not enable auto-capture by default.');
    process.exitCode = 1;
  }
}

function init() {
  const serverPath = path.resolve(__dirname, '..', 'dist', 'server.js');
  const config = { mcpServers: { ideagit: { command: 'node', args: [serverPath] } } };
  console.log('Paste this into your agent\'s MCP config (e.g. .claude/mcp.json, ~/.cursor/mcp.json):\n');
  console.log(JSON.stringify(config, null, 2));
  console.log('\nThen run `ideagit consent` if you want opt-in auto-capture, or just ask your agent to `record_decision`.');
}

if (cmd === 'review') {
  await review();
} else if (cmd === 'consent') {
  await consent();
} else if (cmd === 'doctor') {
  await doctor();
} else if (cmd === 'graph') {
  await graph();
} else if (cmd === 'phase0') {
  await phase0();
} else if (cmd === 'init') {
  init();
} else if (cmd === 'serve' || !cmd) {
  await import('../dist/server.js');
} else {
  console.error(`Unknown command: ${cmd}\nUsage: ideagit [serve|init|review|consent [status|revoke]|doctor|graph|phase0 [dir]]`);
  process.exitCode = 1;
}
