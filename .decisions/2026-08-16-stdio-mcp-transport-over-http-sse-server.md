---
id: 2026-08-16-stdio-mcp-transport-over-http-sse-server
title: Use stdio transport for MCP server rather than HTTP or Server-Sent Events
status: active
date: '2026-08-16'
scope:
  - src/server.ts
tags:
  - mcp
  - transport
  - protocol
supersedes: []
superseded_by: null
---
## Chose

Standard I/O (`stdio`) via `@modelcontextprotocol/server/stdio`.

## Rejected

- **HTTP / SSE Daemon** — Requires background daemon management, port allocation, firewall configuration, and auth tokens between client and server.

## Why

Stdio provides zero-configuration process lifecycle management tied directly to the agent's lifetime.

## What would change our mind

If web-based or multi-tenant agent architectures require remote MCP endpoints over HTTPS.
