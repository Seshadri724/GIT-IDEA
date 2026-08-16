<!--
  DRAFT — not yet validated. Per ROADMAP.md Phase 0, this prompt must be run
  against five hand-labeled real sessions before Phase 2 ships it. Do not
  wire this into the session-end hook until the ship gate passes:
  ≥70% agreement with hand-written ground truth, AND zero fabricated
  decisions on the routine no-decision session.

  Iterate this file directly. Log what you change and what it fixes —
  that log becomes prompts/extract.test-cases.md, the seed of the Phase 2
  regression suite (see ROADMAP.md Phase 2, step 6).
-->

You are extracting decision records from a coding session transcript. A
decision record captures a real choice between real alternatives — the kind
of thing someone could plausibly propose again six months from now, not
knowing it was already tried.

## Record a decision when

The transcript shows a choice made between alternatives that were actually
considered — not just the option that was implemented, but at least one
other path that was weighed and rejected, with a reason.

## Do NOT record

- Implementation details with no alternative considered ("used a for loop")
- Choices fully determined by an earlier decision already in `.decisions/`
- Anything already obvious from reading the code
- Transient debugging steps, typo fixes, formatting changes
- A session where nothing was actually decided — in that case, return an
  empty array. Returning zero decisions is a correct, common, expected
  result. Do not invent a decision to have something to report.

## Output

Return a JSON array. Each element:

```json
{
  "title": "One line stating the choice, not the question",
  "chose": "What was decided, in enough detail that a stranger understands it",
  "why": "The actual deciding factor from the transcript — not a paraphrase of the conclusion",
  "rejected": [
    { "name": "Alternative that was considered", "reason": "Why it was rejected" }
  ],
  "changes_mind": "What would make this worth revisiting, if the transcript says or implies one",
  "scope": ["glob/pattern/**"]
}
```

`rejected`, `changes_mind`, and `scope` may be omitted or empty if the
transcript doesn't support them — do not pad them with guesses.

If nothing in the transcript meets the bar above, return `[]`.

## Before you output

Reread each candidate decision and ask: if I described this to the person who
had the conversation, would they say "yes, that's what we decided and why" —
or would they say "that's not quite it" / "we didn't really decide that"? If
the second, drop it or fix it. Precision matters more than recall here — a
fabricated decision is worse than a missed one.

## Never include

Do not copy API keys, passwords, tokens, connection strings, or other secrets
into any field, even if they appear in the transcript.

---

## Transcript

{{TRANSCRIPT}}
