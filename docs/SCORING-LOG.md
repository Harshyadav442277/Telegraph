# Scoring log

Only observed Telegraph receipts or Explorer/API values belong here. No score
is fabricated.

| Version | Timestamp  | Change                                                | Hypothesis                                    | Before | After | Requests | Effect     | Conclusion                |
| ------- | ---------- | ----------------------------------------------------- | --------------------------------------------- | -----: | ----: | -------: | ---------- | ------------------------- |
| 0.1.0   | 2026-08-28 | Initial implementation; no PREFLIGHT registration yet | Establish a deterministic native TLS baseline |      — |     — |        0 | Not scored | Pending live registration |

## Pre-registration observations

On 2026-08-27, the live `/api/miners` endpoint exposed four active
`SSL_VERIFICATION` Miners. Its per-Intent `scores` values were approximately
0.0097, 0.0065, 0.0050, and 0 for epoch 287. The project brief's Explorer-level
~0.992 figure is therefore not copied into this log as a score for SSL. The
actual interpretation of these two displays must be established from live
receipts after PREFLIGHT is registered.

Future experiments must change one output/config dimension at a time and add
the corresponding request count and receipt evidence here.
