---
id: 2026-08-16-human-review-gate-for-candidates
title: Require explicit human review before candidates become decision records
status: active
date: '2026-08-16'
scope:
  - src/pending.ts
  - bin/ideagit.js
  - hooks/session-end.js
tags:
  - trust-model
  - review
  - extraction
supersedes: []
superseded_by: null
---
## Chose

Queue machine-extracted decisions in `.decisions/.pending/*.json` for review via `ideagit review`, never writing directly to `.decisions/*.md`.

## Rejected

- **Direct Auto-Commit** — Pollutes git history and repository memory with low-quality, hallucinated, or routine implementation notes.

## Why

Machine extraction has false positives and imperfect phrasing. The trust model requires that developers explicitly verify what becomes permanent project memory.

## What would change our mind

If extraction precision on real-world sessions reaches >98% with zero hallucinations across 100+ multi-turn sessions.
