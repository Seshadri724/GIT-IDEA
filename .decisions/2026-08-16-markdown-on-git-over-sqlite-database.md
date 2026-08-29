---
id: 2026-08-16-markdown-on-git-over-sqlite-database
title: Store decision records as local Markdown files in Git rather than a database
status: active
date: '2026-08-16'
scope:
  - src/store.ts
  - .decisions/**
tags:
  - storage
  - architecture
  - git
supersedes: []
superseded_by: null
---
## Chose

Plain Markdown files with YAML frontmatter committed directly into the target repo's `.decisions/` folder.

## Rejected

- **SQLite** — Requires binary file committed to Git, opaque diffs, and merge conflict nightmare across branches.
- **Hosted PostgreSQL / DynamoDB** — Destroys local-first privacy, introduces server and infrastructure costs, and requires network access and account management.

## Why

Markdown files in Git are human-readable without the tool, version-controlled with PRs, diffable in code reviews, and vendor-neutral.

## What would change our mind

If decision volume exceeds ~5,000 files in a single repo causing measurable Git indexing or directory read slowdowns.
