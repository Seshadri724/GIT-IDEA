# IdeaGit — Privacy Notes

IdeaGit is local-first. There is no IdeaGit server, no account, and no
telemetry. Two features handle data differently — read the one that applies
to you.

## `record_decision` / `search_decisions` (the MCP server)

Everything stays on this machine and in this repository. Decision records are
plain Markdown files under `.decisions/`, written and read by the local MCP
server process. Nothing is sent anywhere by these two tools. If you commit
`.decisions/` to Git, its contents travel wherever that repository goes —
same as any other file you commit.

## Opt-in auto-capture (`ideagit consent`, the SessionEnd hook)

This is the only feature that sends anything off your machine, and it is off
until you explicitly run `ideagit consent` and answer yes.

**What is sent:** the text of your session transcript (your messages and the
agent's), after a best-effort local redaction pass that strips common secret
shapes (API keys, bearer tokens, PEM blocks, connection-string credentials).
Redaction is not guaranteed complete — see the warning `ideagit consent`
shows before you opt in.

**Where it goes:** to a model via headless `claude -p`, using your existing
Claude Code authentication. IdeaGit does not run its own model or forward
data anywhere beyond that call.

**What happens to the output:** candidate decisions are written to
`.decisions/.pending/` on your machine only. Nothing reaches `.decisions/`
(and nothing becomes part of your repo's history) until you run
`ideagit review` and explicitly accept a candidate.

**Retention:** rejected or skipped candidates are deleted immediately by
`ideagit review`. Accepted candidates become ordinary Markdown files you own
and control like any other file in your repository.

## Deletion

- Pending candidates: delete `.decisions/.pending/` in the repository.
- Accepted decision records: delete the corresponding `.md` file under
  `.decisions/` (and commit that removal if the repo is shared).
- Consent choice: `ideagit consent revoke`, or delete
  `~/.ideagit/consent.json`.

There is no hosted copy of any of this data for IdeaGit to delete on your
behalf — deleting the local file is the whole operation.

## Questions

Open an issue in this repository, or contact the person who invited you to
test it.
