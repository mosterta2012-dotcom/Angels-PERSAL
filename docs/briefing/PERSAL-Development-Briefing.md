# PERSAL HR Portal — Development Briefing

Nov 21, 2026 · @Annemarie · For Brent (Head of Operations and Systems)

Build PERSAL as Angels' separate HR portal, as Lizelle asked during Indaba week: one place for every person's record from appointment to exit, with leave moving off SimplePay onto PERSAL on \[1 April 2027\]. Design reference: the Angels PERSAL design canvas (22 screens).

## 1. Purpose and scope

**Why it exists.** Angels has no single HR record. Leave sits in SimplePay, Excel trackers and paper forms; there are no employee numbers; salaries follow no scale; and confidential data is spread over email and folders. PERSAL gives every person one record with a PERSAL number, moves leave onto an approved workflow, and keeps confidential HR data inside four HR roles (POPIA, PAIA).

**Who it is for.** About 50 people: permanent, fixed-term, part-time and temporary staff, mentors on SLAs, client-based interns (usually 18-month contracts run on behalf of the client), Social Performance Interns, bursary holders and volunteers. Four HR roles work in PERSAL; staff and direct managers only use the leave portal; the QMS Administrator only sees the risk tracker.

### In scope for Release 1

| Area | What it covers | Policy reference |
| --- | --- | --- |
| Post establishment | Posts, levels, cost centres, funders, direct and functional manager per post | HR-05-PROC-01 |
| Grading and salary scales | Levels L1–L6, five steps per title, starting step, placement calculator | HR-05-PROC-01 v0.2 |
| Person record | Personal, appointment, pay, PERSAL number, Employment Equity, documents, history | HR-05, POPIA |
| Staff import | One-off load of the final staff list, checks, bulk PERSAL numbers | — |
| Requests and approvals | Appointment, agreement, probation, increase, regrade, banking, termination, leave adjustments | HR-05, HR-04, HR-09 |
| Leave (HR) and leave portal | Apply, approve, balances, closure, expiry warnings, unpaid leave to payroll | Leave Policy Rev 3 |
| Leave history import | Legacy records, per-person check, signed opening balances | Leave Policy Rev 3 |
| Recruitment | Vacancies, applicants, templates, offer letter with level and step | HR-04 |
| Internships and bursaries | Placements, logbooks, stipends, bursary agreements and payments | HR-04-INT-PROC-01, HR-08 |
| Onboarding and exits | HR-04-CHK-02 and HR-05-CHK-01 checklists, final pay with leave payout | HR-04, HR-05 |
| Performance, discipline and grievance | HR-07 reviews captured by HR; HR-03 cases | HR-03, HR-07 |
| Policies, risk and compliance | Policy register, roll-out, retention, HR risk register, risk tracker feed | QMS, ISO 31000 |
| Reports and audit log | Leave liability, headcount, turnover, cost per funder, EE counts; append-only log | EEA, POPIA |

### Out of scope

- Salaries, payslips and IRP5s. These stay in SimplePay; PERSAL only sends payroll instructions.
- Clocking and timesheets. These stay in Jibble; PERSAL reads attendance for leave checks.
- Training courses (Lead Academy), surveys, announcements and HR queries (Teams), wellness notes.
- Equipment. Laptops and other assets are requested in Asset Management; PERSAL only triggers new-starter and exit requests.
- Staff logging into PERSAL. Staff and managers use the leave portal only.

## 2. Where it sits

PERSAL is a separate HR portal with its own address and access group, not a tab that staff can open in the NPO Management System. It should still use the same stack, Entra ID sign-in, components and hosting as the NPO Management System and Asset Management, so you maintain one code base. \[Decision: confirm stack; APS-DEV-001 proposed React, Node, Azure SQL and Azure App Service.\]

&#91;embedded content: system context · PERSAL and 7 connections\]

Only PERSAL writes HR data. The leave portal and the risk tracker are small separate front ends on the same back end, each with its own permission set, so staff and the QMS Administrator never reach a personnel record.

### Architecture notes for the build

- One back end, three front ends: PERSAL (HR roles), leave portal (all staff), risk tracker (QMS Administrator).
- Shared tables for attachments, approval steps, notifications and the audit log across every request type.
- A scheduler for reminders, escalations, leave accrual, expiry warnings, contract end dates and the quarterly risk export.
- A working-day service (weekends, South African public holidays and the December closure) used by leave and every timeframe. Reuse the one built for Asset Management.
- A PDF service for offer letters, certificates of service and signed opening balances: render from the record, then lock and hash.
- Server-side permission checks on every call; screens only hide what the server already refuses.

## 3. Roles and access

Access follows the person's Angels Microsoft (Entra ID) account and role, from Entra security groups; there are no separate passwords. Only four roles log into PERSAL itself.

### Roles

