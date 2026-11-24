# M00.05 Planning verification

**Status** PASS_REVIEW_REQUIRED

**Checked** 24 November 2026, Asia/Kolkata

**Review** The author ran the checks below. M00.04 acceptance, human policy/Architecture approval, independent review and RG0 signoff remain pending. External validation is PENDING.

| Requirement | Deliverable and evidence |
|---|---|
| Master §23.3, G-01–G-18 | [Decisions log](DECISIONS_LOG.md) records all authorities, deadlines, defaults and blocked capabilities. Every row is BLOCKED for v3.3. |
| G-18 and ADR-024 | [Carry-forward proposal](PLANNING_EVIDENCE.md#adr-024-carry-forward-proposal) traces 14 choices to the earlier approval and identifies remaining v3.3 decisions. |
| G-05/G-06/G-07/G-10/G-17 | [Validation paths](PLANNING_EVIDENCE.md#validation-paths-for-policy-owners) document reviewers, evidence and stop conditions for tax/GST, payments, SaaS plans and payroll. |
| RG0 and approval governance | [Design](DESIGN.md), [ADR template](ADR_TEMPLATE.md), and [feature approval checklist](FEATURE_APPROVAL_CHECKLIST.md) capture approved scope, change process and independent review. |

## Actual checks

The PowerShell command below executes the embedded Python standard-library checks against the six planning files and local authorities. Simulated approval and replay checks act on an in-memory model with symbolic values. These checks establish document consistency and expected decisions for the specified inputs.

| ID | Executed result |
|---|---|
| M00.05-C01 | PASS. All 18 G-01–G-18 entries, master approvers and deadlines match the authoritative register. Each entry has a coordinator, safe default and blocked capability, with v3.3 status BLOCKED. |
| M00.05-C02 | PASS. All 14 proposed tool choices match the earlier ADR approval exactly. Conditional pooling, existing Express evidence and unselected options remain distinct. |
| M00.05-C03 | PASS. Simulated tax, payment authority, SaaS price, payroll and OTP decisions fail without all applicable approvals. Client and coding-agent defaults are rejected. |
| M00.05-C04 | PASS. Unsigned, stale, wrong-scope, substituted policy, missing authority/evidence, ineffective dates, absent master amendment and historical-scope approval fail. |
| M00.05-C05 | PASS. Five simulated records are accepted with matching evidence. Exact replay is a no-op, content conflicts are denied and replay rechecks authority. No gate in the actual register changes. |
| M00.05-C06 | PASS. Required validation paths and approval aids exist. The checklist is unsigned and unchecked. |
| M00.05-C07 | PASS. All six planning docs have clean whitespace and valid relative links. |

`git -c core.safecrlf=false diff --check` passed. `git status --short --untracked-files=all -- docs/features/M00.05` showed six new planning documents. SHA-256 comparisons for 23 tracked, staged or prior source/evidence files matched the pre-work snapshot. The existing staged and unstaged tracked diffs matched the snapshot.

The first model run stopped at the requirement-trace assertion because PowerShell's default stdin encoding altered the literal ellipsis. The verifier now spells the same Unicode character with an ASCII escape.

## Impact and handoff

| Item | Result |
|---|---|
| DB, API, UI and events | No schema, runtime contracts, UI, tooling, packages, deployments or event changes. |
| Runtime suites and performance | NOT_RUN / NOT_MEASURED. Postgres, application integration, provider, authorization, payroll, accessible UI, security scans and load tests belong to implemented slices. Policy publication in this model produces no financial or stock effects. |
| Blocked and residual risk | All v3.3 gate approvals, the toolchain carry-forward, M00.04 acceptance and RG0 are pending. Real policy implementations still require release and runtime proof. |
| Rollback | Withdraw these six proposals if rejected. No database, deployment or toolchain rollback applies. |
| Reviewer, PR and commit | Pending required human and independent review. No PR or commit created. |

## Reproduce the checks

Run this PowerShell command from the repository root. The interpreter path is the one used for the recorded run.

~~~powershell
$verification = Get-Content -Raw -Encoding UTF8 'docs/features/M00.05/VERIFICATION.md'
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
from pathlib import Path

feature = Path("docs/features/M00.05")
pack = Path("prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack")
prior = Path("doc/CommerceOS_v3_1_Engineering_Development_Package/commerceos-execution-v3.1/MASTER_BLUEPRINT.md")

def read(path):
    return path.read_text(encoding="utf-8-sig")

def section(text, start, end):
    return text.split(start, 1)[1].split(end, 1)[0]

def table(text):
    rows = [line.strip("|").split("|") for line in text.splitlines() if line.startswith("|")]
    return [tuple(cell.strip() for cell in row) for row in rows[2:]]

design = read(feature / "DESIGN.md")
log = read(feature / "DECISIONS_LOG.md")
evidence = read(feature / "PLANNING_EVIDENCE.md")
fixture = json.loads(re.search(r"^~~~json\n(.*?)^~~~$", evidence, re.M | re.S)[1])
master = read(pack / "MASTER_BLUEPRINT.md")
with (pack / "WORK_ITEMS.csv").open(encoding="utf-8-sig", newline="") as file:
    item, = [row for row in csv.DictReader(file) if row["id"] == "M00.05"]
assert item["master_trace"] == "23.3 G-01\u2026G-18" and item["feature"] in design
assert re.findall(r"^## (\d+)\.", design, re.M) == [str(i) for i in range(1, 11)]

gate_rows = table(section(log, "## Gate register", "## Recording a decision"))
canonical = table(section(master, "### 23.3 Open decision gates", "**Gate log protocol:**"))
expected_ids = [f"G-{i:02}" for i in range(1, 19)]
assert [row[0] for row in gate_rows] == [row[0] for row in canonical] == expected_ids
owners = {}
for source, row in zip(canonical, gate_rows):
    gate, status, coordinator, approvers, deadline, default, blocked = row
    assert status == "BLOCKED" and coordinator and default and blocked
    assert (gate, approvers, deadline) == (source[0], source[2], source[3])
    owners[gate] = frozenset(approvers.split(" + "))
assert "Founder/product + architect" in master and "PENDING" in log
print("C01 PASS: all 18 RG0 gate rows match master approval authorities and deadlines")

history_section = section(read(prior), "### 23.4 ADR-024", "### 23.5 ADR-025")
proposal = table(section(evidence, "## ADR-024 carry-forward proposal", "## Approval model fixtures"))
assert "Approved 24 November 2026" in history_section
assert "PROPOSED for v3.3" in evidence
assert proposal == [(component, choice) for component, choice, _ in table(history_section)]
assert len(proposal) == 14
assert "PgBouncer when warranted" in evidence and "Leave Fastify unselected" in evidence
assert "authentication/OTP provider" in read(pack / "TECHNOLOGY_DECISIONS.md")
assert "docs/adr/ADR-024.md" in read(pack / "TECHNOLOGY_DECISIONS.md")
assert "@nestjs/platform-express" in read(Path("apps/api/package.json"))
print("C02 PASS: 14 choices match source approval, proposal preserves conditional and open selections")

expected = {
    "TAX": ("TAX_POLICY", "TENANT-A", ["G-06", "G-17"]),
    "PAYMENT": ("PAYMENT_AUTHORITY", "TENANT-A", ["G-05", "G-17"]),
    "SAAS_PRICE": ("PLAN_PRICE", "PLATFORM", ["G-07"]),
    "PAYROLL": ("PAYROLL_FORMULA", "TENANT-A", ["G-10", "G-17"]),
    "OTP": ("OTP_PROVIDER", "PLATFORM", ["G-01", "G-18"]),
}
assert {case["id"]: (case["policy"], case["scope"], case["gates"])
        for case in fixture["cases"]} == expected
assert fixture["provenance"] == "HYPOTHESIS" and fixture["external_validation"] == "PENDING"
assert len(fixture["tenant_scopes"]) == len(set(fixture["tenant_scopes"])) == 2

@dataclass(frozen=True)
class Candidate:
    policy: str
    scope: str
    jurisdiction: str
    revision: str
    operation: str
    policy_ref: str
    origin: str = "APPROVED_POLICY_WORKFLOW"

@dataclass(frozen=True)
class Approval:
    gate: str
    policy: str
    scope: str
    jurisdiction: str
    revision: str
    policy_ref: str
    approvers: frozenset
    starts: int = 2
    ends: int = 5
    status: str = "APPROVED"
    signed: bool = True
    evidence_ref: str = "SIMULATED-REVIEW-EVIDENCE"
    governed_amendment: bool = True
    authority: str = "V3.3"

def simulated_approvals(case, request):
    return {gate: Approval(gate, request.policy, request.scope, request.jurisdiction,
                           request.revision, request.policy_ref, owners[gate])
            for gate in case["gates"]}

class RegisterModel:
    def __init__(self):
        self.entries = {}

    def record(self, case, request, approvals, actor_scope, now=3):
        if actor_scope != request.scope or request.origin != "APPROVED_POLICY_WORKFLOW":
            return "BLOCKED"
        if (request.policy, request.scope) != (case["policy"], case["scope"]):
            return "BLOCKED"
        for gate in case["gates"]:
            approval = approvals.get(gate)
            if (approval is None or approval.gate != gate or approval.status != "APPROVED"
                    or not approval.signed or not approval.evidence_ref or not approval.governed_amendment
                    or approval.authority != "V3.3" or not approval.starts <= now < approval.ends
                    or not owners[gate] <= approval.approvers
                    or (approval.policy, approval.scope, approval.jurisdiction, approval.revision, approval.policy_ref)
                    != (request.policy, request.scope, request.jurisdiction, request.revision, request.policy_ref)):
                return "BLOCKED"
        key = (request.policy, request.scope, request.operation)
        if key in self.entries:
            return "REPLAY" if self.entries[key] == request else "CONFLICT"
        self.entries[key] = request
        return "RECORDED"

model = RegisterModel()
cases = {}
for case in fixture["cases"]:
    request = Candidate(case["policy"], case["scope"], fixture["synthetic_jurisdiction"],
                        fixture["revision"], fixture["operation"], f'SYNTHETIC-{case["id"]}-REF')
    decisions = simulated_approvals(case, request)
    cases[case["id"]] = (case, request, decisions)
    assert model.record(case, request, {}, request.scope) == "BLOCKED"
    for missing in case["gates"]:
        partial = {key: approval for key, approval in decisions.items() if key != missing}
        assert model.record(case, request, partial, request.scope) == "BLOCKED"
    for source in ("CLIENT_DEFAULT", "CODING_AGENT_DEFAULT"):
        assert model.record(case, replace(request, origin=source), decisions, request.scope) == "BLOCKED"
assert not model.entries
print("C03 PASS: tax, payment authority, SaaS price, payroll and OTP blocked without all applicable approvals")

for case, request, decisions in cases.values():
    gate = case["gates"][0]
    current = decisions[gate]
    variants = [
        replace(current, status="BLOCKED"), replace(current, signed=False),
        replace(current, approvers=frozenset({"CODING_AGENT"})),
        replace(current, evidence_ref=""), replace(current, governed_amendment=False),
        replace(current, revision="STALE"), replace(current, jurisdiction="OTHER-JURISDICTION"),
        replace(current, policy_ref="SUBSTITUTED_POLICY_VALUE"), replace(current, ends=3),
        replace(current, starts=4),
    ]
    for bad in variants:
        assert model.record(case, request, decisions | {gate: bad}, request.scope) == "BLOCKED"
    wrong_scope = "TENANT-B"
    assert model.record(case, request, decisions, wrong_scope) == "BLOCKED"
    assert model.record(case, request, decisions | {gate: replace(current, scope=wrong_scope)},
                        request.scope) == "BLOCKED"
case, request, decisions = cases["OTP"]
older = replace(decisions["G-18"], authority="EARLIER-ADR-024-SCOPE")
assert model.record(case, request, decisions | {"G-18": older}, request.scope) == "BLOCKED"
assert not model.entries
print("C04 PASS: reviewer authority, policy revision/value/scope, effective dates and historical approval guards")

for case, request, decisions in cases.values():
    assert model.record(case, request, decisions, request.scope) == "RECORDED"
    assert model.record(case, request, decisions, request.scope) == "REPLAY"
    changed = replace(request, policy_ref=request.policy_ref + "-CHANGED")
    assert model.record(case, changed, decisions, request.scope) == "BLOCKED"
    assert model.record(case, changed, simulated_approvals(case, changed), request.scope) == "CONFLICT"
    assert model.record(case, request, {}, request.scope) == "BLOCKED"
assert len(model.entries) == len(cases) == 5
assert {request.policy_ref for request in model.entries.values()} == {
    request.policy_ref for _, request, _ in cases.values()
}
assert all(row[1] == "BLOCKED" for row in gate_rows)
print("C05 PASS: five simulated approvals and idempotent records, no actual gate activated")

checklist = read(feature / "FEATURE_APPROVAL_CHECKLIST.md")
template = read(feature / "ADR_TEMPLATE.md")
assert re.search(r"^- \[ \]", checklist, re.M) and not re.search(r"^- \[[xX]\]", checklist, re.M)
for phrase in ("Independent review", "Human approval", "Default posture", "rollback"):
    assert phrase in template
assert all(path in evidence for path in ("GST, tax and invoices", "Payments and settlement",
                                         "SaaS charging", "Payroll", "Identity and recovery"))
print("C06 PASS: approval aids are unsigned and all required validation paths exist")

docs = sorted(feature.glob("*.md"))
assert {file.name for file in docs} == {"DESIGN.md", "DECISIONS_LOG.md", "ADR_TEMPLATE.md",
                                       "FEATURE_APPROVAL_CHECKLIST.md", "PLANNING_EVIDENCE.md",
                                       "VERIFICATION.md"}
links = 0
for path in docs:
    content = read(path)
    assert all(line.rstrip() == line for line in content.splitlines()), path
    prose = re.sub(r"^~~~[^\n]*\n.*?^~~~$", "", content, flags=re.M | re.S)
    for target in re.findall(r"\[[^]\n]+\]\(([^)\n]+)\)", prose):
        file, _, anchor = target.partition("#")
        destination = path.parent / file if file else path
        assert destination.is_file(), (path, target)
        if anchor:
            headings = re.findall(r"^#{1,6} (.+)$", read(destination), re.M)
            slugs = {re.sub(r"[^\w -]", "", heading.lower()).replace(" ", "-") for heading in headings}
            assert anchor in slugs, (path, target)
        links += 1
print(f"C07 PASS: six planning docs and {links} validated relative links")
~~~
