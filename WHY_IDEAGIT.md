# Why IdeaGit

## The Problem: Agents Suffer from Session Amnesia

AI coding agents (Claude Code, Cursor, Windsurf, Copilot) are effective at writing and editing code within an active context window. However, when a session ends, the context is lost.

In particular: **Coding agents remember existing code, but forget why rejected alternatives were not chosen.**

### Concrete Scenario:
1. **Week 1**: Developer and agent discuss session management. They consider Redis and reject it because the team lacks bandwidth to operate a second datastore. They choose unlogged Postgres tables.
2. **Week 3**: A new context window opens. The developer asks to optimize session latency. The agent immediately proposes Redis because Redis is a standard pattern in training data.
3. **Outcome**: Engineering time is wasted re-evaluating rejected options, or worse, reintroducing constraints already known to be unsuitable.

---

## The Solution: Local-First Decision Memory

IdeaGit provides:
1. **Human-Readable Markdown Records**: Stored in `.decisions/*.md` in Git. Survives even if IdeaGit is uninstalled.
2. **MCP Retrieval**: Three tools (`record_decision`, `search_decisions`, `check_proposal`) that allow coding agents to query historical decisions before proposing architectural or dependency changes.
3. **Structured Trade-offs**: Every record captures:
   - What was chosen
   - What was rejected and why
   - The deciding factor
   - What condition would change the decision
   - Governed file scope

---

## Design Principles

- **Local-First & Git-Backed**: Zero external servers, telemetry, or databases required.
- **Fail-Open**: Background hooks and extraction never block developer sessions.
- **Human Gate on Candidates**: Machine extraction queues candidates in `.decisions/.pending/`; humans accept or skip via `ideagit review`.
- **Search Ladder**: In-memory tokenized search with relevance ranking. Avoids premature vector databases until latency or recall warrants them.
