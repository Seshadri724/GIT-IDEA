# IdeaGit

**A contradiction detector and decision memory for coding agents.**

IdeaGit stores important technical decisions as Markdown inside your repository
and tells an MCP-capable coding agent to check them before proposing structural
changes.

The product is not an ADR generator. The useful event is this:

```text
Agent: You are proposing Redis, but this repository rejected Redis for session
       storage because of operational cost. Has that constraint changed?
```

## Why it exists

Coding agents remember the current code better than they remember why the code
became that way. IdeaGit preserves the reasoning behind choices so an agent can
avoid repeating rejected proposals.

It is local-first, Git-backed, readable without the tool, and vendor-neutral on
disk.

## Current status

The Phase 1 implementation is present:

- MCP server over stdio
- `record_decision` and `search_decisions`
- Markdown files with YAML frontmatter under `.decisions/`
- Status, scope, search, and supersede support
- Server instructions that tell the agent to search before structural changes

Experimental capture plumbing is also present:

- Session transcript parsing
- `claude -p` extraction wrapper
- Fail-open extraction behavior
- Pending candidate queue
- `ideagit review` for accept, skip, edit, and quit

The important limitation is that extraction quality has not yet been proven on
five hand-labeled real sessions. Treat auto-capture as experimental until the
The complete usage guide, sample outputs, and workflow specifications are documented in the [User Manual](USER_MANUAL.md).

## Quick start

```bash
npm install
npm run build
npm test
```

Point an MCP-capable agent at the server, with the working directory set to the
repository whose decisions it should read:

```json
{
  "mcpServers": {
    "ideagit": {
      "command": "node",
      "args": ["/absolute/path/to/ideagit/dist/server.js"]
    }
  }
}
```

The first workflow to validate is explicit recording:

1. Make a real technical choice between alternatives.
2. Ask the agent to call `record_decision`.
3. Later, make a related proposal and observe whether it calls
   `search_decisions` before acting.
4. Record whether the result actually changes the proposal.

## Experimental auto-capture

The SessionEnd hook can send a transcript to headless `claude -p`, queue draft
candidates under `.decisions/.pending/`, and leave them for review. It sends
nothing until you opt in, per repository:

```bash
ideagit consent   # shows the disclosure, asks to enable
npm run review
```

The hook redacts common secret shapes (API keys, tokens, PEM blocks,
credentials in connection strings) before the transcript leaves the machine,
and drops any candidate that still contains one — but redaction is
best-effort, not a guarantee. Read the privacy guidance in
[ARCHITECTURE.md](ARCHITECTURE.md) before enabling it. Consent lives in
`~/.ideagit/consent.json`, not in the repo, so it doesn't travel with `git
clone`.

## Decision format

Each record contains:

- The chosen option
- Alternatives that were actually considered and rejected
- The real deciding reason
- What would change the decision
- File scope and lifecycle status
- Provenance when available

The files remain useful Markdown even if IdeaGit is removed.

## Validation path

Read these in order:

1. [PRD.md](PRD.md) - product thesis, target user, metrics, and kill criteria
2. [ROADMAP.md](ROADMAP.md) - validation gates and build order
3. [ARCHITECTURE.md](ARCHITECTURE.md) - storage, MCP surface, trust model, and future design
4. [PRIVACY.md](PRIVACY.md) - what auto-capture sends, where it goes, and how to delete it
5. [CLAUDE.md](CLAUDE.md) - condensed context and commands for a coding agent working in this repo

The immediate goal is not to build a graph or hosted service. It is to prove
that an agent recalls a prior decision and changes its behavior because of it.
