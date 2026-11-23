# Changelog

## 2026-11-23 (web app)
- Web app v0.1 in app/: home, my leave, team approvals, people and PERSAL numbers, leave (HR), grading calculator, risk register, risk tracker with CSV export, audit log, help. Demo mode with role switcher; live mode on Supabase with Microsoft sign-in. GitHub Pages workflow.
- Database: v_leave_balance now applies the caller's row-level security.

## 2026-11-23 (database)
- Supabase schema: 27 tables, row-level security per role, PERSAL number and working-day functions, append-only audit log and leave ledger, private document bucket, seed lists. GitHub Action to deploy migrations.

## 2026-11-23
- Initial upload: development briefing (Word, PDF, Markdown), 20 design screens, HR policy master set, coverage register, discussion papers.
- PERSAL updates: leave on the PERSAL leave portal (HR-06 suite v1.1, Leave Policy Rev 3 draft), grading and salary scales, PERSAL numbers, direct/functional managers, risk register and tracker, QMS Hub link for policies.

## 2026-11-23 · Web app matches the prototype
- Menu now follows the prototype sidebar (People & Payroll Hub, codes 0.0–9.1), plus Leave portal, Quality and Help groups.
- All 20 prototype screens are in `app/screens/` and open from the menu (marked as prototype screens with placeholder values).
- Working pages (Dashboard, People, Leave, Grading, Audit log, Risk tracker, My leave) show the full prototype screen underneath.
- Root `index.html` + `.nojekyll` so GitHub Pages opens the app, not the README.
- Design screens refreshed from the canvas (Documents updated).
