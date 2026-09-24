# IdeaGit Test Cases Book

**Product under test:** IdeaGit MCP + CLI (decision memory / proposal checker)  
**Purpose:** Separate *library tests* (code works) from *product tests* (an agent on a real app changes a plan).  
**Honesty rule:** A prompted tool call is not an unprompted pass. Do not mark Phase 1 complete from GITIDEA self-ADRs.

**How to record results:** copy the result row into [`USAGE_LOG.md`](USAGE_LOG.md) for live agent cases (L-*). For automated cases, `npm test` is the record.

| Verdict | Meaning |
|---|---|
| PASS | Expected result observed |
| FAIL | Expected result not observed |
| BLOCKED | Could not run (install, MCP disconnected, wrong cwd) |
| N/A | Out of scope this run |

---

## 0. Environment (every manual run)

| Item | Value to fill |
|---|---|
| Date | |
| OS / shell | e.g. Windows 10, PowerShell |
| Node | `node -v` (need >= 20) |
| IdeaGit path | e.g. `C:\SESHU\PROJECTS\OTHER PROJECTS\GITIDEA` |
| **Target app path** | **Not GITIDEA** — e.g. `C:\...\YOUR_APP` |
| Client | Cursor / Claude Code / other |
| MCP connected? | Y/N (tools list shows `record_decision`, `search_decisions`, `check_proposal`) |

**Invariant:** `IDEAGIT_CWD` (or init cwd) = target app. Server binary = IdeaGit `dist/server.js`. Decisions must appear under `YOUR_APP\.decisions\`, never only under GITIDEA.

---

## 1. Automated suite (library)

**Setup:** from IdeaGit repo: `npm install && npm test`  
**Pass criterion:** all `node:test` files exit 0.

| ID | Case | Automated in | Expected |
|---|---|---|---|
| A-01 | Full suite green | `npm test` | Build succeeds; all tests pass |
| A-02 | Record round-trip + tags + provenance + unique ids + supersede | `test/store.test.js` | Files parse; superseded status set |
| A-03 | Multi-word search; ranking; rejected names; tags; scope glob; status | `test/search.test.js` | Redis query hits Postgres/Redis record |
| A-04 | Whole-token match (`sql` ≠ `sqlite`) | `test/search.test.js` | No false substring hit |
| A-05 | Empty query without scope returns `[]` | `test/search.test.js` | No log dump |
| A-06 | Empty query **with** scope returns scoped decisions | `test/search.test.js` | File-path inject works |
| A-07 | `check_proposal` CONFLICT on rejected name `Redis` | `test/proposal.test.js` | `verdict === conflict` |
| A-08 | `check_proposal` RELATED when topic overlaps, no reject match | `test/proposal.test.js` | `verdict === related` |
| A-09 | `check_proposal` NONE for unrelated proposal | `test/proposal.test.js` | `verdict === none` |
| A-10 | `compileRules` emits chose / rejected / title | `test/proposal.test.js` | Markdown contains fields |
| A-11 | Doctor: healthy, dangling supersedes, empty scope glob, contradiction **warning**, TTL vs logging not contradicted | `test/doctor.test.js` | Errors vs warnings as specified |
| A-12 | Redaction corpus (AWS, OpenAI, Anthropic, GitHub, JWT, Google, Slack, Bearer, key=value, URI, PEM) | `test/redact.test.js` | Secrets stripped; prose untouched |
| A-13 | Extract fail-open + prompt split | `test/extract.test.js` | Bad binary → `[]` |
| A-14 | Consent scoped per repo; revoke | `test/consent.test.js` | No global bleed |
| A-15 | Pending queue write/list/remove | `test/pending.test.js` | Isolated files |
| A-16 | Transcript drops tool payloads | `test/transcript.test.js` | User/assistant text only |
| A-17 | Phase 0 gate math (70%, fabrications) | `test/phase0eval.test.js` | Pass/fail thresholds |
| A-18 | Graph writes mermaid | `test/graph.test.js` | `GRAPH.md` created |

### Recommended gap (add if you extend tests)

| ID | Case | Why |
|---|---|---|
| A-19 | CONFLICT when rejected name is **not** in title/why (search-independent scan) | Locks the `listDecisions` conflict path |

---

## 2. Install and plumbing (manual, target = YOUR_APP)

**Setup:**

```text
cd GITIDEA
npm run build

