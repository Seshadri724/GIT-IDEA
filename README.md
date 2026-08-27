# IdeaGit

**Decision memory and contradiction checker for coding agents.**

IdeaGit stores important technical decisions as Markdown inside your repository
and gives your MCP-capable coding agent tools to search prior decisions and check
new proposals before suggesting architectural changes.

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

The core retrieval and enforcement implementation includes:

- MCP server over stdio with three tools:
  - `check_proposal`: checks a proposed architectural change against active decisions and returns `CONFLICT` | `RELATED` | `NONE`
  - `search_decisions`: tokenized keyword retrieval with weighted field relevance ranking
  - `record_decision`: records what was chosen, rejected alternatives, deciding factors, and revisitation triggers
- Always-on rule compiler: `ideagit rules` converts active decisions into copy-paste rules for `.cursorrules`, `.cursor/rules/`, or `CLAUDE.md`
- Markdown files with YAML frontmatter under `.decisions/`
- Diagnostic doctor (`ideagit doctor`) for dangling references, schema validity, and contradiction warnings
- Secret redaction covering API keys (OpenAI, Anthropic, Google), GitHub tokens, JWTs, and connection strings

Experimental capture plumbing is also present:

- Session transcript parsing
- `claude -p` extraction wrapper (fail-open)
- Pending candidate queue (`.decisions/.pending/`)
- `ideagit review` interactive CLI

## Quick start

```bash
npm install
npm run build
npm test
```

### Configure MCP Agent Client

Set `IDEAGIT_CWD` (or `cwd`) to the absolute path of the target repository whose decisions the agent should govern.

#### 1. Claude Code / Windsurf / Cline (`.claude/mcp.json` or `~/.claude/mcp.json`)
```json
{
  "mcpServers": {
    "ideagit": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/ideagit/dist/server.js"],
      "env": {
        "IDEAGIT_CWD": "/ABSOLUTE/PATH/TO/YOUR/TARGET/REPO"
      }
    }
  }
}
```

#### 2. Cursor (`.cursor/mcp.json` or `~/.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "ideagit": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/ideagit/dist/server.js"],
      "env": {
        "IDEAGIT_CWD": "/ABSOLUTE/PATH/TO/YOUR/TARGET/REPO"
      }
    }
  }
}
```

Or run `node bin/ideagit.js init` inside your target project directory to print a pre-filled configuration.

---

## Always-On Rules (Compile-to-Rules)

MCP tools can sometimes be ignored by agents. To enforce decisions unconditionally in Cursor or Claude Code, run:

```bash
node bin/ideagit.js rules
```

Copy the generated markdown block directly into your project's `.cursorrules`, `.cursor/rules/decisions.mdc`, or `CLAUDE.md`.

---

## Proving Value (The Two-Week Usage Log)

To validate IdeaGit in a live repository, track interactions in a paper log or local file:

| Date | Unprompted Search / Check Called? (Y/N) | Decision Recalled | Proposal Changed? (Y/N) | Notes |
|---|---|---|---|---|
| 2026-08-28 | Y | Rejected Redis for SQLite | Y | Agent suggested SQLite instead of adding Redis |

**Phase 1 Gate (from ROADMAP.md):**
- 10 useful records in that repository
- ≥ 2 unprompted searches or proposal checks
- ≥ 1 proposal changed because of a recorded decision

---

## Decision Format

Each record in `.decisions/*.md` contains:

- The chosen option
- Alternatives that were actually considered and rejected with reasons
- The real deciding reason (`## Why`)
- What would change our mind (`## What would change our mind`)
- File scope glob patterns and lifecycle status

The files remain clean, readable Markdown even if IdeaGit is removed.
