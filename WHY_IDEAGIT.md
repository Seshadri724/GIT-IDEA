# IdeaGit — Why It Exists, Why You Need It, What It Solves

---

## The $300 Billion Problem Nobody Talks About

Software teams are spending more money than ever on AI coding agents — GitHub Copilot, Claude Code, Cursor, Codex, Windsurf. These tools are extraordinary at *writing* code.

But they have a fatal blind spot: **they cannot remember why your team rejected an idea last month.**

Every AI coding agent today has **session amnesia**. When a session ends, the reasoning behind your architectural decisions evaporates. The next session starts from zero context. The agent has no idea that:

- You already tried Redis and rejected it.
- You intentionally chose a monolith over microservices.
- You evaluated GraphQL and decided REST was better for your use case.
- You rejected a specific ORM because of its query overhead.

**The result?** Your team re-fights the same technical debates over and over, wastes engineering hours rediscovering constraints that were already known, and sometimes ships the wrong architecture because the agent confidently proposed something your team already considered and rejected.

---

## The Real Problems IdeaGit Solves

### Problem 1: Agents Repeat Rejected Proposals

**What happens today:**
```
Monday Session:
  Developer: "Should we add Redis for session caching?"
  Agent: "Redis would be great! Here's the implementation..."
  Developer: "No — we rejected that because we can't staff another datastore."

Wednesday Session (different context window):
  Developer: "Our sessions are slow."
  Agent: "You should add Redis for session caching! Here's the implementation..."
  Developer: "We ALREADY discussed this on Monday. We said no."

Next Month (new team member + agent):
  New Dev: "Sessions are slow."
  Agent: "Redis would be perfect! Let me set it up..."
```

**With IdeaGit:**
```
Next Month:
  New Dev: "Sessions are slow."
  Agent: "Before proceeding — this repository has an active decision record:

         'Keep sessions in Postgres rather than adding Redis'
         Date: 2026-04-14
         Scope: src/session/**
         Rejected: Redis (operational cost outweighs latency benefit)
         Revisit if: Session volume exceeds 50k concurrent.

         Has the constraint changed?"
```

**That single interaction saves hours of debugging, discussion, and potentially shipping the wrong solution.**

---

### Problem 2: "Why Is the Code Like This?"

Every mature codebase has code that looks wrong but is actually deliberate. A monolith in 2026. A custom ORM wrapper. A hand-rolled auth system instead of Auth0.

