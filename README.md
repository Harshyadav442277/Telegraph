# PREFLIGHT

PREFLIGHT is a production-minded Telegraph Miner for the `SSL_VERIFICATION`
Intent. Before an autonomous agent trusts an endpoint, it asks Telegraph.

The current Track 1 deliverable is the live TLS Miner. It performs deterministic
DNS resolution, SNI-aware TLS 1.2/1.3 handshakes, native chain and hostname
verification, certificate time checks, dual-stack fallback, and SSRF blocking.

```bash
npm ci
npm test
npm run build
npm start
curl 'http://127.0.0.1:3000/ssl-check?domain=example.com'
```

Protocol findings and the explicitly isolated SSL schema uncertainty are in
[`docs/TELEGRAPH-INTEGRATION.md`](docs/TELEGRAPH-INTEGRATION.md). The single
registered Intent configuration is [`telegraph/miner.yaml`](telegraph/miner.yaml).

Useful commands:

- `npm run validate:config` — validate the local YAML shape.
- `npm run benchmark` — run the maintained corpus.
- `npm --silent run benchmark:json` — machine-readable benchmark output.
- `scripts/register-miner.sh` — print or explicitly execute registration.
- `scripts/verify-registration.sh` — inspect a registration by ID.
- `scripts/inspect-scoring.sh` — inspect live Miner/Intent score data.

Track 3 Agent Gateway work is intentionally deferred until the Miner is
deployed, registered, stable, and receiving real evaluations.
