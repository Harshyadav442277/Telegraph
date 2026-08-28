# PREFLIGHT public update drafts

These are truthful, operator-reviewed drafts for public development updates.
They are not posted automatically and contain no fabricated scores, traffic,
uptime, or registration claims.

## Protocol verification — 2026-08-28

PREFLIGHT verified the current Telegraph hackathon rules, supported intents,
Miner YAML reference, registration documentation, and live devnode catalogue.
`SSL_VERIFICATION` is currently a canonical deterministic Intent with four
active Miners in the live catalogue. The public supported-intents page and
live API report different total Intent counts, so that discrepancy is recorded
explicitly instead of being silently normalized.

## Engineering update — 2026-08-28

The Miner now has a native Node TLS engine, deterministic dual-stack address
selection, SNI-preserving validated-IP connections, certificate/trust/
hostname/time classification, SSRF protections, bounded timeouts, structured
request logs, local TLS fixtures, and a fixture-tested Telegraph adapter.
The current SSL response shape is an observed compatibility profile, not a
claim that the hidden Canonical WASM schema is public.

## Current status

Local typecheck, lint, unit/integration tests, benchmark, config validation,
production build, and Docker smoke tests pass. Public deployment and
on-chain registration are still operator-gated: this workspace has no
authorized persistent hosting provider path and no wallet authorization. No
score or Explorer visibility is claimed until those steps occur.
