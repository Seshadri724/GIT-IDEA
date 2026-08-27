---
id: 2026-08-16-two-tool-mcp-surface-over-multi-tool-api
title: Limit MCP tool surface to record_decision and search_decisions
status: superseded
date: '2026-08-16'
scope:
  - src/server.ts
tags:
  - mcp
  - api-design
  - agent-interface
supersedes: []
superseded_by: 2026-08-27-three-tool-mcp-surface-with-proposal-checker
---
## Chose

Expose exactly two MCP tools (`record_decision` and `search_decisions`).

## Rejected

- **CRUD Suite (get_decision, list_decisions, delete_decision, update_decision)** — Wastes agent tool context budget and token usage; agents can already read and edit `.decisions/*.md` files directly.

## Why

A minimal two-tool interface maximizes agent compliance and avoids context-window dilution.

## What would change our mind

If major MCP clients introduce strict file-system sandboxing that prevents agents from reading `.decisions/*.md` files directly.
