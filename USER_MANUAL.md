# IdeaGit Reference Manual

IdeaGit is a local, Git-backed decision memory for MCP-capable coding agents.

**Start here for install and the use/test procedure:** [README.md](README.md).  
**Full case IDs:** [TESTCASES.md](TESTCASES.md).  
**Live evidence log:** [USAGE_LOG.md](USAGE_LOG.md).

Decisions are stored in **the target app** (`IDEAGIT_CWD`), not necessarily the IdeaGit clone.

---

## 1. Build and connect

```bash
# In the IdeaGit clone
npm install
npm run build
npm test

# In YOUR_APP (the repo you want governed)
node /path/to/ideagit/bin/ideagit.js init
```

Paste the printed JSON into Cursor (`.cursor/mcp.json`) or Claude MCP config. Required:

- `args` → IdeaGit `dist/server.js`
- `env.IDEAGIT_CWD` → absolute path of YOUR_APP

Restart the editor. Open YOUR_APP. Confirm tools: `record_decision`, `search_decisions`, `check_proposal`.

Do not run `ideagit consent` on first use.

---

## 2. MCP tools

### `check_proposal`

Check a planned change against **all active** rejected alternative names, then search for related records.

- `proposal` (string, required)
- `scope` (optional): file path — if set, only decisions whose scope glob matches
- `repo_path` (optional): override root (else `IDEAGIT_CWD` / cwd)

Returns `CONFLICT` | `RELATED` | `NONE`. Rejected **names** should be short (`Redis`, `GraphQL`).

### `search_decisions`

Keyword retrieval with whole-token scoring.

- `query` (string): empty query with no `scope` returns no rows (does not dump the log)
- `status` (optional): `active` | `superseded` | `abandoned` | `stale` | `any` (default `active`)
- `scope` (optional): file path
- `repo_path` (optional)

### `record_decision`

Persist a structural choice. Required: `title`, `chose`, `why`. Optional: `rejected` (`{ name, reason }[]`), `changes_mind`, `scope` (globs), `tags`, `supersedes`, `provenance`, `repo_path`.

---

## 3. Everyday workflow

1. After a real rejection, ask the agent to `record_decision`.
2. Confirm `YOUR_APP/.decisions/*.md` exists.
3. Optional: `node /path/to/ideagit/bin/ideagit.js rules` (cwd = YOUR_APP) and paste into `.cursor/rules/` or `CLAUDE.md`.
4. Before architecture/dependency work, the agent should `check_proposal` or `search_decisions`.

---

## 4. How to test the product

1. Prompted: record a seed (e.g. reject `Redis` for sessions) → `check_proposal` “Add Redis for session caching” → **CONFLICT**.
2. **New chat.** Do not name IdeaGit or the tools. Ask to add that rejected option.
3. Pass = unprompted tool call + plan changes. Fail = implements it with no check.
4. One real row in `USAGE_LOG.md`. Unprompted Y only if you did not name the tools.

---

## 5. CLI

Run as `node bin/ideagit.js <cmd>` from the clone, with **cwd = YOUR_APP** for commands that read `.decisions/`.

| Command | Description |
|---|---|
| `serve` | Stdio MCP server (default). |
| `init` | Paste-ready MCP JSON with `IDEAGIT_CWD` = current directory. |
| `rules` | Print always-on Markdown from active decisions (stdout; you paste it). |
| `doctor` | Structure, dangling refs, contradiction **warnings**. Exit 1 on errors only. |
| `graph` | Mermaid file at `.decisions/GRAPH.md`. |
| `consent [status\|revoke]` | Opt-in auto-capture. |
| `review` | Accept/edit/skip `.decisions/.pending/` candidates. |
| `phase0 [dir]` | Extractor eval vs hand-labeled sessions (experimental). |
