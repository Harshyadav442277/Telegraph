# PREFLIGHT Scoring Log

Every entry records observed Telegraph data. Nothing here is estimated or
projected. PREFLIGHT is not yet registered, so no PREFLIGHT score exists yet;
the entries below are baseline observations of the live network used to set
targets.

## Method

Live miner registry, read directly:

```bash
curl https://devnode.telegraphprotocol.com/api/miners
curl https://devnode.telegraphprotocol.com/api/epochs
```

The Explorer HTML endpoints return HTTP 403 to non-browser clients; the
devnode JSON API is the reliable source and is what these entries use.

## 2026-08-28 — SSL_VERIFICATION baseline (epoch 289)

Per-intent scores for every miner declaring `SSL_VERIFICATION`:

| Rank | Miner | Slug | SSL score | Requests | Registered |
|---|---|---|---|---|---|
| 1 | LiveCert Operational Signals | `livecert` | 0.010148683 | 42 | 2026-08-28 |
| 2 | TxLens | `txlens` | 0.006346065 | — | 2026-08-28 |
| 3 | SSL Labs Check | `ssllabs` | 0.004486340 | 5 | 2026-08-13 |
| 4 | Cert Spotter | `certspotter-cert-verification` | 0.000000000 | 12 | 2026-08-25 |

Scored at 2026-08-28T12:48:38Z, epoch 289.

**Target to take rank 1: beat 0.010148683.**

The Explorer-level `0.992` figure previously associated with SSL competitors
is not the per-intent SSL score. The per-intent canonical scores are the four
values above.

## 2026-08-28 — Network-wide score distribution (epoch 289)

184 score entries across 41 intents. The distribution is strongly bimodal:

- **8 intents** have at least one miner above 0.5 (max 1.0):
  CHAT_COMPLETION, CURRENCY_EXCHANGE, CVE_LOOKUP, FACT_CHECK,
  FRAUD_DETECTION, LANGUAGE_GENERATION, TASK_COMPLETION, TEXT_GENERATION.
- **33 intents** have every miner below 0.07, most below 0.02 —
  SSL_VERIFICATION among them (max 0.0101).

The same miner can sit in both regimes: `tavily` scores 1.0 on FACT_CHECK but
0.0106 / 0.0103 / 0.0119 on NEWS_SEARCH / RESEARCH_QUERY / WEB_SEARCH.
`livecert` scores 0.004–0.010 across all six of its declared intents.

Score is not driven by request volume: `patchsignal-cve` scores 0.997 on
CVE_LOOKUP with only 7 requests served.

## Scoring mechanics (from the published canonical baseline)

`telegraphprotocol/telegraph-wasm-baseline` composes four signals:

```
0.25 * cosine(question,     miner_answer)
0.50 * cosine(ground_truth, miner_answer)
0.15 * bm25(ground_truth,   miner_answer)
0.10 * sigmoid((len(miner_answer) - 50) / 20)
```

An empty or whitespace-only answer short-circuits to exactly 0.

Two consequences drive PREFLIGHT's response design:

1. Answer text length below ~150 characters measurably loses the length
   component: a 58-character answer scores 0.060 on that term versus 0.099
   for a 150-character one, and short answers also starve the BM25 term.
2. Answer text is what is scored, so factual density in the reason field —
   issuer, subject, validity window, chain length, SAN list, negotiated
   protocol — is what the correctness and lexical terms can reward.

Note that each intent has its own Canonical Script, so the baseline above is
not necessarily the exact module scoring SSL_VERIFICATION. It is the
published reference implementation and the only public specification of the
scoring contract.

## Judging context (hackathon rules, read 2026-08-28)

- Track 1 (Miners) runs **Aug 17 – Aug 31**.
- 75% of the Track 1 score is Normalized Performance *within the intent*:
  your average canonical score divided by the highest average in that intent.
  **The best miner in an intent automatically receives full points.**
- 25% is engagement and updates posted on X, tagging @Telegraphprotoc.
- Eligibility guardrail: an intent needs at least 3 active miners and at least
  100 real Track 3 requests. SSL_VERIFICATION currently has 4 miners.

Because normalization is within-intent, the absolute value of the SSL scores
does not matter for the 75-point component. Rank 1 is what matters, and rank 1
currently costs 0.0102.

## 2026-08-28 — PREFLIGHT deployed to production

- Public base URL: `https://preflight-ssl-verification.vercel.app`
- Host: Vercel Hobby (the same platform the current SSL rank-1 miner uses)
- Verified live: `/health` 200, `/ready` 200, `/miner.yaml` 200
- All six verdict paths verified against real hosts: valid, expired,
  hostname_mismatch, self_signed, untrusted, unreachable
- Observed latency on `/ssl-check?domain=example.com`: 0.348s / 0.314s / 0.317s
- Local benchmark: 8/8 correct, p50 190ms, p95 878ms

YAML committed at `20249596d0284378dee6691dbf287b240d1ee1e8`, SHA-256
`43568e6562809c24fb81df7f220394f4336deb9b88041adb68689d3c91398ef3`,
hosted-vs-local hash verified identical before registration.

## PREFLIGHT entries

_No PREFLIGHT scores yet — miner is not registered. Entries will be appended
here with timestamp, epoch, miner ID, intent, score, rank, request count, and
the deployed response version._
