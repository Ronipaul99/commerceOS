# M00.06 Planning evidence

**Evidence class** HYPOTHESIS. All volumes, organizations, planned rates and scenario windows describe synthetic inputs. No market segment, provider, real customer, operating hours, or performance measurement is inferred. External validation is PENDING. [Design](DESIGN.md) · [UAT suite map](TEST_SUITE_MAP.md)

## Two-tenant fixture plan

| Fixture | Branch and channel shape | Planned dataset | Negative checks |
|---|---|---|---|
| Tenant A | A1 with one stock location, manual/POS and a scenario-specific manual social session | 2,000 stock-tracked SKUs and 3,000 orders in seeded history. Independent last-unit SKU alias. No non-stock seed or request descriptors. | Try accessing Tenant B's same SKU alias and its order/payment/file records. Deny without changing either tenant. |
| Tenant B | B1 and B2, one stock location each, manual/social channels and branch-limited roles | 18,000 stock-tracked SKUs and 42,000 orders in seeded history. Include 24 disabled non-stock request descriptors outside stock and history. | Under B1 grant, deny B2 reads/commands and Tenant A records. Deny non-stock fulfillment before a hold, order line, stock movement, payment or invoice is created. |

Use stable pseudonymous references, deterministic UTC fixture timestamps and separate tenant/branch/location keys. Generate data from a fixed seed and pin the generator revision once a runnable fixture loader exists. Reused display IDs and SKU aliases do not share underlying rows. Import and negative descriptors belong to separate per-scenario resets. Isolate the one-unit stock fixture from general order generation. Use symbolic minor-unit amounts and test policy contexts with no real currency, period, fees or provider implied.

## Workload profiles

These are proposed input shapes that a load generator can schedule. A successful run must record actual submitted and completed rates, failed operations, material deviations, qualified request/commit counts and scoped evidence. Input volumes are independent of acceptance thresholds.

| Profile | Planned input | Evidence and invariant to check |
|---|---|---|
| L01 Seed and steady mix | Reset to pinned tenant seed. Warm up for 5 minutes, then drive 40 requests/sec for 15 minutes, split A 12 and B 28. Request mix is 60% authenticated reads, 25% critical writes and 15% other approved API calls at each tenant. The scheduled aggregate is 36,000 requests in the measurement window. | Per-tenant/endpoint latency and errors, achieved rate and resource use. Repeat three times from controlled resets with recorded seeds and configuration. |
| L02 Hot SKU | From a separate reset, simultaneously submit 50 eligible reservation attempts for one available unit at a single tenant/location. Run independently in A and B1 while the peer tenant keeps an independent same-alias stock position. | Exactly one owner commit in each independent run with no negative stock or peer mutation, and a stable current scoped denial for losing requests. Record contention, waiter time and conflict/timeout counts. |
| L03 Order replay | Submit 100 unique eligible order commands with adequate separate stock, 20 identical retries and five changed-payload requests reusing accepted keys, for 125 attempts. | 100 accepted unique order effects under success preconditions, one effect per source and no writes from conflicting reuse. Compare committed stock, order, outbox and payment authority. |
| L04 Bulk and degraded read | Separately import 10,000 synthetic rows under a reviewed resource budget, export a branch-limited report, and run a popular-SKU read profile with cache delay and cold cache. | Reconcile staged vs posted rows and scope, output size, query plans, lock/IO budgets and read freshness. Compare with a warmed replay without masking timeouts. |
| L05 Queue and provider burst | Deliver 120 verified-shaped stub events over 30 seconds, ten exact replays, then pause/resume the worker within a controlled recovery exercise. Use independent B/A keys and a verified conflict fixture. | Backlog depth and age, dedupe, DLQ and normal-baseline recovery; one financial effect per eligible source, no stale downgrade, and outcomes visible to the correct roles. |
| L06 Fairness and restore | Observe B traffic during A's hotspot separately from the isolated hot-SKU run. Restore a consistent DB/object recovery checkpoint into an isolated destination and reconcile after authorized queue re-drive. | Per-tenant achieved rate/error/latency, RPO/RTO timestamps, stock and money ledger and private object access. Capacity and recovery remain unmeasured until these runs execute. |

### Environment record

Use an authorized, isolated, disposable integration or performance environment with the candidate deployment topology, PostgreSQL and Redis/queue configuration, private object storage, synthetic fixtures and stub/sandbox integrations. Record source/lockfile and migration revisions, test and driver versions, CPU/RAM/limits, instance counts, network/region, pool sizes, index/DB settings, queue and worker concurrency, cache state, storage/backup configuration, clock synchronization, seed and run window. Collect starting and ending checksums for tenant fixtures and scoped ledger counts, plus complete logs/traces and results. Compare cold/warm and normal/degraded runs as separate cohorts. Keep provider time and apparent saturation visible.

