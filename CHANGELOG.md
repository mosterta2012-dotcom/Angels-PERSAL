# Changelog

## 2026-11-23 (web app)
- Web app v0.1 in app/: home, my leave, team approvals, people and PERSAL numbers, leave (HR), grading calculator, risk register, risk tracker with CSV export, audit log, help. Demo mode with role switcher; live mode on Supabase with Microsoft sign-in. GitHub Pages workflow.
- Database: v_leave_balance now applies the caller's row-level security.

## 2026-11-23 (database)
- Supabase schema: 27 tables, row-level security per role, PERSAL number and working-day functions, append-only audit log and leave ledger, private document bucket, seed lists. GitHub Action to deploy migrations.

## 2026-11-23
- Initial upload: development briefing (Word, PDF, Markdown), 20 design screens, HR policy master set, coverage register, discussion papers.
- PERSAL updates: leave on the PERSAL leave portal (HR-06 suite v1.1, Leave Policy Rev 3 draft), grading and salary scales, PERSAL numbers, direct/functional managers, risk register and tracker, QMS Hub link for policies.
