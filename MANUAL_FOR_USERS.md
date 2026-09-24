# IdeaGit User Manual

This manual is for someone using IdeaGit in their own application repository.

IdeaGit is a local MCP server that stores technical decisions as Markdown files in Git. It helps a coding agent remember rejected alternatives before proposing them again.

## Requirements

- Node.js 20 or newer
- Git
- Cursor or Claude Code with MCP support
- An application repository where you want to store `.decisions/`

IdeaGit is currently installed from its Git repository. It is not yet an npm package release.

## 1. Download and build IdeaGit

Clone the repository and build it:

```bash
git clone <IDEAGIT_REPOSITORY_URL>
cd ideagit
npm install
npm test
npm run build
```

On Windows PowerShell, the commands are the same. Keep the absolute path to this clone; it is needed in the MCP configuration.

If `npm test` fails, stop and fix that problem before connecting IdeaGit to an application.

## 2. Create the MCP configuration

Change directory to the application repository that should own the decisions:

```bash
cd /path/to/YOUR_APP
node /absolute/path/to/ideagit/bin/ideagit.js init
```

On Windows, for example:

```powershell
cd C:\Projects\YOUR_APP
node C:\Tools\ideagit\bin\ideagit.js init
```

Copy the JSON printed by `init` into your agent's MCP configuration.

Cursor commonly uses:

```text
YOUR_APP/.cursor/mcp.json
```

Claude Code commonly uses:

```text
YOUR_APP/.claude/mcp.json
```

The generated configuration should look like this:

```json
{
  "mcpServers": {
    "ideagit": {
      "command": "node",
      "args": ["/absolute/path/to/ideagit/dist/server.js"],
      "env": {
        "IDEAGIT_CWD": "/absolute/path/to/YOUR_APP"
      }
    }
  }
}
```

On Windows, use the paths printed by `init`; do not replace them with relative paths.

Restart the editor and open `YOUR_APP` as the workspace. Confirm that these tools are visible:

- `record_decision`
- `search_decisions`
- `check_proposal`

Important: `IDEAGIT_CWD` must point to `YOUR_APP`, not to the IdeaGit clone. Decision files belong in `YOUR_APP/.decisions/`.

## 3. Record a decision

Record a decision when the team chooses between realistic technical alternatives and may need to revisit the reasoning later.

Good examples:

- Keep sessions in Postgres instead of adding Redis.
- Use stdio MCP transport instead of HTTP.
- Keep Markdown files instead of adding a database.

Ask the agent to call `record_decision` with:

- `title`: the chosen direction
- `chose`: what was selected
- `why`: the actual deciding reason
- `rejected`: short alternative names and their reasons
- `scope`: the folders or files governed by the decision
- `changes_mind`: what would justify revisiting it

Use short rejected names such as `Redis`, `GraphQL`, or `Prisma`. Avoid long sentences as rejected names because searches work best with concise names.

After recording, verify that a Markdown file exists:

```text
YOUR_APP/.decisions/YYYY-MM-DD-*.md
```

Commit decision files with the code or architecture they explain.

## 4. Check a proposal

Before adding a dependency, datastore, API style, or major structure, ask the agent to check the proposal.

Example:

```text
Before implementing this architectural change, check whether this repository has already rejected the proposed technology or approach.
```

The result is one of:

- `CONFLICT`: an active decision rejected the proposed alternative
- `RELATED`: a decision is relevant but does not directly conflict
- `NONE`: no matching decision was found

`NONE` does not mean the proposal is approved. It only means no matching record was found.

If the result is `CONFLICT`, the agent should show the decision and ask whether the constraint has changed before writing code.

## 5. Search decisions manually

Use `search_decisions` for questions such as:

- `redis sessions`
- `authentication provider`
- `database migrations`
- `MCP transport`

Search is local and reads active decisions by default. Superseded decisions can be requested with `status: any`.

## 6. Optional repository rules

From `YOUR_APP`, run:

```bash
node /absolute/path/to/ideagit/bin/ideagit.js rules
```

Copy the output into an agent rules file such as `.cursor/rules/` or `CLAUDE.md`. This can improve the chance that the agent checks decisions, but it is not a hard enforcement mechanism.

## 7. Health checks

From `YOUR_APP`:

```bash
node /absolute/path/to/ideagit/bin/ideagit.js doctor
```

The doctor checks record structure, references, scopes, and contradiction warnings.

To generate a Mermaid graph:

```bash
node /absolute/path/to/ideagit/bin/ideagit.js graph
```

## 8. Auto-capture warning

Do not enable auto-capture for first use. The `consent` feature is experimental, Claude Code-specific, and sends redacted transcript text to `claude -p`.

Read [`PRIVACY.md`](PRIVACY.md) before running:

```bash
node /absolute/path/to/ideagit/bin/ideagit.js consent
```

Consent alone does nothing until the SessionEnd hook is registered. Add it to the app repo's `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionEnd": [{ "hooks": [{ "type": "command",
      "command": "node /absolute/path/to/ideagit/hooks/session-end.js" }] }]
  }
}
```

Candidates are placed in `.decisions/.pending/` and require human review. They are not written as accepted decisions automatically.

## Troubleshooting

### No IdeaGit tools appear

1. Confirm `dist/server.js` exists.
2. Run `npm run build` in the IdeaGit clone.
3. Check that the MCP JSON contains absolute paths.
4. Restart the editor.
5. Confirm Node.js is version 20 or newer.

### Decisions appear in the wrong repository

Run `init` from `YOUR_APP` again and confirm that `IDEAGIT_CWD` points to that repository.

### The agent does not search automatically

This is an expected limitation of the beta. MCP instructions and rules are guidance, not guaranteed enforcement. Record the result as a product test in `USAGE_LOG.md`.

## Privacy

The normal MCP tools are local. Decision Markdown is stored in your repository. Review [`PRIVACY.md`](PRIVACY.md) before enabling transcript capture.