Local code inspection shows API and worker scaffolds. Representative environment, live slices, approved load topology and reviewed thresholds are absent from this work item. No runtime environment or tools are provisioned here. Approval of any tool adoption follows G-18, with G-11 governing readiness and capacity. [SLO worksheet](SLO_WORKSHEET.md)

## Retry and failure matrix

| ID | Injected condition | Guard and expected authoritative outcome | Evidence |
|---|---|---|---|
| RT-01 | Identical order request repeated after response loss | Scoped request hash and effect key return the prior result, with one order, commitment and outbox write. Reauthorize before replay. | Order/history, stock, idempotency and outbox counters |
| RT-02 | Different payload under an accepted key | Conflict without order or stock change. Reconcile or use a new authorized command. | Error class and ledger checksum |
| RT-03 | Last-unit race, late expiry or cancel versus dispatch | Tenant-position lock, hold version and per-line coverage preserve one eligible effect. Consumed hold stays consumed. | Stock/hold history, winner and loser counts; lock waits |
| RT-04 | Duplicate verified payment event, late failure or mismatched event | Verified account, operation and scope bind one posting. Late/conflicting evidence proceeds to reconciliation. Delivery never establishes settlement. | Verified collection, allocation, settlement, inbox and case IDs |
| RT-05 | Worker restart, stale job or exhausted retries | Authenticate stored context and dedupe business operation. Apply bounded retries and DLQ, re-drive with original ID under operator authorization. | Outbox/job age, retry count, DLQ and scoped effects |
| RT-06 | Duplicate partial receipt, damaged return or partial refund | One idempotent accepted effect, quantities and eligible refund bounds, no sellable restock from damage and no duplicate refund. | Receipt/return and stock/money journals |
| RT-07 | Cross-tenant IDs, ungranted branch or disabled non-stock request | Deny prior to effects. Versions and scoped balances stay unchanged. | Both tenant snapshots, tolerated non-disclosing response |
| RT-08 | Restore with a queued duplicate and revoked credential | Reconcile DB/object checkpoint and replay ledger, validate revocation, then authorize exact re-drive. | Recovery timestamps, scoped checksums, queue and audit evidence |

## Validation gaps

| ID | Segment or evidence gap | State | Owner and route |
|---|---|---|---|
| GAP-01 | Non-stock, services and merchant recurring services | UNVALIDATED | Product/Architecture, G-02/G-15. This fixture exercises rejection only. |
| GAP-02 | Manufacturing, bundles, wholesale, regulated or lot/serial workflows | UNVALIDATED | Product and domain/legal, G-02/G-15. Requires capability-specific models and fixtures. |
| GAP-03 | Other jurisdictions, regulated/tax and multi-currency paths | UNVALIDATED | Product, Finance/Legal and Architecture, G-06/G-17 and separate FX scope. |
| GAP-04 | External checkout and marketplace transaction models | UNVALIDATED | Architecture/Security/Product, G-09/RG7 where applicable. Native storefront is future scope. |
| GAP-05 | Real merchant usability, segment fit and operating patterns | PENDING | Product/Research and QA, G-16. Internal synthetic UAT leaves external validation pending. |
| GAP-06 | Scale shape, capacity, failover, costs and support coverage beyond sandbox | UNVALIDATED | Platform/Product and Operations, G-11/RG5. Require operational measurements and staffing evidence. |

## Structured model fixtures

~~~json
{
  "provenance": "HYPOTHESIS",
  "external_validation": "PENDING",
  "tenants": [
    {"id": "A", "branches": ["A1"], "channels": ["MANUAL", "POS"], "stock_skus": 2000, "history_orders": 3000, "non_stock_disabled_probes": 0},
    {"id": "B", "branches": ["B1", "B2"], "channels": ["MANUAL", "SOCIAL"], "stock_skus": 18000, "history_orders": 42000, "non_stock_disabled_probes": 24}
  ],
  "stock_positions": [["A", "A1", "SHARED-SKU", "1"], ["B", "B1", "SHARED-SKU", "1"], ["B", "B2", "SHARED-SKU", "2"]],
  "steady": {"warmup_minutes": 5, "measure_minutes": 15, "repetitions": 3, "aggregate_rps": 40, "tenant_rps": {"A": 12, "B": 28}, "mix_percent": [60, 25, 15], "scheduled_requests": 36000},
  "contention": {"attempts": 50, "winning_holds": 1},
  "order_replay": {"unique_orders": 100, "exact_retries": 20, "changed_retries": 5, "attempts": 125},
  "import_rows": 10000,
  "queue": {"unique": 120, "replays": 10, "burst_seconds": 30},
  "money": {"order_due": 120000, "verified_advance": 45000, "remaining_due": 75000, "settled_without_evidence": 0}
}
~~~

**Review record** Pending. QA, Product, Platform, Security, Architecture and Operations review fixture isolation, scenario coverage, metrics and staffing. RG0 approval remains separate. [M00.05 verification](../M00.05/VERIFICATION.md)
