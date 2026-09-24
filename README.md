# IdeaGit

**Decision memory for coding agents** (thesis: they stop re-proposing rejected options).

IdeaGit stores technical decisions as Markdown in **your application repo** and exposes three MCP tools so an agent can record, search, and check proposals before changing architecture or dependencies.

The useful event is:

```text
Agent: You are proposing Redis, but this repository rejected Redis for session
       storage because of operational cost. Has that constraint changed?
```

That event is **not proven** until you see it on a real app. This package is clone-and-build only; it has not been published to npm.

## Two directories (read this first)

| Path | Role |
|---|---|
| **IdeaGit clone** (this repo) | Build the server: `dist/server.js` |
| **Your app** (`YOUR_APP`) | Where `.decisions/` is written. Set `IDEAGIT_CWD` to this path |

If `IDEAGIT_CWD` points at IdeaGit while you edit another project, records land in the wrong tree.

Do not enable `ideagit consent` (auto-capture) for first use.

---

## Use / test procedure

### 1. Build the tool (in this repo)

Needs Node 20+.

```bash
npm install
npm run build
npm test
```

If tests fail, stop.

### 2. Generate MCP config **from YOUR_APP**

```bash
cd /path/to/YOUR_APP
node /path/to/ideagit/bin/ideagit.js init
```

Paste the JSON into:

- **Cursor:** `YOUR_APP/.cursor/mcp.json` (or user MCP settings)
- **Claude Code:** `YOUR_APP/.mcp.json`, or skip pasting and run the one-liner `init` also prints:

  ```bash
  claude mcp add ideagit -e IDEAGIT_CWD=/ABSOLUTE/PATH/TO/YOUR_APP -- node /ABSOLUTE/PATH/TO/ideagit/dist/server.js
  ```

Confirm:

- `args` → `.../ideagit/dist/server.js` (the program)
- `env.IDEAGIT_CWD` → absolute path of **YOUR_APP** (the decisions)

Restart the editor. Open **YOUR_APP** as the workspace. Confirm MCP server `ideagit` is connected with tools `record_decision`, `search_decisions`, `check_proposal`.

Example shape:

```json
{
  "mcpServers": {
    "ideagit": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/ideagit/dist/server.js"],
      "env": {
        "IDEAGIT_CWD": "/ABSOLUTE/PATH/TO/YOUR_APP"
      }
    }
  }
}
```

### 3. Everyday use

1. When you reject an option, ask the agent to call `record_decision`. Keep rejected **names short** (`Redis`, not a sentence). Set `scope` to real folders.
2. Confirm new files appear under `YOUR_APP/.decisions/`, not under the IdeaGit clone.
3. Optional always-on rules (tools are often skipped):

   ```bash
   cd /path/to/YOUR_APP
   node /path/to/ideagit/bin/ideagit.js rules
   ```

   Paste the output into `.cursor/rules/`, `.cursorrules`, or `CLAUDE.md`.
4. Commit `.decisions/*.md` with the code they justify.

### 4. Test that it actually works

**Plumbing (prompted — you may name tools):**

- `record_decision` with a seed such as: chose Postgres sessions, rejected name `Redis`, why = cannot operate a second datastore, scope = a glob that exists in YOUR_APP.
- Then `check_proposal` with `Add Redis for session caching` → expect **CONFLICT**.

**Product (new chat — do not mention IdeaGit, MCP, or tool names):**

> Sessions feel slow. Add Redis for session caching and wire it up.

**Pass:** the agent calls `check_proposal` or `search_decisions` by itself, cites the record, does not silently add Redis.  
**Fail:** it implements Redis with no check. Log that too — it is a valid result.

Write one **real** row in [`USAGE_LOG.md`](USAGE_LOG.md) (not the italic placeholder). Unprompted = Y only if you did not name the tools.

Case IDs, negatives, and the two-week gate: [`TESTCASES.md`](TESTCASES.md). CLI and tool fields: [`USER_MANUAL.md`](USER_MANUAL.md).

### 5. Two-week Phase 1 gate (same app)

Count records **in YOUR_APP**, not IdeaGit’s own `.decisions/`:

- ≥ 10 useful records
- ≥ 2 unprompted searches or proposal checks
- ≥ 1 proposal changed because of a record

---

## What ships

- MCP stdio: `check_proposal` (`CONFLICT` | `RELATED` | `NONE`), `search_decisions`, `record_decision`
- `ideagit rules` — copy-paste constraints for Cursor / Claude
- `.decisions/*.md` — Markdown + YAML; readable if IdeaGit is removed
- `ideagit doctor` — structure, dangling refs, contradiction **warnings**
- Experimental opt-in capture: SessionEnd + `claude -p` + `ideagit review` (see [`PRIVACY.md`](PRIVACY.md))

## Decision format

Each `.decisions/*.md` record: chosen option, rejected alternatives (short names), `## Why`, what would change our mind, file scope, status.

## Manuals

- [Manual for users](MANUAL_FOR_USERS.md) — install, configure, and use IdeaGit
- [Manual for beta testers](MANUAL_FOR_BETA_TESTERS.md) — test IdeaGit in a real application repository

