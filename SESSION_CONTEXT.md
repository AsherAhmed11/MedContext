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

## Session 2 — 2026-09-08

### Prompt

Create a login interface. This is a MERN project, so use only MongoDB, Express, React, and Node (not Next.js). The screen must match a detailed tablet mockup: landscape iPad frame, clinic lobby background, MedContext branding, white login card, email/password with icons and show/hide, Log In + Forgot Password, trust copy bottom-left, accessibility and language widgets bottom-right.

### Answer

Scaffolded a MERN app (`client` Vite + React, `server` Express + Mongoose) and implemented the specified login UI inside a landscape tablet bezel. The form posts to `POST /api/auth/login`. Accounts are not provisioned yet, so a valid-looking submit returns 401 by design. Password visibility, large text, screen-reader emphasis, and English / Español / Français copy all work in the UI. Stack in `WORKFLOW.md` was corrected from Next.js to React + Vite.

### Files changed

- `package.json`, `.gitignore`
- `client/` React login page, CSS, logo, i18n, clinic background
- `server/` Express API (`/api/health`, `/api/auth/login`)
- `WORKFLOW.md` (MERN layout)
- `SESSION_CONTEXT.md` (this session)

### Next action

Open `http://localhost:5173` while `npm run dev` is running. Next engineering step remains real authentication (JWT, users, roles) after you confirm the login look.

---

## Session 3 — 2026-09-08

### Prompt

Make the interface work for all devices: mobile, PC, tablet, and similar.

### Answer

The login page is now responsive instead of always sitting inside a fake iPad.

- **Phone:** full-screen portal, stacked form, full-width Log In, language as chips, safe-area padding, 48px touch targets. Landscape phones compact the header and put trust + widgets in a row.
- **Tablet:** fills the real device; no nested tablet chrome.
- **PC (wide and tall):** keeps the original landscape iPad mockup, scaled up on very large screens.

Viewport uses `viewport-fit=cover`. Input font size is 16px so iOS does not zoom on focus.

### Files changed

- `client/index.html`
- `client/src/index.css`
- `client/src/pages/LoginPage.jsx`
- `client/src/pages/LoginPage.css`
- `SESSION_CONTEXT.md`

### Next action

Refresh `http://localhost:5173` and resize the window (or use browser device mode) for phone, tablet, and desktop. Then confirm look before JWT auth.

---
