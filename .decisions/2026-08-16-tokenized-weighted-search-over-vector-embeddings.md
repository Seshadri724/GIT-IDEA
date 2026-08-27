---
id: 2026-08-16-tokenized-weighted-search-over-vector-embeddings
title: Use tokenized weighted substring search rather than vector embeddings
status: active
date: '2026-08-16'
scope:
  - src/search.ts
tags:
  - search
  - retrieval
  - performance
supersedes: []
superseded_by: null
---
## Chose

In-memory tokenized keyword matching with weighted field scoring (title, rejected, tags, why) and relevance ranking.

## Rejected

- **Vector Embeddings / Embedding Models** — Introduces external dependencies (e.g. OpenAI/Ollama), embedding generation latency, vector storage overhead, and non-deterministic fuzzy recall.
- **SQLite FTS5** — Premature optimization for repositories with under 500 decision records.

## Why

In-memory keyword ranking executes in <5ms for hundreds of decisions with zero external dependencies and predictable matching on key terms and rejected technologies.

## What would change our mind

If decision counts exceed 500 records or search latency exceeds 200ms in benchmark testing.
