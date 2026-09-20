# IdeaGit Beta Tester Manual

This manual is for testing IdeaGit in a real application repository and reporting useful evidence.

The goal is not only to prove that the code runs. The important question is whether a coding agent actually finds an earlier decision and changes its proposal because of it.

## Beta rules

- Test in a repository other than the IdeaGit clone.
- Do not use production secrets or private transcripts.
- Do not enable auto-capture unless you have read [`PRIVACY.md`](PRIVACY.md) and explicitly consented.
- Treat IdeaGit as experimental. It does not force an agent to call a tool.
- Do not mark a prompted tool call as an unprompted product success.

## 1. Prepare the test

Install and build IdeaGit:

```bash
git clone <IDEAGIT_REPOSITORY_URL>
cd ideagit
npm install
npm test
npm run build
```

Record the following information:

```text
Date:
Tester:
Operating system:
Node version:
IdeaGit path:
Target application path:
Agent client:
MCP connected: Y/N
```

The target application path must not be the IdeaGit repository.

## 2. Connect the target application

From the target application:

```bash
node /absolute/path/to/ideagit/bin/ideagit.js init
```

Paste the output into the client MCP configuration and restart the client.

Confirm that the client exposes:

- `record_decision`
- `search_decisions`
- `check_proposal`

Check the path invariant:

```text
IDEAGIT_CWD = target application repository
server       = IdeaGit/dist/server.js
```

## 3. Run the plumbing test

In a prompted chat, ask the agent to record this seed decision, or use a real decision from the target repository:

```text
Title: Keep sessions in Postgres rather than adding Redis
Chose: Session state stays in Postgres
Why: Cannot operate a second datastore
Rejected: Redis — operational cost
Scope: a real folder in the target repository, for example src/**
```

Verify that a new file appears under:

```text
TARGET_APP/.decisions/
```

It must not appear only under the IdeaGit clone.

Now ask the agent, explicitly:

```text
Check whether adding Redis for session caching conflicts with our recorded decisions.
```

Expected result: `CONFLICT`, with the Redis decision and its reasoning shown.

This proves plumbing only. It does not prove that agents will search without being told.

## 4. Run the real product test

Start a new chat. Do not mention IdeaGit, MCP, decision records, or tool names.

Send a request such as:

```text
Sessions feel slow. Add Redis for session caching and implement it.
```

Pass only if all of these happen:

1. The agent calls `check_proposal` or `search_decisions` without being told.
2. The agent finds and cites the earlier decision.
3. The agent does not silently add Redis.
4. The proposed plan changes, or the agent asks whether the constraint has changed.

If the agent implements Redis without checking, record a failure. That is valuable beta evidence.

## 5. Run negative tests

### Unrelated change

Ask:

```text
Fix the typo in the README.
```

Expected: no Redis conflict and no dump of every decision.

### Different rejected technology

Record a decision rejecting `GraphQL`, then ask the agent to add GraphQL to an API. Expected: the GraphQL decision is found.

### Empty repository

Use a target repository with no `.decisions/` directory. A proposal should return `NONE`, not an error or an invented conflict.

### Wrong working directory

Inspect both repositories after recording a decision. If the file is written to the IdeaGit clone instead of the target application, mark the run `BLOCKED` and fix the MCP configuration before continuing.

## 6. Optional diagnostics

From the target application:

```bash
node /absolute/path/to/ideagit/bin/ideagit.js doctor
node /absolute/path/to/ideagit/bin/ideagit.js rules
```

Record warnings separately from errors. A contradiction warning should not be treated as proof that the agent found a conflict during a chat.

## 7. Record the result

Add one real row to [`USAGE_LOG.md`](USAGE_LOG.md):

```markdown
| YYYY-MM-DD | target-app | Add Redis for session caching | Y/N | check_proposal/search_decisions/none | Y/N | Y/N | What the agent did and whether the proposal changed. |
```

Use these meanings:

- `Unprompted = Y`: the user did not mention IdeaGit, MCP, or tool names.
- `Conflict = Y`: the recorded rejected alternative was found.
- `Proposal Changed = Y`: the agent changed the plan or asked whether the constraint had changed.
- `BLOCKED`: the test could not run because of installation, configuration, or disconnected MCP.

Do not change a failure to a pass because the tool worked when explicitly named.

## 8. Minimum beta evidence

The Phase 1 product gate requires:

- 10 useful records in a real target repository
- 2 unprompted searches or proposal checks
- 1 proposal changed because of a recorded decision
- Results recorded in `USAGE_LOG.md`

The IdeaGit repository's own `.decisions/` files do not count toward this gate.

## 9. Report a bug

Include:

- Operating system and Node version
- Client name and version
- IdeaGit commit or package version
- Target repository type
- Exact test steps
- Expected result
- Actual result
- Relevant sanitized logs

Never attach secrets, API keys, raw private transcripts, or private repository contents.

## 10. Stop conditions

Stop testing and report immediately if:

- Decision files are written into the wrong repository.
- Raw transcripts or secrets appear in `.decisions/`.
- A malformed decision causes the server to crash repeatedly.
- A write corrupts an existing decision.
- Auto-capture runs without explicit consent.

