# IdeaGit Reference Manual

IdeaGit is a local, Git-backed decision memory and contradiction detector for MCP-capable coding agents.

## 1. Quick Start

### Build
```bash
npm install
npm run build
npm test
```

### Configure MCP Client
Add IdeaGit to your agent's MCP settings (e.g., `.claude/mcp.json`, `~/.cursor/mcp.json`):

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

---

## 2. MCP Tools

IdeaGit exposes two MCP tools over stdio:

### `search_decisions`
- **Purpose**: Query recorded decisions before proposing architectural or dependency changes.
- **Parameters**:
  - `query` (string, required): Keywords or proposal description.
  - `status` (optional): `'active' | 'superseded' | 'abandoned' | 'stale' | 'any'`. Default `'active'`.
  - `scope` (optional): File path to restrict to matching scope globs.
  - `repo_path` (optional): Custom repository root path.

### `record_decision`
- **Purpose**: Record a structural technical choice made during a session.
- **Parameters**:
  - `title` (string, required): High-level choice.
  - `chose` (string, required): Detailed decision outcome.
  - `why` (string, required): Deciding factor / rationale.
  - `rejected` (array, optional): List of `{ name, reason }` alternatives considered.
  - `changes_mind` (string, optional): Conditions to revisit the decision.
  - `scope` (array, optional): Governed file glob patterns.
  - `tags` (array, optional): Category tags.
  - `supersedes` (array, optional): IDs of retired decisions.
  - `provenance` (object, optional): Session ID, commit hash, or source link.

---

## 3. CLI Commands

| Command | Description |
|---|---|
| `ideagit serve` | Starts the stdio MCP server (default). |
| `ideagit init` | Outputs a ready-to-paste MCP configuration JSON. |
| `ideagit doctor` | Validates decision record integrity, references, and contradictions. |
| `ideagit graph` | Generates a Mermaid flowchart in `.decisions/GRAPH.md`. |
| `ideagit consent [status\|revoke]` | Manages per-repository auto-capture consent. |
| `ideagit review` | Interactive prompt to review candidate decisions queued in `.decisions/.pending/`. |
| `ideagit phase0 [dir]` | Evaluates extraction quality against ground-truth sessions. |
