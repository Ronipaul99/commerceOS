# M00.03 planning verification

**Status** PASS_REVIEW_REQUIRED

**Checked** 24 November 2026, Asia/Kolkata

**Approval** The author ran the model and document checks. Product and Architecture review the proposed transitions, and QA reviews the impossible-state checklist. M00.02 acceptance, signed review, RG0 evidence, and external validation are pending.

| Requirement trace | Evidence |
|---|---|
| §6 inventory and procurement | Reservation and PO transitions, last-unit hold, expiry versus conversion and partial receipts. [Design](DESIGN.md#reservation-and-order) · [PO model](DESIGN.md#purchase-order-and-platform-subscription) |
| §8 order, fulfillment, shipment and return | Separate transition tables, partial cancel, dispatch conflict, RTO, receipt and inspection. [Transition catalog](DESIGN.md#3-ownership-and-transition-catalog) |
| §10 merchant payments | Independent allocation, refund, dispute and settlement with event-order and evidence guards. [Payments model](DESIGN.md#payments-and-settlement) |
| §13 platform billing | Separate subscription, dunning and usage predicates. [Model fixtures](PLANNING_EVIDENCE.md#model-fixtures) |

## Actual checks

The PowerShell command below extracts the embedded Python test and runs it against the checked-in-format proposal files from the repository root. These checks execute the documented transition table and fictional data using the Python standard library. They model competing commands by enumerating serial outcomes. Live database concurrency, provider security, and production behavior require runtime verification.

| Check | Actual model result |
|---|---|
| M00.03-C01 | PASS. Work item and sources match the 10 design sections, diagram references and 65 transition rows covering eight domains plus settlement. |
| M00.03-C02 | PASS. One last-unit hold per position, one dispatch, partial cancellation, receipt/inspection, independently reconciled settlement and partial refund. Original confirmed amount remains 10000 and refund leaves 4000 eligible in the fixture. |
| M00.03-C03 | PASS. Exact request replay returns the prior result, altered input and repeated source conflict, and an event gap defers later evidence. Duplicate capture and stale failure do not change verified paid coverage. |
| M00.03-C04 | PASS. Both serializations of cancel versus dispatch and both outcomes of conversion versus expiry preserve one eligible winner. |
| M00.03-C05 | PASS. Two receipts account for 10 gross units, 9 accepted sellable units and 1 quarantined unit. Replay adds nothing and completion requires coverage or authorized short-close. |
| M00.03-C06 | PASS. RTO does not cancel dispatched history or create sellable stock or settlement. Dispute and recovery require verified evidence. |
| M00.03-C07 | PASS. Two package observations and a replay produce one usage entry. Late historical evidence uses the same key after suspension. Billing transitions leave merchant records unchanged in the model. |
| M00.03-C08 | PASS. Verified tenant, branch and permission guards deny unauthorized commands before replay or mutation. An independent tenant can use the same operation and request references. |
| M00.03-C09 | PASS. Three planning deliverables, clean whitespace and 18 valid relative links. |

`git -c core.safecrlf=false diff --check` passed for tracked changes. `git status --short --untracked-files=all -- docs/features/M00.03` listed only the three M00.03 deliverables. SHA-256 comparisons of M00.01 and M00.02 proposals, repository preflight and v3.3 source and status CSV files matched the pre-work snapshot.

## Applicability and review

| Item | Status |
|---|---|
| Files and impact | [DESIGN.md](DESIGN.md), [PLANNING_EVIDENCE.md](PLANNING_EVIDENCE.md), and this record. No DB migration, routable API, UI, worker or production event schema changes. |
| Runtime suites | NOT_RUN. Code, migrations, Postgres isolation/concurrency, provider adapters, UI and live queues are outside this planning item. |
| Performance | NOT_MEASURED. Serial model runs supply invariant evidence. Capacity, timeout budgets and recovery targets need G-11 and actual runtime evidence. |
| Review risks | Validate atomic owner coordination and idempotency in PostgreSQL. Review policy for PO coverage and payment/refund projection precedence. G-04, G-05, G-07 and G-14 remain open. |
| Rollback | Withdraw these three planning documents if the proposal is rejected. |
| Approver, commit and PR | Human decision and signed [impossible-state checklist](PLANNING_EVIDENCE.md#impossible-state-checklist) pending. No commit or PR created. |

## Reproduce the checks

Run from the BusinessOS repository root with the available Python interpreter. The exact invocation in this environment was:

~~~powershell
$verify = Get-Content -Raw -Encoding UTF8 'docs/features/M00.03/VERIFICATION.md'
$check = [regex]::Match($verify, '(?ms)^~~~python\r?\n(.*?)^~~~\r?$')
if (!$check.Success) { throw 'Embedded model check not found' }
$check.Groups[1].Value | & 'C:/Users/ronip/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -
exit $LASTEXITCODE
~~~

~~~python
import csv
import json
import re
from dataclasses import dataclass
from decimal import Decimal as Qty
from itertools import permutations
from pathlib import Path

feature = Path("docs/features/M00.03")
pack = Path("prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack")
design = (feature / "DESIGN.md").read_text(encoding="utf-8")
evidence = (feature / "PLANNING_EVIDENCE.md").read_text(encoding="utf-8")
contract, data = [json.loads(block) for block in re.findall(r"~~~json\n(.*?)\n~~~", evidence, re.S)]
rows = re.findall(r"^\| ([ROFSAPMBU]\d{2}) \| ([A-Z_, ]+) \| ([A-Z_]+) \|", design, re.M)
catalog = {i: (source.split(", "), target) for i, source, target in rows}

def transition(state, action, allowed=True, derived=None):
    sources, target = catalog[action]
    if state not in sources or not allowed:
        return None
    if target == "DERIVED":
        assert derived is not None
        return derived
    return state if target == "SAME" else target

def step(state, action, allowed=True, derived=None):
    result = transition(state, action, allowed, derived)
    assert result is not None, (state, action)
    return result

@dataclass
class Position:
    sellable: Qty
    held: Qty = Qty(0)
    committed: Qty = Qty(0)
    issued: Qty = Qty(0)

    @property
    def available(self):
        return self.sellable - self.held - self.committed

    def reserve(self, amount):
        if amount <= 0 or amount > self.available:
            return None
        self.held += amount
        return step("NEW", "R01")

    def convert(self, state, amount, before_deadline=True):
        result = transition(state, "R02", before_deadline and self.held >= amount > 0)
        if result:
            self.held -= amount
            self.committed += amount
        return result

    def expire(self, state, amount):
        result = transition(state, "R04", self.held >= amount > 0)
        if result:
            self.held -= amount
        return result

    def consume(self, action, amount):
        if self.committed < amount or amount <= 0:
            return False
        self.committed -= amount
        if action == "dispatch":
            self.sellable -= amount
            self.issued += amount
        assert self.available >= 0
        return True

class Commands:
    def __init__(self):
        self.replies = {}
        self.effects = set()

    def apply(self, caller, resource, granted, principal, command, key, request, source, write):
        if caller != resource or not granted:
            return "DENIED"
        cache_key = (caller[0], principal, command, key)
        if cache_key in self.replies:
            previous, result = self.replies[cache_key]
            return result if previous == (resource, request, source) else "KEY_CONFLICT"
        effect = (resource, command, source)
        if effect in self.effects:
            return "SOURCE_DUPLICATE"
        result = write()
        self.effects.add(effect)
        self.replies[cache_key] = ((resource, request, source), result)
        return result

with (pack / "WORK_ITEMS.csv").open(encoding="utf-8-sig", newline="") as file:
    work, = [item for item in csv.DictReader(file) if item["id"] == "M00.03"]
master = (pack / "MASTER_BLUEPRINT.md").read_text(encoding="utf-8-sig")
assert work["master_trace"] == "6,8,10,13" and work["feature"] in design
assert re.findall(r"^## (\d+)\.", design, re.M) == [str(i) for i in range(1, 11)]
for section in (6, 8, 10, 13):
    assert re.search(rf"^## {section}\.", master, re.M)
assert len(catalog) == len(rows) and {i[0] for i in catalog} == set("ROFSAPMBU")
for action in re.findall(r"--> [A-Z_]+: ([RO]\d{2})", design):
    assert action in catalog
assert data["provenance"] == "HYPOTHESIS" and data["external_validation"] == "PENDING"
assert contract["context"]["tenantId"] == data["scope_a"][0]
assert contract["context"]["branchId"] == data["scope_a"][1]
print(f"C01 PASS: {len(catalog)} transition rows, eight domain state machines plus settlement")

a, b, b2 = [tuple(data[name]) for name in ("scope_a", "scope_b", "ungranted_branch_b")]
fixture = data["order"]
one = Qty(1)
for buyers in permutations(("agent-one", "agent-two")):
    contested = Position(Qty(fixture["stock_x"]))
    winners = [buyer for buyer in buyers if contested.reserve(one)]
    assert winners == [buyers[0]] and contested.available == 0
x, y = [Position(Qty(fixture["stock_" + sku])) for sku in ("x", "y")]
hx, hy = x.reserve(one), y.reserve(one)
order = step(step("NEW", "O01"), "O02", hx == hy == "ACTIVE")
assert x.convert(hx, one) == y.convert(hy, one) == "CONSUMED"
order = step(order, "O03", not (x.held or y.held) and x.committed == y.committed == one)
assert x.expire("CONSUMED", one) is None and x.committed == one
snapshot = (fixture["amount_x"], fixture["amount_y"])
cancelled_y = y.consume("cancel", one)
order = step(order, "O05", cancelled_y)
due = sum(snapshot) - snapshot[1]
money = data["money"]
payment = step("UNPAID", "P02", money["captured"] == due)
fulfillment = step(step("UNFULFILLED", "F01"), "F02")
assert x.consume("dispatch", one)
fulfillment = step(fulfillment, "F04", x.committed == 0)
assert fulfillment == "FULFILLED" and x.issued == one and y.issued == 0
shipment = "NOT_CREATED"
for action in ("S01", "S02", "S03", "S04", "S05"):
    shipment = step(shipment, action)
rma = step(step("NEW", "A01", x.issued == one), "A02")
rma = step(rma, "A05")
assert transition(rma, "A07") is None and x.sellable == 0
rma = step(rma, "A06")
quarantined = one
settlement = "UNRECONCILED"
assert (shipment, payment, rma) == ("DELIVERED", "PAID", "INSPECTED")
assert transition(order, "O09", settlement == "RECONCILED") is None
payout = (money["remitted"], money["fee"])
settlement = step(settlement, "M02", sum(payout) == money["captured"])
assert (order, rma, payment) == ("CONFIRMED", "INSPECTED", "PAID")
assert transition(payment, "P04", money["captured"] + 1 <= money["captured"]) is None
payment = step(payment, "P04", 0 < money["refund"] <= money["captured"])
payment = step(payment, "P05", 0 < money["refund"] < money["captured"])
rma = step(step(rma, "A07", payment == "PARTIALLY_REFUNDED"), "A08")
assert (settlement, rma, x.sellable, quarantined) == ("RECONCILED", "CLOSED", 0, 1)
assert due == 6000 and sum(snapshot) == 10000 and sum(payout) == 6000
assert money["captured"] - money["refund"] == 4000
print("C02 PASS: last-unit hold, partial cancel, independent receipt/inspection/settlement and partial refund")

commands = Commands()
posting = Position(one, committed=one)
def dispatch(branch=a, key="KEY-1", quantity=one, granted=True):
    return commands.apply(branch, a, granted, "WAREHOUSE", "dispatch", key, quantity, "PKG-01",
                          lambda: posting.consume("dispatch", quantity))

assert dispatch() is True and dispatch() is True and posting.issued == one
assert dispatch(quantity=Qty(2)) == "KEY_CONFLICT"
assert dispatch(key="KEY-2") == "SOURCE_DUPLICATE" and posting.issued == one

version, paid = 0, 0
inbox, deferred = set(), {}
def collection_event(event_id, sequence, kind, verified):
    global version, paid
    if event_id in inbox:
        return "REPLAY"
    if not verified:
        return "DENIED"
    if sequence > version + 1:
        deferred[sequence] = (event_id, kind)
        return "DEFER"
    if sequence <= version:
        return "STALE"
    if kind == "captured":
        paid += money["captured"]
    version = sequence
    inbox.add(event_id)
    return "APPLIED"

assert collection_event("FAIL-LATER", 2, "failed", True) == "DEFER" and paid == 0
assert collection_event("CAPTURE", 1, "captured", True) == "APPLIED"
event_id, kind = deferred.pop(2)
assert collection_event(event_id, 2, kind, True) == "APPLIED"
assert collection_event("CAPTURE", 1, "captured", True) == "REPLAY"
assert collection_event("FAIL-OLD", 1, "failed", True) == "STALE"
assert paid == money["captured"] and transition("PAID", "P03") is None
print("C03 PASS: exact/altered/source replay, deferred version gap, stale failure without capture regression")

for actions in permutations(("cancel", "dispatch")):
    contested = Position(one, committed=one)
    version = 1
    for i, action in enumerate(actions):
        expected_version = 1
        if expected_version != version:
            assert i == 1 and not contested.consume(action, one)
            continue
        assert contested.consume(action, one)
        version += 1
    assert contested.issued == (one if actions[0] == "dispatch" else 0)
    assert contested.committed == 0
for actions in permutations(("convert", "expire")):
    contested = Position(one)
    hold = contested.reserve(one)
    first, _ = actions
    if first == "convert":
        state = contested.convert(hold, one)
        assert state == "CONSUMED" and contested.expire(state, one) is None
    else:
        assert contested.convert(hold, one, before_deadline=False) is None
        state = contested.expire(hold, one)
        assert state == "EXPIRED" and contested.convert(state, one, before_deadline=False) is None
    assert contested.held == 0
    assert contested.committed == (one if state == "CONSUMED" else 0)
print("C04 PASS: both serial orderings of cancel/dispatch and conversion/expiry")

po = data["po"]
ordered = Qty(po["ordered"])
state = step("DRAFT", "B01")
received = accepted = quarantine = Qty(0)
seen = set()
for source, gross, good, rejected, damaged in po["receipts"] + po["receipts"][:1]:
    if source in seen:
        continue
    seen.add(source)
    gross, good, rejected, damaged = map(Qty, (gross, good, rejected, damaged))
    assert gross == good + rejected + damaged and min(good, rejected, damaged) >= 0
    received += gross
    accepted += good
    quarantine += damaged
    state = step(state, "B02", accepted < ordered)
    assert transition(state, "B04", accepted == ordered) is None
    assert transition(state, "B03", accepted == ordered) is None
assert (received, accepted, quarantine) == (10, 9, 1) and len(seen) == 2
assert step(state, "B04", accepted + Qty(po["short_close"]) == ordered) == "CLOSED"
assert step(state, "B03", accepted + one == ordered) == "RECEIVED"
print("C05 PASS: short/damaged partial receipt, replay, covered close and authorized short-close")

rto_order = Position(one, committed=one)
assert rto_order.consume("dispatch", one)
shipment = "LABEL_READY"
for action in ("S02", "S03", "S04", "S06", "S07", "S08"):
    shipment = step(shipment, action)
assert shipment == "RTO_RECEIVED"
assert transition("CONFIRMED", "O06", rto_order.issued == 0) is None
assert rto_order.issued == one and rto_order.sellable == 0
assert transition("PAID", "P07", False) is None
dispute = step("PAID", "P07", True)
assert step(dispute, "P08", derived="PAID") == "PAID"
assert transition("UNRECONCILED", "M02", False) is None
print("C06 PASS: RTO without silent cancellation/restock/settlement and verified dispute recovery")

usage = data["usage"]
subscription = step(step("NEW", "U01"), "U02")
merchant_snapshot = (order, snapshot, payment, settlement, x.issued)
observed = set()
for package in usage["packages"]:
    assert package.startswith("PKG-")
    subscription = step(subscription, "U07")
    observed.add((a[0], fixture["id"], "FULFILLED_ORDER", usage["period"]))
assert len(observed) == 1
for action in ("U03", "U04", "U05"):
    subscription = step(subscription, action)
assert subscription == "SUSPENDED" and transition(subscription, "U07") is None
before_replay = observed.copy()
assert transition(subscription, "U08", False) is None
assert step(subscription, "U08", True) == "SUSPENDED"
observed.add((a[0], fixture["id"], "FULFILLED_ORDER", usage["period"]))
assert observed == before_replay
assert merchant_snapshot == (order, snapshot, payment, settlement, x.issued)
print("C07 PASS: one usage for multi-package/replayed observations and isolated subscription dunning")

def forbidden_write():
    raise AssertionError("Scope/permission denial allowed the write")

assert dispatch(branch=b) == "DENIED"
assert dispatch(granted=False) == "DENIED"
assert commands.apply(b, b2, True, "WAREHOUSE", "dispatch", "KEY-1", one,
                      "PKG-01", forbidden_write) == "DENIED"
assert commands.apply(a, a, False, "WAREHOUSE", "settle", "KEY-1", 6000,
                      "PAYOUT-01", forbidden_write) == "DENIED"
assert commands.apply(b, b, True, "WAREHOUSE", "dispatch", "KEY-1", one,
                      "PKG-01", lambda: "B_APPLIED") == "B_APPLIED"
assert posting.issued == one
print("C08 PASS: permission and tenant/branch denial before effects/replay, independent scope accepts same alias")

documents = sorted(feature.glob("*.md"))
assert {path.name for path in documents} == {"DESIGN.md", "PLANNING_EVIDENCE.md", "VERIFICATION.md"}
links = 0
for path in documents:
    content = path.read_text(encoding="utf-8")
    assert all(line.rstrip() == line for line in content.splitlines()), path
    prose = re.sub(r"^~~~[^\n]*\n.*?^~~~$", "", content, flags=re.M | re.S)
    for target in re.findall(r"\[[^]\n]+\]\(([^)\n]+)\)", prose):
        file, _, anchor = target.partition("#")
        destination = path.parent / file if file else path
        assert destination.is_file(), (path, target)
        if anchor:
            headings = re.findall(r"^#{1,6} (.+)$", destination.read_text(encoding="utf-8-sig"), re.M)
            slugs = {re.sub(r"[^\w -]", "", h.lower()).replace(" ", "-") for h in headings}
            assert anchor in slugs, (path, target)
        links += 1
print(f"C09 PASS: three clean documents and {links} validated local links")
~~~
