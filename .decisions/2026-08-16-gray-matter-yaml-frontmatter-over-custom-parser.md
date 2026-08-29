---
id: 2026-08-16-gray-matter-yaml-frontmatter-over-custom-parser
title: Use gray-matter YAML frontmatter for decision metadata
status: active
date: '2026-08-16'
scope:
  - src/store.ts
tags:
  - serialization
  - markdown
  - schema
supersedes: []
superseded_by: null
---
## Chose

`gray-matter` for parsing and serializing YAML frontmatter headers on markdown files.

## Rejected

- **Custom Ad-Hoc Key-Value Parser** — Prone to edge cases with multi-line lists, strings containing colons, and escaping.
- **Pure JSON files** — Unfriendly to human editing and markdown rendering in GitHub/GitLab.

## Why

Frontmatter is the industry standard for metadata in Markdown (used by Jekyll, Astro, Obsidian, Hugo).

## What would change our mind

If a zero-dependency frontmatter parser is needed for distribution size optimization.