| Role | Person today | Where | Main job |
| --- | --- | --- | --- |
| HOD HR | Dana Dreyer | PERSAL | Owns HR records; approves HR requests, closure dates, opening balances, imports; reverses requests |
| HR Administrator / HR Assistant | Jordan Smith | PERSAL | Captures records, requests, paper leave forms, documents, imports |
| Head of Finance | Gerald Erasmus | PERSAL | Budget and payroll steps; verifies banking; sends instructions to SimplePay; leave liability |
| CEO | Lizelle Coombs | PERSAL | Final approvals; approves HOD leave and closure dates; views Employment Equity data |
| Programme Manager: Bursaries & Internships | Planned | PERSAL (HR Administrator rights for interns and bursaries only) \[Decision\] | Placements, logbooks, stipends, bursary agreements |
| Employee | All staff | Leave portal | Own balances and requests only |
| Direct manager | Any employee with direct reports | Leave portal | Approves or declines direct reports' leave |
| Board Chair / Board Treasurer | Board | Leave portal | Approves the CEO's leave; final step when the CEO is the subject |
| QMS Administrator | Annemarie Mostert | Risk tracker | Publishes policies and procedures in the QMS Hub (PERSAL shows them read-only); follows HR risks and acknowledgement totals; no personal data |

### Permission matrix

V = view, C = create, E = edit, A = approve, own = own records, team = direct reports only.

| Area | HOD HR | HR Admin | Head of Finance | CEO | Employee | Direct manager | QMS Admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Person record (personal, appointment) | V E A | V C E | V | V | — | — | — |
| Pay, banking | V | V (masked) | V E A | V | — | — | — |
| Employment Equity fields | V | — | — | V | — | — | — |
| Post establishment, grading | V E A | V C | V A | V A | — | — | — |
| Requests and approvals | V A | V C | V A | V A | — | — | — |
| Leave | V E A | V C (paper forms) | V | V A (HODs) | own C | team A | — |
| Leave history import, opening balances | V A | V C | V A (liability) | — | own sign-off | — | — |
| Documents | V C E | V C | V (pay docs) | V | — | — | — |
| Risk register | V C E A | V C | V | V A (High, Critical) | — | — | V (no names) |
| Reports, exports | V export | V | V export | V export | — | — | risk export |
| Audit log | V | — | V | V | — | — | — |

Rules:

- Nobody approves their own request. If the requester holds the approving role, the step moves up one level (HOF → CEO; CEO → Board).
- A direct manager must be an employee. Functional managers and contractors have no approvals.
- Direct managers support non-leave requests on the form or by email; HR captures that support in PERSAL.

## 4. Data model

About 30 tables, prefixed `hr_`, plus lists. Attachments, approval steps, notifications and the audit log are shared polymorphic tables across all request types.

### Reference numbers

| Record | Format | Example | Issued |
| --- | --- | --- | --- |
| PERSAL number | 8 digits, random, check digit | 31847205 | On approval of appointment (2.2) or agreement (2.3) |
| Post number | 7 digits: department (2) + sequence (5) | 0200003 | On approval of an establishment request |
| Request | PR-YY-NNNN | PR-27-0042 | On submit; sequence resets each year |
| Leave request | LV-YY-NNNN | LV-27-0108 | On submit |
| HR risk | HR-R## | HR-R11 | On logging |
| Document | PERSALno\_TYPE\_YYYY-MM-DD | 31847205\_LEAVE\_2018-11-22 | On upload |

All sequences are issued by the database, never typed.

### PERSAL number algorithm

1. Generate 7 digits; the first is 1–9.
2. Add a Luhn check digit: from the right, double every second digit (subtract 9 if over 9), sum all digits, check digit = (10 − sum mod 10) mod 10.
3. Reject if it matches any number ever issued (`hr_persal_number`, including closed ones); retry.
4. Store as text (leading zeros never apply, but treat it as an identifier, not a number). Never changed, never reused. Suppliers get none.
5. Validate every typed PERSAL number with the same check, so one wrong digit and most swapped digits are caught.

### Lists (maintained by HOD HR)

Staff category (Permanent, Fixed-term, Part-time, Temporary, Contract (SLA), Intern, Volunteer, Bursary holder, Supplier) · Paid through (SimplePay payroll, Invoice (SLA), Stipend via SimplePay, Not paid) · Department (Office of the CEO, Operations, Human Resources, Marketing / PR, Finance, Logistics) · Placed with (Angels, client names) · Funder · Leave types · EEA occupational levels · Request types · Document types · Risk areas.

### Core tables

