# MedContext — Session Context

Log of prompts and answers for this project. Newest session at the bottom. Keep this file updated at the end of every working session.

Format for each session:

- Date
- Prompt (what was asked)
- Answer (what was decided or delivered)
- Files changed
- Next action

---

## Session 1 — 2026-09-08

### Prompt

Read the delegation plan and README, understand the project concept, then make a workflow and a file named session context in which every prompt and its answer is added. The developer will then start according to the workflow.

### Answer

**What MedContext is**

A prototype (educational, not a medical device) that helps a doctor see the *most relevant* patient information for the current appointment without ever hiding safety-critical facts. Clinical relevance (e.g. cardiology → ECGs) is separate from and always weaker than safety priority (severe allergies, current medications, critical conditions, serious adverse reactions). Ranking is not authorization: an authorized user must still reach the full record.

**Who uses it**

- Doctor — contextual chart, reports, meds, allergies, history, safety warnings  
- Patient — profile, meds, allergies, conditions, reports, consent, access history  
- Admin — orgs/users, activity, audit, configuration  

**Main subsystems**

Patient profile, medications, allergies, reports, appointments, Context Engine, medication-safety warnings (concerns for clinician review, never “this is safe”), consent, emergency/break-glass access, audit logging, then optional AI summarization on *authorized contextual data only*.

**Stack (from README)**

Next.js + TypeScript frontend, Express + TypeScript API, MongoDB/Mongoose, JWT or session auth, optional Socket.IO / Redis / BullMQ, Jest / RTL / Playwright, Docker + GitHub Actions. AI behind a provider adapter.

**How work is split (from DelegationPlan)**

You own requirements, architecture, security, consent, emergency rules, context ranking, safety wording, and merge decisions. AI accelerates CRUD, UI, tests, and boilerplate. High human share on auth, authorization, consent, emergency access, audit, medication safety, context ranking, and AI output handling.

**What was produced**

1. `WORKFLOW.md` — phased build order (foundation → identity → chart data → consent → emergency/audit → Context Engine → medication warnings → optional AI → hardening), plus the per-feature loop and prompt styles from the delegation plan.  
2. This file — session log starting with this exchange.

**How you should start**

Open `WORKFLOW.md` and begin **Session 1 of the suggested session order**: write personas, problem statements, and non-goals in `docs/requirements.md` (you decide content). Do not scaffold the Context Engine yet.

### Files changed

- `WORKFLOW.md` (created)
- `SESSION_CONTEXT.md` (created)

### Next action

Phase 0 / workflow Session 1: you define requirements and non-goals; then architecture review (no code) as ADR-001.

---
