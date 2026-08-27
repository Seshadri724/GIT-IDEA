---
id: 2026-08-27-three-tool-mcp-surface-with-proposal-checker
title: Add check_proposal as the third and final MCP tool
status: active
date: '2026-08-27'
scope:
  - src/server.ts
  - src/proposal.ts
tags:
  - mcp
  - api-design
  - enforcement
supersedes:
  - 2026-08-16-two-tool-mcp-surface-over-multi-tool-api
superseded_by: null
---
## Chose

Expose exactly three MCP tools: `record_decision`, `search_decisions`, and `check_proposal`.

## Rejected

- **Fourth tool (get_decision, list_decisions, delete_decision)** — Agents can already read and edit local files directly; additional CRUD tools dilute context and increase tool-selection errors.
- **Pre-commit / Git Hook Monkeypatching** — Too intrusive and blocks developers after code has already been generated.

## Why

Agents treat voluntary search instructions as suggestions and often fail to search before proposing changes. `check_proposal` gives an explicit verification tool that scans rejected alternatives and outputs a hard `CONFLICT` or `RELATED` verdict without requiring the agent to synthesize search results.

## What would change our mind

If MCP client protocols introduce a standardized pre-generation verification hook that makes custom proposal tools redundant.