| Table | Purpose | Key fields |
| --- | --- | --- |
| hr\_person | One row per person | persal\_no, names, category, paid\_through, start\_date (first day worked), contract\_signed\_date, end\_date, placed\_with, jibble\_flag, status |
| hr\_person\_sensitive | ID, tax, banking, EE fields (encrypted, separate access) | id\_no, tax\_no, bank, ee\_gender, ee\_race, ee\_disability, ee\_level |
| hr\_post | Establishment | post\_no, title, department, level, cost\_centre, funder, status, direct\_manager\_post, functional\_manager\_post |
| hr\_grade\_scale | Steps per title per financial year | title, level, step 1–5 amounts, step\_gap\_pct, effective\_date |
| hr\_appointment | Person in post over time | person, post, level, step, start, end, reason\_for\_step |
| hr\_request | Every request (codes 2.2 … 9.9) | code, person, payload (old/new values), status, payroll\_effect |
| approval\_step | One row per step | request, role, user, decision, comment, time |
| hr\_payroll\_instruction | Sent to SimplePay | request, type, amount, effective, sent\_at, batch |
| hr\_leave\_request | Leave | person, type, from, to, working\_days, status, manager, reason, certificate |
| hr\_leave\_ledger | Every movement (append-only) | person, type, cycle, days (+/−), source (accrual, leave, closure, adjustment, legacy, expiry, payout) |
| hr\_leave\_cycle | Cycle per person and type | start, end, entitlement, carry\_over\_deadline |
| hr\_closure | December closure per year | start, end, approved\_by |
| hr\_legacy\_leave | Imported history (read-only) | person, type, from, to, days, source, doc\_ref, status |
| hr\_opening\_balance | Signed balance at cut-over | person, type, days, employee\_signed, hr\_signed, disputed\_days |
| hr\_document | Files on the person | type, expiry, file, uploaded\_by |
| hr\_checklist\_item | Onboarding and exit tasks | person, checklist, task, owner, due, status |
| hr\_review, hr\_case | HR-07 reviews; HR-03 cases | … |
| hr\_placement, hr\_logbook, hr\_bursary | Interns and bursaries | client, supervisor, period, stipend; agreement, payments |
| hr\_risk, hr\_risk\_event | Risk register and its trail | likelihood, impact, level, owner, reported\_to, reported\_at, status, closure\_evidence |
| hr\_import\_batch | Staff and leave imports | file, checks, approved\_by |
| notification, audit\_log | Shared | … |

## 5. Status models and workflows

Every status change is stored with time and user. Approved records are never edited; a correction is a new reversing request (9.9).

| Record | Statuses in order | Ends when |
| --- | --- | --- |
| Request (all codes) | Draft → Submitted → With \[role\] (one per step) → Approved → Sent to payroll (if it has a payroll effect) → Done | Done, Declined, Returned, Cancelled |
| Leave request | Submitted → With direct manager → (escalated after \[3\] working days) → Approved → Taken | Taken, Declined (reason), Cancelled by employee |
| Leave ledger cycle | Open → Closed → Carry-over window (4 months) → Settled | Settled (used, forfeited by management decision, or paid out on exit) |
| Opening balance | Not started → Checking → Differences → Agreed → Signed | Signed, or Disputed (undisputed part goes live) |
| Post | Proposed → Approved → Vacant funded → Filled → Closed | Closed |
| Person | Pre-start → Active → Notice → Exited | Exited (PERSAL number locked) |
| Checklist | Not started → In progress → Done | Done |
| HR risk | Open → Reported → Action in progress → Closed | Closed with note, evidence ref and approval |
| Import batch | Uploaded → Checked → Fix needed → Approved → Loaded | Loaded |

### Request types and approval routes

| Code | Request | Route | Payroll effect |
| --- | --- | --- | --- |
| 2.2 | Appointment (level, starting step, reason) | HR → HOD HR → HOF → CEO (Board for senior posts). Step 3 needs HOD HR + HOF; steps 4–5 the CEO | Starts pay; issues PERSAL number |
| 2.3 | Agreement new / renew / end | HR → HOD HR → CEO | Sets end date; issues PERSAL number |
| 2.4 | Probation outcome | Direct manager → HR → HOD HR | Terminate stops pay |
| 3.1 | Leave application (portal) | Employee → direct manager; HODs → CEO; CEO → Board | Unpaid leave → SimplePay |
| 3.4 | Paper leave form | Employee → direct manager → HR captures | As 3.1 |
| 3.6 | Opening balance / adjustment | HR → HOD HR → HOF | None |
| 3.7 | December closure | HOD HR → CEO | Deficit recorded |
| 4.2 | Annual increase / step | HR → direct manager → HOD HR → HOF → CEO | Changes pay |
| 4.3 | Regrade after JD change | HOD → HR (grading) → HOD HR → HOF → CEO | New level, lowest step ≥ current pay |
| 4.5 | Bursary / stipend payment | HR → HOD HR → HOF | Once-off payment |
| 4.9 | Banking change | HR → HOF verifies | Next pay run |
| 5.1 | Termination | Direct manager → HOD HR → HOF → CEO | Final pay + leave payout |
| 5.2 | Suspension | HOD HR → CEO | \[Confirm\] |
| 9.9 | Reverse an approved request | HOD HR → HOF → CEO | Reverses |

