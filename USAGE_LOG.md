# IdeaGit Real-World Usage Log

Use this log to track live usage of IdeaGit across real repository sessions over a two-week period.

## The Phase 1 Validation Gate
To pass Phase 1 (proving retrieval changes agent behavior in a real repo):
- **Target**: 10 useful decision records in a live project repository.
- **Unprompted checks**: At least 2 sessions where the agent ran `check_proposal` or `search_decisions` unprompted.
- **Changed proposal**: At least 1 session where an agent changed its proposal due to a recorded decision.

---

## Log Entries

| Date | Repository | Proposed Change | Unprompted Check? (Y/N) | Tool Called | Conflict Detected? (Y/N) | Proposal Changed? (Y/N) | Details & Outcome |
|---|---|---|---|---|---|---|---|
| *YYYY-MM-DD* | *app-name* | *e.g. Add Redis for caching* | *Y* | *check_proposal* | *Y* | *Y* | *Agent caught prior rejection and proposed SQLite unlogged table instead.* |

---

## Guidelines for Recording
1. **Concise Rejected Names**: When recording decisions via `record_decision`, keep rejected alternative names concise (e.g. `Redis`, `GraphQL`, `Prisma`, `Tailwind`) rather than full sentences, so token matching is reliable.
2. **Track Honesty**: Only log "Y" for unprompted check if the agent called `check_proposal` or `search_decisions` without being explicitly prompted in that chat turn.