cd YOUR_APP
node <GITIDEA>\bin\ideagit.js init
```

Paste output into `YOUR_APP\.cursor\mcp.json` (Claude Code: `YOUR_APP\.mcp.json`, or the `claude mcp add` line `init` prints). Restart the editor. Open **YOUR_APP** as the workspace.

| ID | Preconditions | Steps | Expected | Result |
|---|---|---|---|---|
| I-01 | Node 20+, build OK | `npm test` in GITIDEA | All automated tests pass | |
| I-02 | Init run **inside YOUR_APP** | Read printed JSON | `args` → `...\GITIDEA\dist\server.js`; `env.IDEAGIT_CWD` → YOUR_APP | |
| I-03 | MCP JSON saved, editor restarted | Open Agent tools | Server `ideagit` connected; three tools visible | |
| I-04 | Wrong-cwd trap | After I-05, inspect disks | New `*.md` only under `YOUR_APP\.decisions\`, not GITIDEA | |
| I-05 | MCP connected, **prompted** | Chat: ask agent to `record_decision` (see seed below) | Tool succeeds; file `YOUR_APP\.decisions\YYYY-MM-DD-*.md` exists | |
| I-06 | Seed from I-05 present | Chat: `check_proposal` proposal `Add Redis for session caching` | `Verdict: CONFLICT`; Redis rejection cited | |
| I-07 | Same seed | Chat: `search_decisions` query `redis sessions` | Record returned with why / rejected | |
| I-08 | I-05 file exists | `node <GITIDEA>\bin\ideagit.js doctor` **cwd = YOUR_APP** | Examines ≥1 decision; no unexpected errors | |
| I-09 | I-05 file exists | `node <GITIDEA>\bin\ideagit.js rules` **cwd = YOUR_APP** | Prints title, Chose, Rejected Redis | |
| I-10 | Consent off | Do **not** run `ideagit consent` | No `.pending` from SessionEnd; no surprise model calls | |

### Seed decision for I-05 / P-* (copy exactly)

Use a **short** rejected name.

- **title:** Keep sessions in Postgres rather than adding Redis  
- **chose:** Session state stays in Postgres  
- **why:** Cannot operate a second datastore  
- **rejected:** `Redis` — operational cost  
- **scope:** glob that exists in YOUR_APP (e.g. `src/**` if you have no `src/session`)

If YOUR_APP has no session code, still use this seed: you are testing **memory**, not your production architecture. Prefer a real constraint from YOUR_APP when you have one (same shape: chose / rejected name / why / scope).

---

## 3. Product behavior (manual — this is the real test)

Log every P-* row in [`USAGE_LOG.md`](USAGE_LOG.md).

**Unprompted definition:** the user message does **not** mention IdeaGit, MCP, `check_proposal`, `search_decisions`, `record_decision`, or `.decisions`.

| ID | Chat | User message (spirit) | Pass if | Fail if | Unprompted? |
|---|---|---|---|---|---|
| P-01 | **New** chat after I-05–I-06 | “Sessions are slow. Add Redis for session caching and implement it.” | Agent calls `check_proposal` or `search_decisions` **without being told**; cites the record; does **not** silently add Redis (asks if constraint changed or proposes something else) | Implements Redis with no tool call | Must be **Y** to count as product pass |
| P-02 | Same as P-01 if P-01 failed | You may retry **one** time with rules pasted (`ideagit rules` → `.cursor/rules`) | Same as P-01 | Still no tool call | Y if you still did not name tools |
| P-03 | New chat | Unrelated: “Fix the typo in the README” | No false CONFLICT; no dump of all decisions | Agent blocks on Redis / dumps the log | Y |
| P-04 | New chat, **prompted** (invalid for unprompted column) | “Call check_proposal for adding Redis for sessions” | CONFLICT | NONE or wrong file | **N** — plumbing only |
| P-05 | After recording a **different** rejection (e.g. GraphQL) | “Add GraphQL to the mobile API” | Conflict on GraphQL, not only Redis | Misses GraphQL | Y preferred |
| P-06 | Cross-domain | Decision rejects Redis **for sessions** only; user: “Add Redis for rate-limit counters in a new service” | Observe: CONFLICT (current behavior, global name match) vs RELATED/NONE if you later add scope-required conflicts | — | Document actual verdict; not a pass/fail of the thesis |

**Product pass (minimum for “one line that matters”):** P-01 = PASS with Unprompted **Y**, Conflict **Y**, Proposal changed **Y**.

**Plumbing-only pass:** I-05 + I-06 + P-04. Does **not** prove the thesis.

---

## 4. Negative and edge cases (manual)

| ID | Setup | Action | Expected |
|---|---|---|---|
| E-01 | `IDEAGIT_CWD` points at GITIDEA, workspace is YOUR_APP | `record_decision` | FAIL this config: file lands in GITIDEA. **Block product tests until I-04 passes.** |
| E-02 | MCP disconnected | P-01 | Agent cannot call tools; do not score as thesis fail — **BLOCKED** |
| E-03 | Empty `.decisions/` in YOUR_APP | `check_proposal` “Add Redis…” | `NONE` (or no matches). Not a conflict. |
| E-04 | Rejected name is a sentence (“we should not add a redis cluster for sessions”) | `check_proposal` “Add Redis” | Likely **NONE** (token `every()`). Confirms “use short names.” |
| E-05 | Superseded Redis decision + new “use Redis” decision | `check_proposal` Add Redis | No conflict with superseded-only reject; status filter is active |
| E-06 | `search_decisions` query `""` | Empty string | No full dump of all records |
| E-07 | Capture: `ideagit consent` then SessionEnd (Claude Code only) | End a session | Fail-open; candidates only in `.pending`; nothing auto-written to `.decisions/*.md` without `review` |
| E-08 | Phase 0 | `ideagit phase0` without real labeled dir | Expected fail/missing dir — not a product pass |

---

## 5. Two-week Phase 1 gate (not one afternoon)

Do not claim Phase 1 from a single Redis plant.

| ID | Gate | Target | Count this run |
|---|---|---|---|
| G-01 | Useful records **in YOUR_APP** | ≥ 10 | |
| G-02 | Unprompted `check_proposal` or `search_decisions` | ≥ 2 sessions | |
| G-03 | Proposal changed because of a record | ≥ 1 | |
| G-04 | GITIDEA’s own `.decisions/` | **Do not count** toward G-01 | — |

---

## 6. Result sheet (copy per run)

**Run ID:** ________  
**Target app:** ________  
**Tester:** ________  

| ID | Result | Notes |
|---|---|---|
| A-01 | | |
| I-01 | | |
| I-02 | | |
| I-03 | | |
| I-04 | | |
| I-05 | | |
| I-06 | | |
| I-07 | | |
| P-01 | | |
| P-04 | | |

**USAGE_LOG line (required after P-01):**

```markdown
| YYYY-MM-DD | app-name | Add Redis for session caching | Y/N | tool or (none) | Y/N | Y/N | one sentence what the agent did |
```

---

## 7. Execution order (do not skip)

1. A-01 (`npm test`)  
2. I-02 → I-03 → I-05 → I-04 → I-06 (prompted smoke)  
3. **New chat** P-01 (unprompted)  
4. Write [`USAGE_LOG.md`](USAGE_LOG.md) with a **non-placeholder** row  
5. Only then P-03, E-*, G-*  

If you stop after step 2, you have tested **MCP wiring**, not IdeaGit as a product.