## 6. Screens

Twenty-two screens are drawn on the [Angels PERSAL design canvas](https://claude.ai/artifact/NS8gn3KKj4DwDdNMpSY4Jo); build to those layouts with the NPO Management System's components. Values in \[square brackets\] on the canvas are placeholders or open decisions.

| No. | Screen | Used by | What to build |
| --- | --- | --- | --- |
| 0.0 | Dashboard | HR roles | Tiles, waiting for action, people by category, needs attention |
| 1.1 | Post establishment | HR roles | Posts with level, funder, direct and functional manager; filters; create post request |
| 1.2 | Grading & salary scales | HR, HOF, CEO | Levels, 5 steps per title, step gap setting, starting step guide, placement calculator, rules |
| 1.5 | Recruitment | HR | Vacancies, applicants, editable templates (offer letter with level and step), replies |
| 1.6 | Internships & bursaries | HR, Programme Manager B&I | Placements (placed with, client supervisor), logbooks, stipend run, bursary payments |
| 2.1 | Person record | HR roles | All sections incl. PERSAL number generator/check, EE (restricted), leave balances, documents, history |
| 2.2 | Staff import | HR | Upload, 8 checks, preview, HOD HR approval, bulk PERSAL numbers |
| 2.4 | Onboarding & exits | HR | HR-04-CHK-02 and HR-05-CHK-01 with owners, due dates, progress |
| 2.6 | Documents | HR | Required documents per category, uploads, missing items |
| 3.0 | Leave (HR) | HR roles | Entitlements, who approves, follow-up flags, December closure, unpaid leave to payroll |
| 3.2 | Leave history import | HR, HOF | Cut-over steps, per-person check, sources, differences, sign-off |
| 3.5 | Performance | HR | HR-07 review capture, ratings, review schedule |
| 4.0 / 6.0 | Transactions & approvals | HR roles | Approval route, details, what changes, decision, request types |
| 5.5 | Discipline & grievance | HOD HR | HR-03 cases |
| 7.0 | Reports | HR roles | Leave liability, cost per funder, headcount, turnover, EE counts and threshold |
| 8.0 | Policies & compliance | HR roles | Register, risk register, roll-out, retention, Board dashboard, coverage |
| 9.0 | Roles & access | HOD HR | Role table, rules, tool map |
| 9.1 | Audit log | HOD HR, HOF, CEO | Filters, masked values, export |
| P1 | Leave portal | Staff, direct managers, Board | My leave (balances, apply, requests, expiry warning); team approvals |
| R1 | Risk tracker | QMS Administrator | Alerts, all HR risks with reporting status, trail, quarterly export |

### Behaviour common to all screens

- South African dates (21 Nov 2026), rand (R), working days that skip weekends, public holidays and the December closure.
- Statuses as coloured badges with plain words.
- Every list has search, filters and an export for roles that may export; every export is logged.
- Pay, bank, ID and EE values are masked until the user opens them; opening one is logged.
- The leave portal and risk tracker work on a phone.

## 7. Notifications and escalations

Teams first (chat or Activity card with a deep link), email as the fallback. Messages outside PERSAL never contain pay, ID, health or EE details, only the reference, the person's first name where the reader may see it, and the action.

### Event messages (sent at once)

| Trigger | Recipients | Message (plain words) |
| --- | --- | --- |
| Request submitted or moved to a step | The role at that step | "PR-27-0042 is waiting for your approval." |
| Request approved, declined or returned | HR Administrator, requester | Outcome and comment |
| Leave requested | Direct manager | "\[Name\] asked for annual leave 19–23 Apr (5 days)." |
| Leave approved or declined | Employee | Outcome and the manager's reason |
| Sick leave over 2 days without a certificate | Employee, HR | "Please upload your medical certificate." |
| Unpaid leave approved | Head of Finance | Payroll instruction ready |
| Appointment approved | HR, IT (via Asset Management), Head of Finance | New starter: PERSAL number, start date, equipment request |
| Termination approved | HR, Asset Management, Head of Finance | Exit checklist opened; equipment return |
| HR risk logged, level or status changed | QMS Administrator (risk tracker) | Risk ID, area, level, owner, deadline; no names |
| High or Critical risk logged | Owner, CEO (and Board for Critical) | Report required within \[48 hours\] / immediately |

### Reminders and escalations (scheduler)

| Rule | When | Recipients |
| --- | --- | --- |
| Leave not actioned | After \[3\] working days | Next level up (HOD, then HOD HR); employee told |
| Carried-over leave expiring | 60 and 30 days before the 4-month limit | Employee, direct manager |
| Probation and 30/60/90-day reviews due | 7 days before | Direct manager (by email), HR |
| Contract, SLA or project end date | 60 days before | HR, HOD HR |
| Document expiring or missing | Monthly | HR |
| Opening balance not signed | Weekly until cut-over | Employee, HR |
| Risk not reported in time for its level | Deadline passed | Owner, QMS Administrator |
| Risk review or action overdue | Due date passed | Owner, QMS Administrator |
| Quarterly risk export ready | \[5\] working days before the quarterly report | QMS Administrator |

People may mute non-urgent reminders but never approvals, expiry warnings or risk escalations.

## 8. Integrations

Only one integration writes money data: payroll instructions to SimplePay. Everything else is read-only, a notification or a trigger.

| System | Direction | What passes | How (suggested) | Release |
| --- | --- | --- | --- | --- |
| Microsoft Entra ID | In | Sign-in, MFA, security groups → roles | OIDC; group claims | 1 |
| Microsoft Teams / email | Out | Notifications with deep links | Graph API; email fallback | 1 |
| SimplePay | Out | Approved payroll instructions: new starter, increase, unpaid leave days, banking change, termination with leave payout | Release 1: export file per pay run (CSV in SimplePay's import layout) checked and uploaded by the Head of Finance. Later: SimplePay API if available \[Decision\] | 1 |
| SimplePay | In (once) | Leave transactions, adjustments and balances per person for the legacy import | Admin report export (Excel) | 1 |
| Jibble | In | Daily attendance per person, to flag absence without approved leave | Jibble API or monthly export \[Decision\] | 2 |
| QMS risk register / risk tracker | Out | HR risk ID, area, level, owner, dates, status, evidence ref; no names | Same back end; read-only view and export | 1 |
| Asset Management (NPO Management System) | Out | New starter (name, start date, department, role tier) on appointment; exit (last day) on termination | Event to Asset Management's request API | 2 |
| Finance Management | Out | Bursary and stipend payment requests where paid outside SimplePay | Payment Request link, as in Asset Management | 2 |
| SharePoint | Out | Signed PDFs filed to the HR library | Graph API | 3 |

### Policies and procedures from the QMS Hub

Policies and procedures are edited, approved and published only in the QMS Hub, the single source of truth for controlled documents, by the QMS Administrator. HOD HR owns the content of HR documents. PERSAL and the other systems (Asset Management, Finance, Travel) show the current published version read-only, with its code, version and effective date.

- **QMS Hub → PERSAL (in, read-only):** document code, title, version, effective and review dates, file link. PERSAL's Policy Register and every policy link read from this; nobody edits a policy in PERSAL.
- **PERSAL → QMS Hub (out, totals only):** acknowledgements per document and version (for example 38 of 46), roll-out status, and HR risks for the risk tracker. Never names.
- A new version published in the QMS Hub starts a new acknowledgement round in PERSAL automatically.
- The QMS Administrator has no PERSAL login; one QMS Hub login covers every system's documents.

### SimplePay payroll file in detail

1. Each approved request with a payroll effect creates a row in `hr_payroll_instruction` with status Ready.
2. Before the cut-off (\[20th\] of the month), the Head of Finance opens the pay-run batch, checks each line and downloads the file.
3. After uploading to SimplePay, the Head of Finance marks the batch Sent; the requests move to Done.
4. A batch can never be edited after Sent; a mistake is fixed with a reversing request.
5. Unpaid leave goes as days (not rand), so SimplePay calculates the deduction from the salary it holds; PERSAL does not store salary calculations twice.

## 9. Business rules and validation

These come from Leave Policy Rev 3 (draft), HR-05-PROC-01 v0.2, HR-04-INT-PROC-01 v0.2, HR-09 v0.2 and the BCEA. Enforce them in the back end, not only in the screens. Values in \[brackets\] are settings.

### Leave

| ID | Rule |
| --- | --- |
| L-01 | Annual leave cycle runs from the employment start date (first day worked, not the contract signing date). |
| L-02 | Annual entitlement 15 working days per year (1 day per 17 worked), accrued monthly; 20 days from the cycle after 5 completed years. |
| L-03 | Working days only: weekends, South African public holidays (incl. Sunday-to-Monday moves and declared days) and non-working days never count. |
| L-04 | Sick leave: 30 days per 36-month cycle; first 6 months 1 day per 26 worked. Certificate required for more than 2 consecutive days, or each day at management discretion; due by the day of return. |
| L-05 | Family responsibility: 3 days per annual cycle. Maternity, parental, adoption and commissioning parental leave per BCEA; unpaid unless stated. |
| L-06 | Annual leave is taken in the December closure; at other times only by exception and only if it does not create a deficit after the closure provision. |
| L-07 | Closure leave is booked for all employees by the system when the CEO approves the closure dates; a resulting negative balance is recorded as a deficit, with the employee's written agreement stored (BCEA s34). |
| L-08 | Carried-over leave must be used within 4 months of the new cycle unless management approved longer; warn at 60 and 30 days; forfeiture only by a recorded management decision, never automatic \[for review: BCEA s20(4)\]. |
| L-09 | No leave during the notice period. |
| L-10 | Time off for overtime is its own type with an hours bank; never deducted from annual leave. |
| L-11 | Unpaid leave only on approval (direct manager and HOD HR); sent to SimplePay as days. |
| L-12 | On exit, pay out the current cycle's unused leave plus carried-over leave up to 5 days if within the 4-month window. |
| L-13 | Contractors (SLA), volunteers and suppliers have no leave in PERSAL. Intern leave depends on the employer per placement \[Decision\]. |
| L-14 | The approver is the direct manager on the person's post; HODs → CEO; CEO → Board Chair or Treasurer; contractors and functional managers never approve. |

### Grading and pay

| ID | Rule |
| --- | --- |
| G-01 | Every employee post has a level L1–L6; step amounts are per title per financial year; step 3 is the market rate; step gap is a setting \[5%\]. |
| G-02 | Starting step 1 by default; 2 needs a reason; 3 needs HOD HR and HOF; 4–5 need the CEO and a written reason. |
| G-03 | Warn if a new appointee's step is above an incumbent in the same title. |
| G-04 | Annual step by review rating: 3 = 1 step, 4–5 = 2 steps, 1–2 = none; never above step 5. |
| G-05 | One annual increase date; off-cycle pay changes only via 4.3 regrade or promotion. |
| G-06 | Regrade: lowest step of the new level at or above current pay. |
| G-07 | Current salaries are placed as they are (on a step, between steps, above step 5 or below step 1) and the placement is stored. |

### Records and approvals

| ID | Rule |
| --- | --- |
| R-01 | Appointment only to an approved, vacant, funded post. |
| R-02 | Every employee has exactly one direct manager, who must be an employee. |
| R-03 | Nobody approves their own request or a request about themselves. |
| R-04 | Approved records are immutable; corrections through 9.9 only. |
| R-05 | PERSAL numbers per section 4; issued only by the system. |
| R-06 | Bank detail changes take effect only after the HOF verifies them. |

### Risk

| ID | Rule |
| --- | --- |
| K-01 | Score = likelihood × impact (1–5 each): Low 1–5, Medium 6–11, High 12–19, Critical 20–25. |
| K-02 | Reporting deadline by level: Critical immediately (CEO + Board), High \[48 hours\] (CEO), Medium \[5\] working days (HOD), Low quarterly. |
| K-03 | Closing needs a closure note, evidence reference and HOD HR approval; CEO too for High and Critical. |
| K-04 | Risk records sent to the tracker never include names or personal details. |

### Segregation of duties

The person who captures a request cannot approve it; the HR Administrator cannot change bank details or salaries; the HOF cannot create appointments; only HOD HR can approve imports and opening balances; nobody can delete audit entries.

## 10. Reports

Reports build themselves from the records; nobody compiles them by hand.

| Report | Calculation | For | When |
| --- | --- | --- | --- |
| Leave liability | Unused annual days per person × daily rate (monthly salary × 12 ÷ \[261\] working days), by department | Head of Finance | Month end; year end for the financial statements |
| Salary cost per funder | Sum of step amounts of filled posts by funder and cost centre, against budget | Head of Finance, CEO | Monthly |
| Headcount and turnover | Leavers ÷ average headcount, last 12 months; client interns finishing contracts shown apart | CEO, Board | Quarterly |
| Employment Equity | Counts per EEA occupational level; breakdowns only for HOD HR and CEO; employee count against the 50 threshold | HOD HR, CEO | Quarterly; EEA2/EEA4 when designated |
| Leave taken and expiring | By department and person | HODs, HOD HR | Monthly |
| Unpaid leave and payroll instructions | Per pay run | Head of Finance | Each pay run |
| Probation, reviews and contracts due | Next 60 days | HOD HR, HODs | Monthly |
| Intern placements and stipends | Per client and programme | HOD HR, Programme Manager B&I, clients | Monthly |
| Board HR compliance dashboard | Status per HR area incl. risk management | Board | Quarterly |
| HR risk export | Risks, levels, reporting status, closures this quarter; no names | QMS Administrator | Quarterly |
| Department of Labour pack | Contracts, leave records, payslip references, discipline, equity | HOD HR | On request |

Exports carry the QMS footer: "Controlled document. Printed copies are uncontrolled."

## 11. Security, POPIA, audit and retention

PERSAL holds special personal information (health certificates, Employment Equity data) and financial data, so it is built to the strictest level in the NPO Management System.

### Data minimisation

- Staff never log into PERSAL; the leave portal shows only the person's own leave, and a manager only their direct reports' requests.
- ID numbers, tax numbers, bank details and EE fields sit in a separate encrypted table with its own access check.
- Medical certificates are visible only to HR; managers see "certificate received", never the document.
- The risk tracker receives no names or personal details.
- Staff home addresses are not stored beyond what the contract needs.

### Access and security

- Entra ID sign-in with the organisation's MFA policy; no local accounts. Roles from Entra security groups; role changes logged.
- Row-level filtering in the back end for every query.
- Masked display of pay, bank, ID and EE values; revealing one is logged.
- Signing (opening balances, offer letters) re-authenticates and stores signer, time and a SHA-256 hash of the locked PDF.
- Files only through authorised links; exports limited to HOD HR, HOF and CEO, each logged.
- Hosting in a South African or EU Azure region \[Decision\]; encryption at rest and in transit; daily backups with tested restore.

### Audit trail

`audit_log` is append-only: no update or delete for any role, including admin. It records every create, field change (old and new value, masked for sensitive fields), status change, approval, view of a sensitive field, export, import, role change and sign-in, with user and time. HOD HR, HOF and CEO can view and filter it; exports go to the Information Officer on request.

### Retention (placeholders until the retention schedule is confirmed)

| Record | Keep for |
| --- | --- |
| Personnel file | \[5\] years after termination |
| Leave records | At least 3 years (BCEA s31); kept with the personnel file |
| Payroll instructions and financial records | \[7\] years |
| Recruitment records of unsuccessful applicants | \[1\] year |
| Audit log | \[5\] years |
| HR risk register | \[5\] years after closure |

Build retention as a setting per record type with a yearly job that lists records due for deletion for HOD HR to approve, rather than deleting automatically.

## 12. Build phases and go-live

Build the records and leave first, because leave must leave SimplePay on \[1 April 2027\] and everything else hangs off the person record and the PERSAL number. Dates are proposals to fit that cut-over.

| Phase | Months (proposed) | Delivers | Done when (gate) |
| --- | --- | --- | --- |
| 1. Foundation | Dec 2026 – Jan 2027 | Entra sign-in and roles, person record, post establishment, staff import, PERSAL numbers, documents, audit log, Roles & access | Final staff list loaded and approved by HOD HR; every person has a PERSAL number and a direct manager |
| 2. Leave | Feb – Mar 2027 | Leave rules engine, working-day service, leave portal, HR leave screen, December closure, leave history import, opening balance sign-off, SimplePay payroll file | Every opening balance signed or flagged disputed; parallel run of one month matches; HOD HR and HOF sign off. Leave stops in SimplePay on cut-over day |
| 3. Lifecycle and pay | Apr – Jun 2027 | All request types and approvals, grading and salary scales, onboarding and exits, recruitment, internships and bursaries, reports | Scales approved by the CEO and Board; first pay run with PERSAL instructions reconciles to SimplePay |
| 4. Compliance | Jul – Sep 2027 | Performance, discipline and grievance, policies, risk register and risk tracker, Jibble attendance, Asset Management trigger, SharePoint filing | First quarterly risk export produced from the tracker; Board dashboard live |

### Later, outside Release 1

- SimplePay API instead of the payroll file, if SimplePay offers it.
- E-signature for contracts and acknowledgements \[Decision: Gerald\].
- Staff acknowledging policies in the leave portal.

### Go-live

- Train each group before its phase goes live with the PERSAL training guides and slides (HR team; staff and managers; QMS Administrator).
- Keep the paper leave form as the fallback for the first month after cut-over.
- After go-live, the policy owners update Leave Policy Rev 3, HR-05-PROC-01 and the guides with any screen changes and the decided values in section 14.

## 13. Test scenarios and acceptance

Run each scenario end to end with real people in their real roles, on test accounts. A phase is accepted when every scenario for it passes and HOD HR and the HOF sign off.

| No. | Scenario | Expected result |
| --- | --- | --- |
| T-01 | Load the final staff list with one missing direct manager | That row is held back; the rest load after HOD HR approval, each with a unique valid PERSAL number |
| T-02 | Type a PERSAL number with one digit wrong | Rejected as invalid |
| T-03 | Appoint a new employee on step 3 | Needs HOD HR and HOF; PERSAL number issued; SimplePay line Ready; Asset Management new-starter request created |
| T-04 | Appoint someone above an incumbent in the same title | Warning shown and reason required |
| T-05 | Employee applies for 5 days over a week with a public holiday | Counts 4 days; goes to the direct manager |
| T-06 | Direct manager does nothing for 3 working days | Request moves to the next level; employee told |
| T-07 | HOD applies for leave | Goes to the CEO, not to themselves |
| T-08 | CEO approves December closure dates | Leave booked for every employee; new starter with too few days shows a deficit and a written-agreement task |
| T-09 | Employee with 4 days carried over reaches 60 and 30 days before the 4-month limit | Warnings to employee and manager; nothing forfeited without a management decision |
| T-10 | Sick leave of 3 days without a certificate | Reminder sent; HR flag shown |
| T-11 | Employee asks for leave during notice period | Blocked with the policy reason |
| T-12 | Unpaid leave approved | Days appear on the next SimplePay file |
| T-13 | Time off for overtime | Deducted from the hours bank, not from annual leave |
| T-14 | Contractor set as direct manager | Refused |
| T-15 | Annual review rating 4 at step 4 | Moves to step 5 only (maximum) |
| T-16 | Regrade to a higher level | Lowest step at or above current pay |
| T-17 | Termination with 8 unused current-cycle days and 3 carried over | Payout 11 days on the final pay instruction; PERSAL number locked |
| T-18 | Legacy import with public holidays recorded as leave | Flagged as wrongly deducted in the per-person check |
| T-19 | Employee signs their opening balance | Locked PDF with hash; balance goes live on cut-over |
| T-20 | High risk logged and not reported in 48 hours | Alert to owner and QMS Administrator; tracker shows it late |
| T-21 | Risk closed without evidence | Refused |
| T-22 | HR Administrator tries to change a salary | Refused and logged |
| T-23 | Any user tries to edit or delete an audit entry | Impossible |
| T-24 | Staff member opens the leave portal | Sees only their own leave; no personnel data reachable through the API |
| T-25 | QMS Administrator opens the risk tracker | No names or personal details anywhere, including exports |

### Non-functional acceptance

- Pages load in under 3 seconds on home broadband; the leave portal and risk tracker work on a phone.
- Works in Edge and Chrome; accessible labels on every control.
- Working-day calculations correct across South African public holidays and the December closure.
- Daily backup with a tested restore.

## 14. Open decisions and references

Build these as settings, not hard-coded values, so the build can start before they are decided.

| No. | Decision | Who decides | Where it is used |
| --- | --- | --- | --- |
| D-01 | Stack and hosting region (same as NPO Management System?) | Brent, Gerald | Section 2, 11 |
| D-02 | Cut-over date for leave (proposed 1 April 2027) | Dana, Gerald | Phase 2 |
| D-03 | 4-month forfeiture of carried-over leave vs BCEA s20(4) | Dana, labour adviser | L-08 |
| D-04 | Written agreement for recovering a closure deficit on exit | Dana, labour adviser | L-07 |
| D-05 | Leave rules for interns per employer (Angels or client) | Dana | L-13 |
| D-06 | Rand values per step, step gap, grading of each title | Gerald, Dana, CEO, Board | G-01 |
| D-07 | Experience thresholds for starting steps 2 and 3 | Dana, Gerald | G-02 |
| D-08 | Annual increase date | Gerald, CEO | G-05 |
| D-09 | Leave escalation days and risk reporting deadlines | Dana | Section 7, K-02 |
| D-10 | SimplePay file layout or API; payroll cut-off day | Gerald | Section 8 |
| D-11 | Jibble API or monthly export | Dana, Brent | Section 8 |
| D-12 | Access for the Programme Manager: Bursaries & Internships | Dana | Section 3 |
| D-13 | Bookkeeper: employee or outsourced (PERSAL number or not) | Gerald | Section 4 |
| D-14 | Who receives the quarterly risk report | Brent | K-02, reports |
| D-15 | Retention periods | Dana, Information Officer | Section 11 |
| D-16 | E-signature (later) | Gerald | Section 12 |

**D-17 QMS Hub link.** How PERSAL and the other systems read published documents from the QMS Hub: a shared SharePoint document library with metadata, or a small read-only feed. Who decides: Brent, with the QMS Administrator. Where it is used: section 8, Policies & compliance screen.

### Reference documents

| Document | Where |
| --- | --- |
| Angels PERSAL design canvas (22 screens) | [Design canvas](https://claude.ai/artifact/NS8gn3KKj4DwDdNMpSY4Jo) |
| Leave Policy Rev 3 (draft) | HR Policies v0.2 folder |
| HR-05-PROC-01 Remuneration & Establishment v0.2 | HR Policies v0.2 folder |
| HR-04-INT-PROC-01, HR-08, HR-09, HR-04-CHK-02, HR-05-CHK-01 v0.2 | HR Policies v0.2 folder |
| Grading & salary scales discussion paper | Shared with Dana, Gerald and Brent (Nov 2026) |
| Staff list for PERSAL numbers (merged) | HR, restricted |
| PERSAL leave data and system readiness summary | Shared with Dana and Gerald (Nov 2026) |
| Asset Management development briefing | NPO Management System (for the shared services and patterns) |

Contact for process questions: Annemarie Mostert, Operations and Programme Systems Coordinator. HR data decisions rest with Dana, Gerald and you.
