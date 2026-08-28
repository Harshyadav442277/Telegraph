# Operations

## Local run

```bash
npm ci
cp .env.example .env
npm run typecheck && npm run lint && npm test && npm run build
npm run dev
curl 'http://127.0.0.1:3000/ssl-check?domain=example.com'
```

`/health` and `/ready` are unauthenticated liveness/readiness endpoints.
Normal certificate failures and unreachable targets are successful HTTP
requests with a negative JSON verdict.

## Deployment

Use a persistent Node 22 host (Railway, Render, Fly.io, or a small VM). Set
`HOST=0.0.0.0`, keep `ALLOW_PRIVATE_TARGETS=false`, expose port 3000 through
the host's HTTPS reverse proxy, and configure the platform health check as
`GET /health`. Do not use a short-lived serverless function for the Miner:
DNS and TCP/TLS operations need predictable execution time and a warm process.

The hosted YAML must be stable and publicly readable. Before registration,
replace `base_url` in `telegraph/miner.yaml` with the public HTTPS base URL,
run `npm run validate:config`, and compute the SHA-256 hash of the exact bytes
that will be hosted.

## Registration safety

`scripts/register-miner.sh` prints the exact `cast send` command and refuses
to submit it unless `EXECUTE_ONCHAIN=YES` is explicitly set. Registration
requires Base Sepolia gas and a wallet private key. No key is stored in this
repository.

## Incident checklist

1. Check `/health` and `/ready`.
2. Inspect structured logs by `requestId`.
3. Re-run the same `domain` with `npm run benchmark -- --case ...` or curl.
4. Check DNS, egress, connection latency, and whether the target changed its
   certificate.
5. Never relax SSRF blocking in production to work around a target-specific
   issue. Use `ALLOW_PRIVATE_TARGETS=true` only for isolated local tests.
