# M00.06 Baseline SLO worksheet and metrics catalog

**Worksheet status** PROPOSED TARGETS. **Measurements** NOT_MEASURED. **Runtime execution** BLOCKED pending runnable slices and a recorded representative environment. Input workload estimates are hypotheses. G-11 owns target/workload approval, and technical execution follows the applicable work item and release gates. [Master §16.6](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md#166-nonfunctional-baseline-and-targets) · [Workload profiles](PLANNING_EVIDENCE.md#workload-profiles)

## Target and observation worksheet

| ID | Indicator | Master pilot candidate | Measurement boundary and conditions | Observation |
|---|---|---|---|---|
| SLO-01 | Application availability | 99.5% monthly | Eligible successful probe windows / eligible windows for agreed critical journeys × 100. Use a reviewed sampling interval, explicit successful outcomes and an outage ledger. Exclude only documented approved planned downtime; classify missing telemetry separately. | NOT_MEASURED |
| SLO-02 | p95 authenticated read | <500 ms | Measure first-party authenticated read time by endpoint and tenant fixture during L01; disclose third-party time separately. Publish sample counts, rate, exclusions, timeouts and failures. | NOT_MEASURED |
| SLO-03 | p95 critical transaction API | <1.5 s | Measure first-party critical transaction times by command and result during L01/L03 under recorded load. Separate external provider spans and also retain client-observed elapsed time. Do not hide timeouts or conflicts as latency successes. | NOT_MEASURED |
| SLO-04 | Hot SKU transaction correctness | 50 concurrent contenders | L02 with one available unit. Compare scoped ledger and hold/commit records; require no oversell, double effect or cross-scope write. This is a contention check, not a capacity or throughput target. | NOT_MEASURED |
| SLO-05 | Worker eventual delivery | ≤60 s in normal queue conditions | Measure eligible committed outbox timestamp → first durable processing/effect or required delivery acknowledgement by event type. Record pending/unprocessed age and DLQ alongside latency. Measure degraded queues separately; notification delivery can vary. | NOT_MEASURED |
| SLO-06 | Pilot RPO | 24 h, drill required | In an isolated drill, compare disruption cutoff to the latest consistent recovery timestamp for DB, ownership and private object records. Evidence includes recovery point and reconciliation. | NOT_MEASURED |
| SLO-07 | Pilot RTO | 24 h, drill required | In the same drill, record disruption/drill start to validated service ready after restore, access controls, reconciliation and smoke tests. Paid targets require separate approval based on tolerable loss and hosting. | NOT_MEASURED |
| SLO-08 | Helpdesk response | UNSET | First substantive scoped staff response after accepted ticket in an agreed service window. Record coverage/calendar, response counts and missing responses independently of application uptime. | NOT_MEASURED |

A report may fill a qualified worksheet observation only from a completed measurement window tied to the indicator, configuration, evidence and sample count. Preserve partial or failed run results in the diagnostic record with their actual status and limitations. They cannot establish a target as met. A benchmark window cannot prove monthly availability, and a configured backup schedule cannot prove RPO/RTO. Treat p95, latency, queue delay and security/correctness outcomes as separate dimensions. Never infer projected production SLA, costs or capacity from the worksheet or synthetic model.

## Metrics catalog

Use UTC timestamps and aligned intervals for engineering windows. Include a tenant-safe cohort and endpoint/operation class, bounded outcome labels, release/environment and relevant queue type. Keep distinct stages and units. For tenant/branch diagnosis use access-controlled records and correlation IDs, avoiding raw PII, credential or high-cardinality identifiers in common metric labels.

| Metric | Unit and aggregation grain | Source and reconciliation | Evidence owner |
|---|---|---|---|
| Application probe | Successful/eligible probe windows by journey and approved calendar | Synthetic probes and incident/planned downtime log | Platform |
| HTTP and provider latency | ms histogram and p50/p95 plus N by endpoint, result, operation and cohort; provider elapsed separately | HTTP spans and load driver totals; report end-to-end alongside first-party time | API and Platform |
| Request volume and failures | requests/sec and counts by result class, including conflict, timeout, denied and 5xx | Driver log matched to server request/correlation IDs | QA and Platform |
| DB connection and contention | active/waiting pool slots, slow-query and lock-wait ms by scoped operation | PostgreSQL/pool metrics and representative query plans | Data Engineering |
| Queue depth, age, processing and DLQ | messages, seconds and retries by queue/result; oldest pending and completed event timelines | Outbox/inbox and queue state, reconciled against committed business effects | Platform |
| Inventory and PO integrity | count of oversell, hold leaks, duplicate issues and receipt variance per run; decimal quantity for scoped details | Ledger, reservations, order/receipt and quarantined disposition history | Inventory/Procurement |
| Payment and settlement integrity | count of duplicate effects, unmatched/late events and reconciliation exceptions; scoped integer minor-unit balances | Verified provider or manual evidence, capture, allocation, settlement and refund journals | Finance Operations |
| Provider and webhook health | error, deferred/rejected/duplicate and processed counts by event/rail and environment | Ingress adapter decisions, verified account scope and reconciliation queue | Integrations/Security |
| Projection and export freshness | seconds from committed version to visible projection; scoped row counts | Owner state vs business views, cache and authorized export snapshots | Domain QA |
| Overall isolation and revocation | count of unauthorized outcomes and successful revocation/denial per path | Controlled adversarial test evidence and redacted policy/audit records | Security |
| Onboarding completion/abandon | count and rate by synthetic stage/cohort and defined activity window | Scoped audit or test timeline, no inference to merchant behavior | Product/QA |
| Usage and billing variance | difference between distinct eligible order keys and posted usage/charge observations | Usage journal, versioned rule and billing source references | SaaS Billing/Finance |
| Restore and continuity | h or min per tested drill, plus verified restored object/ledger counts | Approved recovery markers, checkpoint, integrity and access checks | Data Recovery/Security |
| Helpdesk response | first qualified response interval and count per service window | Scoped ticket records with approved staffed window and escalation | Support Operations |

Alert thresholds and operational coverage must be set from reviewed pilot and recovery evidence. UI checks use the master accessibility and responsive targets under approved test locales and input methods. They do not certify accessibility compliance. [Operational staffing](TEST_SUITE_MAP.md#operational-staffing)
