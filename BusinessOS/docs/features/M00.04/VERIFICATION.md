# M00.04 planning verification

**Status** PASS_REVIEW_REQUIRED

**Checked** 24 November 2026, Asia/Kolkata

**Approval** The implementation author ran document and model checks. Security design approval and independent review are pending, as are M00.03 acceptance, RG0 and external validation.

| Requirement | Proposed evidence |
|---|---|
| Master §3 | Tenant, branch, self, support ticket, integration and job contexts with separate identities. [Permission workbook](PERMISSION_WORKBOOK.md) |
| SEC-001/002 | Threat decomposition, deny-by-default rules, role ceilings, scoped support and distinct principals. [Threat register](PLANNING_EVIDENCE.md#threat-register) |
| SEC-003/005 | Scoped file redemption, verified money and service evidence, business replay controls. [Security and privacy](DESIGN.md#6-security-and-privacy) |
| SEC-004/006/007 | Data classification, scope-limited export, retention and legal decision boundaries. [Classification and retention](PLANNING_EVIDENCE.md#classification-and-retention) |
| G-01/G-12 | Product/Security identity decision and Privacy/Legal/Security retention decision remain open. [Decision log](DESIGN.md#10-decision-log-and-approval) |

## Actual checks

The command below runs the embedded Python standard-library model against the Markdown rules and two-tenant fixtures. Synthetic registry, session and signature facts are inputs to the model. This checks expected policy decisions without exercising real credentials, network endpoints, cryptography or storage.

| ID | Executed result |
|---|---|
| M00.04-C01 | PASS. Work-item trace, ten design sections, risk IDs, six scope types, 30 allow rules and 22 field profiles are consistent. |
| M00.04-C02 | PASS. Cashier, branch manager, owner and support each receive the permitted object view and fail out-of-scope reads. |
| M00.04-C03 | PASS. Same-ID cross-tenant and wrong-branch access are indistinguishable from missing objects. Reference, revoked-context, entitlement and grant-composition checks deny. |
| M00.04-C04 | PASS. Restricted tenant, privilege, settlement and service fields fail tender writes. Scoped field projection and filtered row selection exclude protected inputs and outputs. |
| M00.04-C05 | PASS. Subordinate delegated grant succeeds in scope. Self-change, stale version, privilege expansion and cross-branch/tenant delegation fail. |
| M00.04-C06 | PASS. Service and channel identities stay separate. A worker requires a matching stored job, and an API key can read only its modeled projection. |
| M00.04-C07 | PASS. A bound file reference succeeds under current rights. Forwarding, scope/session mismatch, expiry, revocation, version changes and unscanned objects fail. |
| M00.04-C08 | PASS. Support needs current MFA, a timeboxed independently approved ticket, an authorized purpose and exact tenant, target and action. Protected fields fail. |
| M00.04-C09 | PASS. Unverified or mismatched payment evidence leaves collection unchanged. Verified capture and authorized hold release apply once; refund approval respects role, distinct checker and eligible amount. |
| M00.04-C10 | PASS. Four planning files have 21 valid relative documentation links and no trailing whitespace. |

`git -c core.safecrlf=false diff --check` passed. `git status --short --untracked-files=all -- docs/features/M00.04` showed four new planning docs. SHA-256 comparisons for 16 source, tracker and previously produced evidence files matched the pre-work snapshot.

## Impact and approval handoff

| Item | Result |
|---|---|
| Files | [Design](DESIGN.md), [permission workbook](PERMISSION_WORKBOOK.md), [planning evidence](PLANNING_EVIDENCE.md), and this verification record. |
| DB, API, UI, workers and events | No runtime contract, code, migration, UI, queue or event changes. |
| Runtime suites and performance | NOT_RUN / NOT_MEASURED. The API and worker are scaffolds and this item is planning-only. Actual Postgres, HTTP authorization, signed file-link redemption, MFA/role change, provider signature, queue and export checks belong to implementing slices and RG1. |
| Residual risk | Validate policy invalidation races, role composition, ticket revocation and every data egress against real clients and storage. G-01 and G-12 still require owner decisions. |
| Rollback | Withdraw the four proposals if rejected. No deployment or database rollback applies. |
| Reviewer, approval, commit and PR | Pending Security signoff and independent reviewer. No commit or PR created. |

## Reproduce the checks

Run this PowerShell command from the BusinessOS repository root. The interpreter path is the one used for the recorded run.

~~~powershell
$verification = Get-Content -Raw -Encoding UTF8 'docs/features/M00.04/VERIFICATION.md'
$check = [regex]::Match($verification, '(?ms)^~~~python\r?\n(.*?)^~~~\r?$')
if (!$check.Success) { throw 'Embedded model check not found' }
$check.Groups[1].Value | & 'C:/Users/ronip/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -
exit $LASTEXITCODE
~~~

~~~python
import csv
import json
import re
from dataclasses import dataclass, replace
from decimal import Decimal
from pathlib import Path

feature = Path("docs/features/M00.04")
pack = Path("prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack")
design = (feature / "DESIGN.md").read_text(encoding="utf-8")
workbook = (feature / "PERMISSION_WORKBOOK.md").read_text(encoding="utf-8")
evidence = (feature / "PLANNING_EVIDENCE.md").read_text(encoding="utf-8")
fixture = json.loads(re.search(r"^~~~json\n(.*?)^~~~$", evidence, re.S | re.M)[1])

def table(heading):
    content = workbook.split("## " + heading + "\n", 1)[1].split("\n## ", 1)[0]
    return [tuple(cell.strip() for cell in line.strip("|").split("|"))
            for line in content.splitlines() if line.startswith("|")][2:]

matrix = table("Object and action rules")
profiles = {profile: set(fields.split(", ")) for profile, fields, _ in table("Field profiles")}
rules = {(role, kind, action): (scope, profile, guard)
         for _, role, kind, action, scope, profile, guard in matrix}

@dataclass(frozen=True)
class Resource:
    kind: str
    tenant: str
    branch: str | None
    ref: str
    subject: str = ""

@dataclass(frozen=True)
class Principal:
    ref: str
    kind: str
    tenant: str | None
    role: str
    branches: list[str]
    active: bool = True

objects = {key: Resource(*value) for key, value in fixture["objects"].items()}
actors = {key: Principal(*value) for key, value in fixture["principals"].items()}
cashier, manager, owner, support, employee, finance, api_key, worker = (
    actors[key] for key in ("cashier", "manager", "owner", "support", "employee", "finance", "key", "worker")
)
objects["a_private"] = replace(objects["a_private"], subject=employee.ref)
special = {"SUPPORT": "SUPPORT", "API_KEY": "API_KEY", "WORKER": "WORKER"}

def permitted(person, obj, action, fields=(), passed=(), entitled=True):
    if obj is None or not person.active or not entitled:
        return False
    if person.kind != special.get(person.role, "HUMAN"):
        return False
    rule = rules.get((person.role, obj.kind, action))
    if rule is None:
        return False
    scope, profile, guard = rule
    if scope != "TICKET" and person.tenant != obj.tenant:
        return False
    if scope == "BRANCH" and obj.branch not in person.branches:
        return False
    if scope == "SELF" and obj.subject != person.ref:
        return False
    return set(fields) <= profiles[profile] and (guard == "NONE" or guard in passed)

@dataclass(frozen=True)
class Ticket:
    tenant: str
    target: str
    operator: str
    approver: str
    expires: int
    starts: int = 9
    action: str = "READ"
    mfa: bool = True
    authorized_purpose: bool = True
    revoked: bool = False

def diagnostics(person, obj, ticket, now, fields=()):
    valid = (ticket.mfa and ticket.authorized_purpose and not ticket.revoked
             and person.ref == ticket.operator and ticket.approver != person.ref
             and (obj.tenant, obj.ref) == (ticket.tenant, ticket.target)
             and ticket.action == "READ" and ticket.starts <= now < ticket.expires)
    return permitted(person, obj, "READ", fields, {"SUPPORT_GRANT"} if valid else set())

with (pack / "WORK_ITEMS.csv").open(encoding="utf-8-sig", newline="") as src:
    row, = [item for item in csv.DictReader(src) if item["id"] == "M00.04"]
master = (pack / "MASTER_BLUEPRINT.md").read_text(encoding="utf-8-sig")
assert row["master_trace"] == "3,20; G-01/G-12" and row["feature"] in design
assert re.findall(r"^## (\d+)\.", design, re.M) == [str(n) for n in range(1, 11)]
assert all(v in master for v in ("SEC-001", "SEC-007", "ADR-004", "ADR-021", "G-01", "G-12"))
assert len(matrix) == len(rules) == len({r[0] for r in matrix}) == 30
assert {v[1] for v in rules.values()} == set(profiles)
assert {v[0] for v in rules.values()} == {s for s, _ in table("Scope and guard keys")}
assert len(re.findall(r"^\| T\d{2} \|", evidence, re.M)) == 11
assert fixture["provenance"] == "HYPOTHESIS" and fixture["external_validation"] == "PENDING"
print(f"C01 PASS: 10 sections, {len(matrix)} rules, {len(profiles)} profiles, 11 risks, master trace")

a_order, b_order, b_other = (objects[k] for k in ("a_order", "b_order", "b_other"))
a_diag, b_diag = objects["a_diag"], objects["b_diag"]
ticket = Ticket("A", a_diag.ref, support.ref, "support-approver", expires=12)
assert permitted(cashier, a_order, "READ", ["amountDueMinor"], {"ACTIVE_REGISTER"})
assert not permitted(cashier, a_order, "READ")
assert permitted(manager, b_order, "READ") and not permitted(manager, b_other, "READ")
assert permitted(owner, a_order, "READ") and not permitted(owner, b_order, "READ")
assert diagnostics(support, a_diag, ticket, 10, ["healthStatus"])
assert not diagnostics(support, b_diag, ticket, 10)
assert not diagnostics(support, a_order, ticket, 10)
assert not permitted(owner, Resource("EMPLOYEE", "A", None, "EMP-01"), "READ")
print("C02 PASS: cashier, manager, owner and support received only their allowed object views")

def order_lookup(person, request, passed=()):
    return "VISIBLE" if permitted(person, request, "READ", passed=passed) else "OBJECT_UNAVAILABLE"

def valid_relation(parent, child):
    return parent.tenant == child.tenant and (parent.branch is None or parent.branch == child.branch)

assert a_order.ref == b_order.ref and a_order.tenant != b_order.tenant
assert order_lookup(cashier, b_order, {"ACTIVE_REGISTER"}) == order_lookup(cashier, None)
assert order_lookup(manager, b_other) == order_lookup(manager, None)
assert not permitted(replace(owner, active=False), a_order, "READ")
assert not permitted(owner, a_order, "READ", entitled=False)
assert valid_relation(b_order, Resource("LINE", "B", "B1", "LINE-01"))
assert not valid_relation(a_order, Resource("LINE", "B", "B1", "LINE-01"))
assert not valid_relation(b_order, Resource("LINE", "B", "B2", "LINE-01"))
cashier_b1 = replace(cashier, tenant="B", branches=["B1"])
manager_b2 = replace(manager, branches=["B2"])
b1_reg = Resource("REGISTER", "B", "B1", "REG-01")
b2_reg = Resource("REGISTER", "B", "B2", "REG-02")
assert permitted(cashier_b1, b1_reg, "RECORD_TENDER", passed={"ASSIGNED_SHIFT"})
assert permitted(manager_b2, b2_reg, "READ")
assert not any(permitted(p, b2_reg, "RECORD_TENDER", passed={"ASSIGNED_SHIFT"})
               for p in (cashier_b1, manager_b2))
print("C03 PASS: same-ID isolation, branch and relation checks, revoked/disabled authority and no grant mixing")

register = objects["a_register"]
tender = {"orderRef", "tenderType", "amountMinor", "operationRef"}
assert permitted(cashier, register, "RECORD_TENDER", tender, {"ASSIGNED_SHIFT"})
for excess in ("tenantId", "roleRef", "settlementState", "serviceIdentity"):
    assert not permitted(cashier, register, "RECORD_TENDER", tender | {excess}, {"ASSIGNED_SHIFT"})
assert not permitted(cashier, objects["a_collection"], "APPROVE_REFUND")
assert not permitted(owner, a_order, "READ", ["rawProviderEvidence"])
assert not diagnostics(support, a_diag, ticket, 10, ["customerPhone"])
raw = {"orderRef": a_order.ref, "amountDueMinor": 6000, "customerPhone": "RESTRICTED"}
shape = profiles[rules[("CASHIER", "ORDER", "READ")][1]]
projection = {key: value for key, value in raw.items() if key in shape}
assert projection == {"orderRef": a_order.ref, "amountDueMinor": 6000}
projected_rows = [o for o in (a_order, b_order, b_other) if permitted(manager, o, "READ")]
assert [(o.tenant, o.branch, o.ref) for o in projected_rows] == [("B", "B1", "ORDER-01")]
print("C04 PASS: command-field allowlist, protected response fields, action denial and pre-aggregation row scope")

subordinate = {"CASHIER", "SALES_AGENT"}
membership = objects["a_membership"]
grant_fields = ("membershipRef", "roleRef", "branchRefs", "expectedVersion", "reasonCode")

def grant(person, obj, recipient, role, branches, expected_version=1):
    bounded = (recipient != person.ref and role in subordinate and branches
               and set(branches) <= set(person.branches) and expected_version == 1)
    return permitted(person, obj, "GRANT_ROLE", grant_fields, {"BOUNDED_GRANT"} if bounded else set())

assert grant(owner, membership, "staff-a", "CASHIER", ["A1"])
assert not grant(owner, membership, owner.ref, "CASHIER", ["A1"])
for role in ("OWNER", "FINANCE", "HR_ADMIN", "SUPPORT"):
    assert not grant(owner, membership, "staff-a", role, ["A1"])
assert not grant(owner, membership, "staff-a", "CASHIER", ["B1"])
assert not grant(owner, objects["b_membership"], "staff-b", "CASHIER", ["A1"])
assert not grant(owner, membership, "staff-a", "CASHIER", ["A1"], expected_version=0)
assert not grant(manager, objects["b_membership"], "staff-b", "CASHIER", ["B1"])
print("C05 PASS: bounded delegation, stale version, cross-tenant grant and privilege escalation guards")

@dataclass(frozen=True)
class Job:
    identity: str
    resource: Resource
    action: str
    queue: str
    source: str
    version: int

hold = objects["a_hold"]
registered_job = Job(worker.ref, hold, "EXPIRE", "inventory", "OP-01", 3)

def allowed_job(person, target, presented, trusted=registered_job, current_version=registered_job.version):
    match = (trusted is not None and presented == trusted and trusted.identity == person.ref
             and trusted.resource == target and trusted.action == "EXPIRE"
             and trusted.queue == "inventory" and trusted.version == current_version)
    proof = {"AUTHORITATIVE_JOB"} if match else set()
    return permitted(person, target, "EXPIRE", ["reservationRef", "operationRef", "expectedVersion"], proof)

assert allowed_job(worker, hold, registered_job)
assert not allowed_job(cashier, hold, registered_job)
assert not allowed_job(replace(api_key, role="WORKER"), hold, registered_job)
assert not allowed_job(worker, objects["b_hold"], registered_job)
assert not allowed_job(worker, hold, registered_job, trusted=None)
assert not allowed_job(worker, hold, replace(registered_job, version=4))
assert not allowed_job(worker, hold, registered_job, current_version=4)

@dataclass(frozen=True)
class ChannelScope:
    holder: str
    tenant: str
    channel: str
    audience: str = "partner"
    active: bool = True

catalog = objects["a_catalog"]
channel = ChannelScope(api_key.ref, catalog.tenant, catalog.ref)

def channel_view(person, obj, binding, action="READ"):
    bound = (binding.active and binding.audience == "partner" and binding.holder == person.ref
             and (binding.tenant, binding.channel) == (obj.tenant, obj.ref))
    proof = {"CHANNEL_READ"} if bound else set()
    return permitted(person, obj, action, ["publicLabel"], proof)

assert channel_view(api_key, catalog, channel)
assert not channel_view(api_key, replace(catalog, ref="CHANNEL-02"), channel)
assert not channel_view(api_key, replace(catalog, tenant="B"), channel)
assert not channel_view(api_key, catalog, replace(channel, audience="business"))
assert not channel_view(api_key, catalog, replace(channel, active=False))
assert not channel_view(api_key, catalog, channel, action="WRITE")
assert not channel_view(cashier, catalog, channel)
assert not channel_view(api_key, a_order, channel)
print("C06 PASS: distinct identity lanes, bound authoritative job and channel read-only access")

@dataclass(frozen=True)
class FileReference:
    resource: Resource
    principal: str
    session: str
    purpose: str
    audience: str
    version: int
    expires: int

file_data = fixture["file"]
private_file = objects[file_data["resource"]]
issued = FileReference(private_file, employee.ref, "session-a", file_data["purpose"],
                       file_data["audience"], file_data["version"], 8)

def redeem(person, session, scope, now, current_version=issued.version, clean=True, revoked=False):
    valid = (scope == issued and clean and not revoked and scope.resource == private_file
             and scope.principal == person.ref and scope.session == session
             and scope.purpose == file_data["purpose"] and scope.audience == file_data["audience"]
             and now < scope.expires and scope.version == current_version)
    return permitted(person, private_file, "DOWNLOAD", ["fileRef"], {"FILE_POLICY"} if valid else set())

assert redeem(employee, "session-a", issued, 7)
assert not redeem(replace(employee, tenant="B"), "session-a", issued, 7)
assert not redeem(replace(employee, ref="employee-2"), "session-a", issued, 7)
assert not redeem(employee, "session-other", issued, 7)
assert not redeem(employee, "session-a", replace(issued, purpose="other"), 7)
assert not redeem(employee, "session-a", issued, 8)
assert not redeem(employee, "session-a", issued, 7, current_version=4)
assert not redeem(employee, "session-a", issued, 7, clean=False)
assert not redeem(employee, "session-a", issued, 7, revoked=True)
assert not redeem(support, "session-a", issued, 7)
print("C07 PASS: private file policy rejects forwarded, expired, revoked and obsolete references")

assert not diagnostics(support, objects["a_other_diag"], ticket, 10)
assert not diagnostics(support, a_diag, ticket, 8)
assert not diagnostics(support, a_diag, ticket, 12)
assert not diagnostics(support, a_diag, replace(ticket, action="OTHER"), 10)
assert not diagnostics(support, a_diag, replace(ticket, revoked=True), 10)
assert not diagnostics(support, a_diag, replace(ticket, mfa=False), 10)
assert not diagnostics(support, a_diag, replace(ticket, authorized_purpose=False), 10)
assert not diagnostics(support, a_diag, replace(ticket, approver=support.ref), 10)
assert not permitted(support, objects["a_membership"], "GRANT_ROLE", passed={"BOUNDED_GRANT"})
print("C08 PASS: support target, MFA, ticket expiry/revocation, independent approval and redacted fields")

money = fixture["money"]
collection = objects["a_collection"]
expected_cap = money["verified_collection"]
event_ids, capture_ops = set(), set()
def apply_payment(event, account, tenant, operation, amount, verified):
    scoped_event = (tenant, account, event)
    scoped_op = (tenant, account, operation)
    if (not verified or (tenant, account) != (collection.tenant, "ACCOUNT-A")
            or scoped_event in event_ids or scoped_op in capture_ops
            or amount <= 0 or amount != expected_cap):
        return False
    event_ids.add(scoped_event)
    capture_ops.add(scoped_op)
    capture_entries.append(amount)
    return True

def captured_total():
    return sum(capture_entries)

capture_entries = []
assert not apply_payment("E-01", "ACCOUNT-A", "A", "CAPTURE", expected_cap, False)
assert not apply_payment("E-01", "ACCOUNT-B", "A", "CAPTURE", expected_cap, True)
assert not apply_payment("E-01", "ACCOUNT-A", "B", "CAPTURE", expected_cap, True)
assert captured_total() == 0
assert apply_payment("E-01", "ACCOUNT-A", "A", "CAPTURE", expected_cap, True)
assert not apply_payment("E-01", "ACCOUNT-A", "A", "CAPTURE", expected_cap, True)
assert not apply_payment("E-02", "ACCOUNT-A", "A", "CAPTURE", expected_cap, True)

def refund_approval(person, maker, amount):
    proof = {"DISTINCT_CHECKER"} if maker != person.ref else set()
    return permitted(person, collection, "APPROVE_REFUND", ["requestRef"], proof) and 0 < amount <= captured_total()

assert not refund_approval(cashier, finance.ref, money["refund_request"])
assert not refund_approval(finance, finance.ref, money["refund_request"])
assert not refund_approval(finance, "finance-maker", expected_cap + 1)
assert refund_approval(finance, "finance-maker", money["refund_request"])
assert captured_total() == money["due"] and len(capture_entries) == 1

sellable, active_hold = (Decimal(fixture["stock"][field]) for field in ("sellable", "held"))
issues = set()
def release(person, presented):
    global active_hold
    if not allowed_job(person, hold, presented) or presented.source in issues or active_hold <= 0:
        return False
    active_hold = Decimal(0)
    issues.add(presented.source)
    return True

assert not release(cashier, registered_job) and (sellable, active_hold) == (1, 1)
assert release(worker, registered_job) and not release(worker, registered_job)
assert (sellable, active_hold, sellable - active_hold) == (1, 0, 1) and len(issues) == 1
print("C09 PASS: verified scoped capture once, refund bounds/separation, replay-safe hold release")

links = 0
docs = sorted(feature.glob("*.md"))
assert {p.name for p in docs} == {"DESIGN.md", "PERMISSION_WORKBOOK.md", "PLANNING_EVIDENCE.md", "VERIFICATION.md"}
for path in docs:
    text = path.read_text(encoding="utf-8")
    assert all(line.rstrip() == line for line in text.splitlines()), path
    prose = re.sub(r"^~~~[^\n]*\n.*?^~~~$", "", text, flags=re.M | re.S)
    for target in re.findall(r"\[[^]\n]+\]\(([^)\n]+)\)", prose):
        file, _, anchor = target.partition("#")
        dest = path.parent / file if file else path
        assert dest.is_file(), (path, target)
        if anchor:
            headings = re.findall(r"^#{1,6} (.+)$", dest.read_text(encoding="utf-8-sig"), re.M)
            slugs = {re.sub(r"[^\w -]", "", h.lower()).replace(" ", "-") for h in headings}
            assert anchor in slugs, (path, target)
        links += 1
print(f"C10 PASS: four clean documents and {links} local links")
~~~
