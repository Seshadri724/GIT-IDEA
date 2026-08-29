---
id: 2026-08-16-prompt-instructions-for-search-enforcement
title: Use MCP system instructions to prompt search before proposal
status: active
date: '2026-08-16'
scope:
  - src/server.ts
tags:
  - prompting
  - mcp
  - agent-behavior
supersedes: []
superseded_by: null
---
## Chose

Embedded MCP server system instructions (`McpServer({ instructions })`) instructing agents to call `search_decisions` prior to proposing structural changes.

## Rejected

- **Client Monkeypatching / Pre-Commit Git Blockers** — Brittle, client-specific, and interrupts developer commit workflows for code already generated.

## Why

MCP instructions provide native context-injection directly into the agent's planning phase across all MCP-compliant clients.

## What would change our mind

If MCP specifications introduce formal pre-generation classifier hooks.
