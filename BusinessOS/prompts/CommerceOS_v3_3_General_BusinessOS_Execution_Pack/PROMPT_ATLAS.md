# CommerceOS v3.3 — One prompt per feature

All test businesses are fictional. No external customer validation has occurred. The first 120 prompts are Business OS execution; three MF prompts are future/deferred.


## M00

001. **[M00.01 — Business capability hypotheses and workflow mapping](prompts/M00/M00.01.md)** · `PLANNING — internal product/architecture approval, no application code` · Trace `3,5; SC-01…SC-06`
002. **[M00.02 — Domain boundaries and ownership](prompts/M00/M00.02.md)** · `PLANNING — internal product/architecture approval, no application code` · Trace `16,17,23`
003. **[M00.03 — State machines and invariants](prompts/M00/M00.03.md)** · `PLANNING — internal product/architecture approval, no application code` · Trace `6,8,10,13`
004. **[M00.04 — Threat model and permission matrix](prompts/M00/M00.04.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `3,20; G-01/G-12`
005. **[M00.05 — Policy and legal decision gates](prompts/M00/M00.05.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `23.3 G-01…G-14`
006. **[M00.06 — QA architecture and SLO workload](prompts/M00/M00.06.md)** · `PLANNING — internal product/architecture approval, no application code` · Trace `4,16.6,21`

## M01

007. **[M01.01 — Repo structure and package boundaries](prompts/M01/M01.01.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `16.1,22`
008. **[M01.02 — Local development and test environments](prompts/M01/M01.02.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `16,21`
009. **[M01.03 — HTTP contract, validation and API client](prompts/M01/M01.03.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `18`
010. **[M01.04 — Database migrations and transaction toolkit](prompts/M01/M01.04.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `16.3,17`
011. **[M01.05 — Tenant and branch execution context plumbing](prompts/M01/M01.05.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `16.2,20`
012. **[M01.06 — Transactional outbox and worker foundation](prompts/M01/M01.06.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `16.3,12,21`
013. **[M01.07 — Authentication, secrets and protected configuration base](prompts/M01/M01.07.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `20; G-01`
014. **[M01.08 — File object and background jobs infrastructure](prompts/M01/M01.08.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `17,20`
015. **[M01.09 — CI/CD, supply chain and feature flags](prompts/M01/M01.09.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `20,21`
016. **[M01.10 — Metrics, tracing and operational baseline](prompts/M01/M01.10.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `16.6,21`

## M02

017. **[M02.01 — Owner registration, login and account recovery](prompts/M02/M02.01.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `OWN-001; G-01`
018. **[M02.02 — Tenant creation and membership switching](prompts/M02/M02.02.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `OWN-001,16.2`
019. **[M02.03 — Branches, stock locations and registers](prompts/M02/M02.03.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `3, OWN-003`
020. **[M02.04 — RBAC/ABAC and permission administration](prompts/M02/M02.04.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `3,16.2,20`
021. **[M02.05 — Business identity, legal profile and settings versioning](prompts/M02/M02.05.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `OWN-003/006; G-06`
022. **[M02.06 — Ten-step resumable onboarding wizard](prompts/M02/M02.06.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `OWN-002/003/007`
023. **[M02.07 — Import Center: mapping and dry run](prompts/M02/M02.07.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `OWN-004`
024. **[M02.08 — Import commit, idempotency and opening balances](prompts/M02/M02.08.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `OWN-004, INV-002`
025. **[M02.09 — Employee invites and assignment baseline](prompts/M02/M02.09.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `WF-001; OWN-003`
026. **[M02.10 — Auditing and permissioned history](prompts/M02/M02.10.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `4,20`
027. **[M02.11 — Merchant data export and privacy controls skeleton](prompts/M02/M02.11.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `5,20; G-12`

## M03

028. **[M03.01 — Category taxonomy and typed attributes](prompts/M03/M03.01.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `CAT-001/002`
029. **[M03.02 — Products, variants and SKU lifecycle](prompts/M03/M03.02.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `CAT-001/003`
030. **[M03.03 — Product media and search](prompts/M03/M03.03.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `CAT-001/003`
031. **[M03.04 — Pricing, tax display and discount controls](prompts/M03/M03.04.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `PRC-001/002; G-06`
032. **[M03.05 — Stock movement ledger and projections](prompts/M03/M03.05.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `INV-001/002`
033. **[M03.06 — Reservation and release state machine](prompts/M03/M03.06.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `INV-003`
034. **[M03.07 — Stock adjustments and quarantine](prompts/M03/M03.07.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `INV-002/004`
035. **[M03.08 — Physical counts and cycle counts](prompts/M03/M03.08.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `INV-004`
036. **[M03.09 — Inter-branch stock transfer](prompts/M03/M03.09.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `INV-004`
037. **[M03.10 — Low-stock settings and stock reconciliation worker](prompts/M03/M03.10.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `INV-005`

## M04

038. **[M04.01 — Supplier directory and payment terms](prompts/M04/M04.01.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `PUR-001`
039. **[M04.02 — Purchase order drafting, approval and lifecycle](prompts/M04/M04.02.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `PUR-001`
040. **[M04.03 — Goods receipt and quality disposition](prompts/M04/M04.03.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `PUR-002; INV-AC3`
041. **[M04.04 — Supplier bill and payable groundwork](prompts/M04/M04.04.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `PUR-003; G-03/G-06`
042. **[M04.05 — Customer profiles and addresses](prompts/M04/M04.05.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `CRM-001`
043. **[M04.06 — Customer dedupe, merge and history preservation](prompts/M04/M04.06.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `CRM-001`
044. **[M04.07 — Enquiries/leads and follow-up pipeline](prompts/M04/M04.07.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `CRM-002`
045. **[M04.08 — Versioned quotations and conversion](prompts/M04/M04.08.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `CRM-003; G-04`
046. **[M04.09 — Social live-session workflow](prompts/M04/M04.09.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `SOC-001`
047. **[M04.10 — Social bookings, expiry and order handoff](prompts/M04/M04.10.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `SOC-002, INV-003`

## M05

048. **[M05.01 — Orders aggregate and immutable snapshots](prompts/M05/M05.01.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `OMS-001/002`
049. **[M05.02 — Manual/social order draft and server quote](prompts/M05/M05.02.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `OMS-003`
050. **[M05.03 — Confirmation and reservation allocation](prompts/M05/M05.03.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `OMS-003; INV-003`
051. **[M05.04 — Pick list and fulfilment workbench](prompts/M05/M05.04.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `OMS-004`
052. **[M05.05 — Packing, parcels and dispatch](prompts/M05/M05.05.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `OMS-004`
053. **[M05.06 — Shipping adapter, tracking and manual delivery](prompts/M05/M05.06.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `OMS-005; G-05`
054. **[M05.07 — Partial fulfilment and split locations](prompts/M05/M05.07.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `OMS-004`
055. **[M05.08 — Cancellation, void and authorised override](prompts/M05/M05.08.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `OMS-006`
056. **[M05.09 — Return authorization, receipt and inspection](prompts/M05/M05.09.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `OMS-007`
057. **[M05.10 — Exchanges, store credit and adjustments](prompts/M05/M05.10.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `OMS-007`
058. **[M05.11 — Failed delivery, RTO and carrier reconciliation](prompts/M05/M05.11.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `OMS-005/007`
059. **[M05.12 — Order timeline, attribution and controls](prompts/M05/M05.12.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `OMS-002, WF-001`

## M06

060. **[M06.01 — POS register and cashier session](prompts/M06/M06.01.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `9,10`
061. **[M06.02 — POS cart, scan and counter pricing](prompts/M06/M06.02.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `9, PRC-001`
062. **[M06.03 — Mixed tender and POS order confirmation](prompts/M06/M06.03.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `9,10`
063. **[M06.04 — Collection intents, evidence and verification](prompts/M06/M06.04.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `10.1; G-05`
064. **[M06.05 — Payment allocations and customer balances](prompts/M06/M06.05.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `10.1`
065. **[M06.06 — Provider settlement and COD reconciliation](prompts/M06/M06.06.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `10.1`
066. **[M06.07 — Refunds, chargebacks and store-credit settlement](prompts/M06/M06.07.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `10.1, OMS-007`
067. **[M06.08 — Cash movements, expenses and end-of-day close](prompts/M06/M06.08.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `9,10.2`
068. **[M06.09 — Invoices, receipts, credit/debit documents](prompts/M06/M06.09.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `10.2; G-06`
069. **[M06.10 — Expense, cost and contribution reporting](prompts/M06/M06.10.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `10.2; G-03/G-13`
070. **[M06.11 — Financial exception queue and close reconciliation](prompts/M06/M06.11.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `10,21`

## M07

071. **[M07.01 — Metrics dictionary and reconciliation basis](prompts/M07/M07.01.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `AN-001/002; G-13`
072. **[M07.02 — Owner/manager dashboards](prompts/M07/M07.02.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `AN-001/003`
073. **[M07.03 — Eventual read models and report freshness](prompts/M07/M07.03.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `AN-003,16.3`
074. **[M07.04 — Unified Action Center and task lifecycle](prompts/M07/M07.04.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `AUT-006`
075. **[M07.05 — Domain approval engine](prompts/M07/M07.05.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `AUT-006,3`
076. **[M07.06 — Notifications and delivery adapters](prompts/M07/M07.06.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `AUT-003/004; G-08`
077. **[M07.07 — Automation DSL and run ledger](prompts/M07/M07.07.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `AUT-001/002/007`
078. **[M07.08 — Safe merchant automation presets](prompts/M07/M07.08.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `AUT-003/005`
079. **[M07.09 — Secure exports and scheduled reports](prompts/M07/M07.09.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `AN-003,20`

## M08

080. **[M08.01 — Synthetic onboarding, import and migration rehearsal](prompts/M08/M08.01.md)** · `ASSURANCE — independently reviewed, measured test evidence, no invented results` · Trace `21,SC-01`
081. **[M08.02 — Synthetic full operating-day acceptance suite](prompts/M08/M08.02.md)** · `ASSURANCE — independently reviewed, measured test evidence, no invented results` · Trace `SC-01…SC-08`
082. **[M08.03 — Transaction concurrency and load test](prompts/M08/M08.03.md)** · `ASSURANCE — independently reviewed, measured test evidence, no invented results` · Trace `16.6,21`
083. **[M08.04 — Security, privacy and abuse review](prompts/M08/M08.04.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `20,21; G-12`
084. **[M08.05 — Backup and recovery dry run](prompts/M08/M08.05.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `21; G-11`
085. **[M08.06 — Operational alerting and on-call runbooks](prompts/M08/M08.06.md)** · `ASSURANCE — independently reviewed, measured test evidence, no invented results` · Trace `21`
086. **[M08.07 — Deployment, migration and feature-flag rollout](prompts/M08/M08.07.md)** · `ASSURANCE — independently reviewed, measured test evidence, no invented results` · Trace `21`
087. **[M08.08 — Release-readiness review and external validation plan](prompts/M08/M08.08.md)** · `ASSURANCE — independently reviewed, measured test evidence, no invented results` · Trace `4,21,RG3`

## M09

088. **[M09.01 — Plans, feature registry and versioned entitlements](prompts/M09/M09.01.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `SAAS-001/002; G-07`
089. **[M09.02 — Trial and subscription state machine](prompts/M09/M09.02.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `SAAS-001/005; G-14`
090. **[M09.03 — Usage journal and eligible-order meter](prompts/M09/M09.03.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `SAAS-003`
091. **[M09.04 — Product, seat, branch and automation limits](prompts/M09/M09.04.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `SAAS-004`
092. **[M09.05 — Overage rating and explainable invoice lines](prompts/M09/M09.05.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `SAAS-002/003; G-07`
093. **[M09.06 — Platform subscription invoicing and collections](prompts/M09/M09.06.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `SAAS-001/005; G-07`
094. **[M09.07 — Tenant lifecycle, overage and graceful suspension](prompts/M09/M09.07.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `SAAS-004/005; G-14`
095. **[M09.08 — Platform operations console and support audit](prompts/M09/M09.08.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `SAAS-006`
096. **[M09.09 — Paid-launch legal, security and finance gate](prompts/M09/M09.09.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `RG4/RG5; G-07/G-14`

## M10

097. **[M10.01 — Sales channel registry and installation management](prompts/M10/M10.01.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `INT-001/003`
098. **[M10.02 — Credential issuance, scope and rotation](prompts/M10/M10.02.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `INT-003/004/005`
099. **[M10.03 — Read-only public catalog and price/availability projection](prompts/M10/M10.03.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `INT-007/008`
100. **[M10.04 — Partner API gateway and developer contract](prompts/M10/M10.04.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `INT-006/007/010`
101. **[M10.05 — Optional partner order ingestion](prompts/M10/M10.05.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `INT-009; G-09/RG7`
102. **[M10.06 — Signed outbound webhooks and delivery center](prompts/M10/M10.06.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `INT-011`
103. **[M10.07 — API monitoring, budget and abuse controls](prompts/M10/M10.07.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `INT-003/006`
104. **[M10.08 — Partner sandbox, documentation and certification](prompts/M10/M10.08.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `INT-AC1…9; RG7`

## M11

105. **[M11.01 — Workforce module and confidential employee records](prompts/M11/M11.01.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `WF-001`
106. **[M11.02 — Shifts, holidays and schedules](prompts/M11/M11.02.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `WF-002`
107. **[M11.03 — Attendance clock-in/out and corrections](prompts/M11/M11.03.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `WF-002`
108. **[M11.04 — Leave policy and ledger](prompts/M11/M11.04.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `WF-002; G-10`
109. **[M11.05 — Salary structure and calculation preview](prompts/M11/M11.05.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `WF-003; G-10`
110. **[M11.06 — Payroll approval, finalize and payslips](prompts/M11/M11.06.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `WF-003; RG6`
111. **[M11.07 — Payroll corrections and retroactive changes](prompts/M11/M11.07.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `WF-003`
112. **[M11.08 — Incentive groundwork and optional future engine](prompts/M11/M11.08.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `WF-004`

## M12

113. **[M12.01 — Rich purchasing and supplier payments](prompts/M12/M12.01.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `PUR-003`
114. **[M12.02 — Advanced analytics and customer retention](prompts/M12/M12.02.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `AN-001/002, CRM-001`
115. **[M12.03 — Configurable automation rule editor](prompts/M12/M12.03.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `AUT-001…007`
116. **[M12.04 — Discounts, coupons, price books and bundles](prompts/M12/M12.04.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `PRC-002; P2 boundary`
117. **[M12.05 — Mobile workflow depth and performance](prompts/M12/M12.05.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `16.5,19`
118. **[M12.06 — Advanced privacy, export and retention](prompts/M12/M12.06.md)** · `HIGH — explicit design approval before code + independent review before merge` · Trace `20; G-12`
119. **[M12.07 — Scaling, cost, and noisy-neighbor hardening](prompts/M12/M12.07.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `16.6,21`
120. **[M12.08 — Release governance and backlog evolution](prompts/M12/M12.08.md)** · `STANDARD — design/implement/verify in one run if decisions are approved; human review before merge` · Trace `1,22,23`

## MF

121. **[MF.01 — Future native storefront domain contract only](prompts/MF/MF.01.md)** · `DEFERRED — design only after separate future authorization` · Trace `15.4 STR-F01/02`
122. **[MF.02 — Future visual page builder](prompts/MF/MF.02.md)** · `DEFERRED — design only after separate future authorization` · Trace `15.4 STR-F01`
123. **[MF.03 — Future customer checkout and channel experience](prompts/MF/MF.03.md)** · `DEFERRED — design only after separate future authorization` · Trace `15.4 STR-F02; INT-009`
