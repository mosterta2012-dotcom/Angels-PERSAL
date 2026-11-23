# Putting the PERSAL web app online

The web app is in `app/`: plain HTML, CSS and JavaScript, no build step. GitHub Pages hosts it; Supabase holds the data.

## Step 1 – See it online in demo mode (5 minutes)
1. Upload the repository to GitHub (keep it **Private** if your plan allows Pages on private repos; otherwise make a
   separate public repo that contains only the `app/` folder and `.github/workflows/pages.yml` — never the policies).
2. GitHub → Settings → Pages → Source: **GitHub Actions**.
3. Actions → "Publish the PERSAL web app" → Run workflow.
4. Open the address it shows (for example `https://<your-account>.github.io/angels-persal/`).

Demo mode shows sample people only. Use **View as** at the top to see each role: HOD HR, HR Administrator,
Head of Finance, CEO, Employee, Direct manager, QMS Administrator. Nothing is saved online.

## Step 2 – Connect the real database
1. Set up Supabase first: `docs/SUPABASE-SETUP.md` (POPIA hosting note included).
2. Supabase → Project Settings → API: copy the **Project URL** and the **anon public** key.
3. In `app/config.js` set `DEMO: false` and paste both values. Commit: the site republishes automatically.
4. Supabase → Authentication → URL Configuration: add your GitHub Pages address as the Site URL and a Redirect URL.
5. Sign in with Microsoft (Azure provider) or the emailed link. HOD HR then links each person: `hr_person.auth_user_id`
   = the user's id, and gives roles in `app_user_role`.

The anon key is meant to be public: the database's row-level security decides what each person sees.

## What is in this first version
| Page | Who |
| --- | --- |
| Home (tiles for your role) | Everyone |
| My leave: balances, apply (working days counted, public holidays skipped), my requests, cancel | Staff |
| Team approvals: approve, or decline with a reason | Direct managers |
| People and person record, issue PERSAL number | HR core |
| Leave (HR): all requests | HR core |
| Grading & salary scales with salary calculator | HR core |
| HR risk register: log, report, close with evidence | HR core |
| Risk tracker with quarterly CSV export (no names) | QMS Administrator, HR core |
| Audit log | HOD HR, Head of Finance, CEO |
| How to use | Everyone |

Pages refuse roles that may not use them; the database refuses the data as well.

## Still to build (briefing sections 6–8)
Post establishment, staff import, onboarding and exits, documents upload, requests and approval routes, leave
accrual and expiry warnings, December closure, escalation, Teams notifications, SimplePay payroll file, reports.
The full designs are on the canvas (`design/screens/`).
