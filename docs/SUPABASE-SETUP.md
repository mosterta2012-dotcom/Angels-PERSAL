# Setting up the PERSAL database on Supabase

The `supabase/` folder holds the PERSAL database built from the development briefing:
27 tables, row-level security for every role, the PERSAL number and working-day functions,
an append-only audit log and leave ledger, a private document bucket, and starter lists (no personal data).
It was tested on PostgreSQL 16 before upload.

> **Decision D-01 first.** The briefing leaves the stack and hosting to Brent and Gerald. Agree that Supabase is
> the platform before loading any real staff data.

## 1. POPIA before you start
- Supabase has no South African region. Choose an EU region (for example Frankfurt `eu-central-1`) and record the
  cross-border transfer under POPIA section 72 (adequate protection / agreement) with the Information Officer.
- Use a paid plan with daily backups, and turn on MFA for every Supabase dashboard user.
- Load **test data only** until the Information Officer signs off. Never commit staff data to GitHub.

## 2. Create the project
1. Sign in at supabase.com with the Angels account → New project → name `angels-persal`, EU region, strong database password.
2. Note the **Project ID** (Settings → General) and the **database password**.
3. Create an access token: Account → Access Tokens → Generate.

## 3. Connect GitHub (deploys automatically)
In the GitHub repository → Settings → Secrets and variables → Actions → add:
`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`.
Then Actions → "Deploy database to Supabase" → Run workflow. Every later change in `supabase/migrations/` deploys on push to `main`.

Alternatively, from a laptop with the Supabase CLI:
```
supabase link --project-ref <project-id>
supabase db push
psql "<connection string>" -f supabase/seed.sql
```

## 4. Load the starter lists
Run `supabase/seed.sql` once (SQL Editor → paste → Run): departments, funders, leave types, public holidays 2026–2027
(check against gov.za), and the proposed level per title (amounts empty until approved).

## 5. Sign-in with Microsoft (Entra ID)
Authentication → Providers → Azure: register an app in Entra, paste the client ID and secret, tenant URL as in `config.toml`.
Then give roles: insert rows into `app_user_role` (HOD HR does this through the app later).

| Role in `app_user_role` | Who |
| --- | --- |
| `hod_hr`, `hr_admin`, `head_of_finance`, `ceo` | PERSAL core (4 HR roles) |
| `programme_manager_bi` | Programme Manager: Bursaries & Internships (planned) |
| `employee`, `direct_manager`, `board` | Leave portal |
| `qms_admin` | Risk tracker (`v_risk_tracker` only) |

## What the database enforces (tested)
- PERSAL numbers: 8 digits, random, Luhn check digit, unique, never reused (`generate_persal_number()`, `is_valid_persal()`).
- Working days skip weekends and public holidays (`working_days()`); December closure dates live in `hr_closure`.
- No annual leave during the notice period; a decline needs a reason.
- Nobody approves their own request.
- A risk can only be closed with a note, evidence and an approver; the risk tracker view shows no names.
- `audit_log` and `hr_leave_ledger` are append-only; ID, tax, bank and EE values are masked in the audit log.
- Employees see only their own leave and person row; managers see their direct reports' leave;
  HR Admin cannot read ID, bank or EE data; nothing is visible to anonymous users.

## Still to build in the application layer
Leave accrual and expiry warnings (scheduler), escalation after [3] working days, Teams notifications,
the SimplePay payroll file export, imports, PDFs and signing. See briefing sections 7, 8 and 12.
