---
id: 2026-08-16-node-native-test-runner-over-jest-vitest
title: Use Node.js built-in test runner instead of Jest or Vitest
status: active
date: '2026-08-16'
scope:
  - test/**
  - package.json
tags:
  - testing
  - tooling
  - dependencies
supersedes: []
superseded_by: null
---
## Chose

`node:test` and `node:assert/strict` executed via `node --test`.

## Rejected

- **Jest** — Heavyweight dependency with complex ESM transform configuration and slow startup.
- **Vitest** — Adds Vite bundling dependencies to a lightweight CLI/MCP package.

## Why

Node 20+ has a fast, zero-dependency built-in test runner supporting native TypeScript output.

## What would change our mind

If browser-based UI components or complex snapshot tooling are introduced.