Without IdeaGit, understanding *why* requires:
- Asking the person who wrote it (if they're still at the company).
- Digging through months of Slack threads and meeting notes.
- Reading PR descriptions that say "implement feature X" but never say why alternative Y was rejected.
- Code archaeology through `git blame` and commit messages.

**With IdeaGit**, the answer is one search away:
```
Agent: "The custom auth wrapper exists because of decision
        '2026-01-15-custom-auth-over-auth0' — the team rejected
        Auth0 due to GDPR data residency requirements in the EU region.
        This decision governs src/auth/** and would be revisited if
        Auth0 adds EU-only data processing."
```

---

### Problem 3: New Team Members Start from Zero

Onboarding a new engineer takes weeks, partly because they have to learn not just *what* the code does but *why* it's structured the way it is. The constraints, trade-offs, and rejected alternatives are invisible unless someone explains them in person.

**With IdeaGit**, new contributors can search the decision log:
- "Why don't we use microservices?" → Decision record with full rationale
- "Why is billing a separate service?" → Decision record showing what it superseded and why
- "Why are we on Postgres instead of MongoDB?" → Decision record with rejected alternatives

This turns weeks of tribal knowledge transfer into seconds of searchable context.

---

### Problem 4: Stale Decisions Cause Wrong Advice

A decision made 6 months ago may no longer be valid. The team grew. Traffic increased. A dependency was deprecated. But the old decision is still sitting there, and an agent treats it as gospel.

**IdeaGit's `doctor` command catches this:**
```
⚠ [2026-01-15-monolith-first] Governed file 'src/billing/service.ts'
  modified after decision date (2026-01-15); record may be stale

✖ [2026-03-01-use-postgres] Contradiction detected: conflicts with
  '2026-07-15-use-mongodb' over overlapping scope [src/data/**].
  Neither supersedes the other.
```

Stale decisions get flagged. Contradictions get caught. Your decision memory stays trustworthy.

---

### Problem 5: ADRs Don't Get Written

Architecture Decision Records (ADRs) are a known best practice. The problem is **nobody writes them**. They're a separate documentation task that competes with shipping features. Coverage is always low.

IdeaGit is different because:
1. **Decisions are captured during the session** — while the context is fresh, by the agent that participated in the discussion.
2. **The agent is the primary consumer** — so the format is optimized for machine retrieval, not human documentation.
3. **Auto-capture is opt-in** — the session-end hook can extract candidates automatically, queue them for human review, and only accepted candidates become permanent records.
4. **Recording takes under 60 seconds** — one tool call during the conversation, not a separate writing task.

---

## Who Should Use IdeaGit

| If you are... | IdeaGit helps you... |
|---|---|
| **A solo developer using AI agents** | Stop your agent from re-proposing the same rejected ideas across sessions |
| **A small team (2-10 engineers)** | Preserve institutional knowledge that currently lives in one person's head |
| **A tech lead** | Ensure architectural constraints are enforced automatically, not by memory |
| **A new team member** | Understand *why* the code is structured the way it is, in seconds |
| **A team using AI coding agents daily** | Get contradiction prevention — the agent checks before it proposes |
| **An infrastructure/platform team** | Run `ideagit doctor` in CI to catch stale or contradictory decisions |

---

## What Makes IdeaGit Different

| Feature | Traditional ADRs | Wiki / Confluence | IdeaGit |
|---|---|---|---|
| **Lives in the repo** | ✅ | ❌ | ✅ |
| **Agent reads before proposing** | ❌ | ❌ | ✅ |
| **Captures rejected alternatives** | Sometimes | Rarely | ✅ Always |
| **Contradiction detection** | ❌ | ❌ | ✅ |
| **Staleness detection** | ❌ | ❌ | ✅ |
| **Git-tracked with code** | ✅ | ❌ | ✅ |
| **Works without the tool** | ❌ | ❌ | ✅ (plain Markdown) |
| **Agent-optimized format** | ❌ | ❌ | ✅ |
| **Auto-capture from sessions** | ❌ | ❌ | ✅ (opt-in) |
| **CI-integrated health checks** | ❌ | ❌ | ✅ |
| **Vendor-neutral** | Varies | Vendor-locked | ✅ Any MCP agent |

---

## "But There Are Already So Many Memory Tools..."

Yes. The agent memory space is crowded. Here's an honest breakdown of every category, what they do well, and what they structurally *cannot* do — which is exactly where IdeaGit lives.

### Category 1: General Agent Memory Layers

**Tools:** Mem0, Letta (MemGPT), AgentMemory, Cognee, Zep

**What they do:** Store facts, preferences, and context from past conversations. "User prefers dark mode." "Last session discussed authentication." They're designed to make an agent *remember things about you* across sessions.

**What they don't do:**
- They don't store **rejected alternatives alongside chosen options**. Mem0 might remember "we use Postgres" — but it won't remember "we rejected Redis because of operational cost, and would revisit if traffic hits 50k." The *rejection* and the *revisit condition* are the valuable parts.
- They don't **tell the agent to search before proposing**. No server instruction says "before you suggest a new database, check what was already rejected." The agent has to voluntarily recall — which it often doesn't.
- They don't **detect contradictions**. If you tell Mem0 "use Postgres" on Monday and "use MongoDB" on Friday, it stores both. It doesn't flag the conflict. IdeaGit's `doctor` command catches exactly this.
- They store **everything**. User preferences, code snippets, random facts. Decision memory drowns in noise. IdeaGit stores *only* decisions — choices where a real alternative was considered and rejected.

**The gap:** General memory is a lake. IdeaGit is a fire alarm. A lake stores water; a fire alarm detects danger. They're not the same product.

---

### Category 2: Session & Task Trackers

**Tools:** Beads, claude-task-master, spec-kit

**What they do:**
- **Beads** tracks workflow state (task lists, session logs) in SQLite/JSON-L so tasks don't disappear when a session ends.
- **claude-task-master** manages task breakdown, dependencies, and progress via MCP.
- **spec-kit** lets you define upfront specifications as scaffolding for an agent.

**What they don't do:**
- They track **what to do**, not **what was already tried and rejected**. A task tracker says "implement session caching." IdeaGit says "we already evaluated Redis for session caching and rejected it because of operational cost."
- They don't store **rationale**. Tasks have status (done/pending/blocked), not reasoning (why alternative X was rejected in favor of Y).
- They don't have **contradiction prevention**. A task tracker won't stop you from creating a task that contradicts a previous architectural decision.
- **spec-kit** is excellent at *starting* a project with clear specs. IdeaGit is about *preserving* decisions made *during* the project that specs didn't anticipate. They're complementary, not competing.

**The gap:** These tools answer "what should I do next?" IdeaGit answers "what did we already try and reject, and why?"

---

### Category 3: Context Databases & Knowledge Stores

**Tools:** claude-mem (SQLite + Vector DB via MCP), OpenViking (virtual filesystem)

**What they do:**
- **claude-mem** stores project context in SQLite with vector embeddings for semantic search. It's a general-purpose memory MCP server.
- **OpenViking** presents memory as a virtual filesystem (`viking://`) so agents can browse context with file commands.

**What they don't do:**
- They store **unstructured context**, not **structured decisions**. claude-mem can store "we discussed Redis vs Postgres" as a memory blob. IdeaGit stores it as a decision record with explicit fields: *what was chosen*, *what was rejected and why*, *what would change our mind*, *which files are governed*, and *what superseded what*.
- They don't enforce **the decision schema**. In claude-mem, the quality of what gets stored depends entirely on the agent's judgment. IdeaGit's format guarantees that every record has a `## Chose`, `## Rejected`, `## Why`, and optionally `## What would change our mind` — the fields that actually matter for contradiction detection.
- They don't have **staleness detection**. If governed code files change after a decision was made, IdeaGit's `doctor` flags it. General context stores don't know which files a memory governs.
- They have **no CI integration**. You can't run `claude-mem doctor` in a GitHub Action to catch contradictory or stale context entries before a PR merges.

**The gap:** These are memory *databases*. IdeaGit is a decision *governance system*. A database stores data; a governance system enforces consistency.

---

### Category 4: Vector Databases & Embedding Infrastructure

**Tools:** Pinecone, Qdrant, Chroma, PGVector, Redis vector, MongoDB vector

**What they do:** Store high-dimensional embeddings for semantic similarity search. "Find memories similar to this query."

**What they don't do:**
- They're **infrastructure, not products**. Pinecone doesn't know what a "decision" is. You'd have to build the decision schema, the recording workflow, the search-before-proposing instruction, the staleness detection, and the contradiction checker yourself — which is exactly what IdeaGit already is.
- They **add significant operational complexity**. Running a vector database means managing an index, handling embedding drift, tuning similarity thresholds, and paying for infrastructure. IdeaGit is a directory of Markdown files. It requires zero infrastructure, zero API keys, zero hosting costs. Files are readable with `cat`.
- They **optimize for recall, not precision**. Vector search returns "similar" results. IdeaGit's search returns *exact* decisions that govern specific file scopes. When an agent asks "is there a decision about session storage?", it needs the precise record with the precise reasoning — not the 5 nearest embeddings.

**The gap:** Vector databases are a search engine. IdeaGit is the content *and* the alarm system that sits on top. And IdeaGit's design explicitly says: don't add embeddings until keyword search fails in real use (see [ARCHITECTURE.md](ARCHITECTURE.md) §6 — the upgrade ladder).

---

### The Real Competitive Map

| Capability | Mem0 / Letta / Zep | Beads / Task-Master | claude-mem / OpenViking | Vector DBs | **IdeaGit** |
|---|---|---|---|---|---|
| Remembers general facts | ✅ | ❌ | ✅ | ✅ | ❌ (by design) |
| Tracks tasks & workflow | ❌ | ✅ | ❌ | ❌ | ❌ (by design) |
| Stores **rejected alternatives** | ❌ | ❌ | ❌ | ❌ | ✅ |
| Stores **revisit conditions** | ❌ | ❌ | ❌ | ❌ | ✅ |
| Agent **searches before proposing** | ❌ | ❌ | ❌ | ❌ | ✅ (server instructions) |
| **Contradiction detection** | ❌ | ❌ | ❌ | ❌ | ✅ (`doctor`) |
| **Staleness detection** (Git-aware) | ❌ | ❌ | ❌ | ❌ | ✅ (`doctor`) |
| **CI-ready** (exit code 1 on errors) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Works without infrastructure | ❌ | ✅ | Partial | ❌ | ✅ (plain Markdown files) |
| Readable without the tool | ❌ | ❌ | ❌ | ❌ | ✅ (`cat .decisions/*.md`) |
| File-scoped governance | ❌ | ❌ | ❌ | ❌ | ✅ (glob patterns) |
| Supersedes/lifecycle tracking | ❌ | ❌ | ❌ | ❌ | ✅ |
| Vendor-neutral on disk | ❌ | Partial | ❌ | ❌ | ✅ (`.decisions/`, not `.ideagit/`) |

---

### The Key Insight

Every tool listed above answers some form of: **"What does the agent know?"**

IdeaGit answers a fundamentally different question: **"What did we already try, why did we reject it, and should the agent even be proposing this?"**

That's not memory. That's *governance*. And no general-purpose memory layer provides it, because:

1. **They store facts, not decisions.** "We use Postgres" is a fact. "We rejected Redis because of operational cost and would revisit at 50k concurrent sessions" is a decision. The decision is 10x more valuable because it prevents the wrong proposal.

2. **They don't have server instructions.** IdeaGit's MCP server declares instructions that tell the agent to search *before* proposing. No other memory tool does this. Without it, the agent has to voluntarily decide to check memory — which it doesn't do reliably.

3. **They can't detect contradictions.** Two active decisions governing the same code scope with conflicting choices? Only IdeaGit catches that. General memory tools store both entries happily.

4. **They don't know which files a memory governs.** IdeaGit's `scope` field ties decisions to specific file patterns, enabling both scoped search ("what decisions affect `src/auth/**`?") and staleness detection ("has the governed code changed since this decision?").

### When to Use Them Together

IdeaGit is **complementary** to these tools, not a replacement:

| Use... | For... |
|---|---|
| **spec-kit** | Defining what you want to build *before* you start |
| **claude-task-master** | Breaking work into tasks and tracking progress |
| **Beads** | Preserving session workflow state (task lists, logs) |
| **Mem0 / claude-mem** | General context and user preferences |
| **IdeaGit** | Preserving *why* you rejected alternatives, and stopping the agent from proposing them again |

They handle different layers of the problem. IdeaGit is the only one that handles the **decision governance** layer.

---

## The Business Case: ROI

### Time Saved Per Prevented Re-Decision
A single re-debated architectural decision costs:
- **30 minutes to 2 hours** of developer time (re-investigating, re-discussing, re-deciding).
- **Potential days of rework** if the wrong decision ships before the constraint is rediscovered.
- **Context-switching cost** for the team members pulled into the discussion.

If IdeaGit prevents just **one re-decision per developer per month**, it pays for itself many times over.

### Cost of Wrong Architecture Decisions
When an agent confidently proposes and implements a rejected approach:
- The code ships to staging or production.
- Someone eventually notices it contradicts a prior constraint.
- The work gets reverted or rearchitected.
- **Wasted effort: 1-5 engineering days per incident.**

IdeaGit's contradiction alarm catches this *before* the code is written.

---

## Why Now?

Three forces make IdeaGit necessary *today*:

1. **AI agents are writing more code than ever** — but their session memory is still ephemeral. The gap between "can generate code" and "remembers why the code is this way" is widening every month.

2. **MCP (Model Context Protocol) is the standard** — for the first time, there's a universal protocol for agents to call external tools. IdeaGit plugs directly into this, working with any MCP-capable agent without vendor lock-in.

3. **Teams are scaling AI usage faster than knowledge transfer** — as more developers use agents in parallel, the risk of contradictory proposals multiplies. Without a shared decision memory, each agent operates in its own context vacuum.

---

## The Bottom Line

> **IdeaGit is not a memory tool. It's a contradiction detector.**
>
> Mem0 remembers what you said. Beads remembers what you were doing. Task-Master remembers what you need to do.
>
> IdeaGit remembers **what you rejected and why** — and stops the agent from proposing it again.

Every other tool in the landscape stores *information*. IdeaGit stores *decisions* — with the rejected alternatives, the real rationale, the revisit conditions, and the file scope — and then *acts on them* by instructing the agent to search before proposing and flagging contradictions automatically.

If your team uses AI coding agents, and your repositories have architectural decisions with long-lived consequences, IdeaGit prevents the most expensive kind of waste: **repeating work that was already done, re-debating choices that were already made, and shipping solutions that were already rejected.**
