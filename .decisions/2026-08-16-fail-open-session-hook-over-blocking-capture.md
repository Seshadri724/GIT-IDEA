---
id: 2026-08-16-fail-open-session-hook-over-blocking-capture
title: Implement fail-open error handling for SessionEnd hooks
status: active
date: '2026-08-16'
scope:
  - hooks/session-end.js
  - src/extract.ts
tags:
  - hooks
  - reliability
  - ux
supersedes: []
superseded_by: null
---
## Chose

SessionEnd hooks and extraction wrappers catch all errors, log to `.decisions/.pending/errors.log`, and return empty arrays or exit 0.

## Rejected

- **Fail-closed / Blocking Hook** — Halts developer work and crashes CLI sessions whenever extraction fails, network times out, or authentication expires.

## Why

Developer workflow disruption is fatal to adoption. An extraction error must never disrupt an active terminal session.

## What would change our mind

Never. Non-blocking fail-open behavior is a non-negotiable usability requirement.
