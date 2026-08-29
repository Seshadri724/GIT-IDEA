---
id: 2026-08-16-per-repo-opt-in-consent-over-global-auto-capture
title: Store auto-capture consent per repository in user home directory
status: active
date: '2026-08-16'
scope:
  - src/consent.ts
  - bin/ideagit.js
tags:
  - privacy
  - consent
  - security
supersedes: []
superseded_by: null
---
## Chose

Per-repository opt-in consent saved at `~/.ideagit/consent.json`.

## Rejected

- **Global Opt-in** — Exposes private client/work repositories if user enabled capture for personal playground repos.
- **In-repo .ideagit-consent file** — Commits consent state to git, exposing team members who did not consent to transcript extraction.

## Why

Consent must be explicit per-repository and strictly local to the developer's machine.

## What would change our mind

If an enterprise centralized consent policy mechanism is requested by teams.
