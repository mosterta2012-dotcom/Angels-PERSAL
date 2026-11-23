# Angels PERSAL — HR Portal

Design, development briefing and HR policy set for **PERSAL**, the separate HR portal for Angels Resource Centres.
Status: **design and drafts, November 2026** — not yet built. Values in `[square brackets]` are placeholders or open decisions.

> **Private repository only.** Contains internal HR policies and Board material. Never commit personal information
> (staff lists, ID numbers, salaries, leave records, medical or Employment Equity data) — see `.gitignore` and POPIA.

## Start here

| What | Where |
| --- | --- |
| Development briefing (14 sections, build phases, tests, open decisions D-01 to D-17) | `docs/briefing/PERSAL-Development-Briefing.md` (also `.docx` / `.pdf`) |
| Screen designs (20 screens, `.dc.html` canvas source) | `design/screens/` — list in `design/SCREENS.md`; live canvas: https://claude.ai/artifact/NS8gn3KKj4DwDdNMpSY4Jo |
| HR policies and procedures (folders 01–11, current + PERSAL drafts) | `policies/` |
| Coverage register (documents → PERSAL screens, POPIA/PAIA/ISO notes, gaps G-01 to G-09) | `registers/00_Registers & Evidence/HR Document Coverage Register - PERSAL, POPIA, PAIA, ISO (Nov 2026).xlsx` |
| Discussion papers (leave readiness, grading & salary scales, HR portal wishlist) | `docs/papers/` |

## Key design decisions

- PERSAL core: HOD HR, HR Administrator/Assistant, Head of Finance, CEO only (POPIA/PAIA).
- Staff and direct managers use a separate **leave portal**; the QMS Administrator sees a **risk tracker** with no personal data.
- Leave moves from SimplePay to PERSAL on [1 April 2027]; SimplePay stays the payroll system (payroll instructions out).
- PERSAL number: 8 digits, random, Luhn check digit, never reused.
- Grading: levels L1–L6 (Paterson), 5 steps per title.
- Policies and procedures are published from the QMS Hub; PERSAL shows them read-only.

## Open items before build

See the coverage register, sheet "Gaps & decisions", and briefing section 14. Most urgent: G-02 (merge QMS HR-06 Leave Policy v1.0 with Angels Leave Policy Rev 2/Rev 3).

## Document control

Policies follow the QMS convention: Draft 0.x · Approved 1.0 · minor 1.x · major 2.0. Printed copies are uncontrolled.
