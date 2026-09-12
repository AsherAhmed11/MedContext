# MedContext — Development Workflow

Use this file as the order of work. Do not skip a phase to “get to the interesting part.” The Context Engine, medication warnings, consent, and emergency access only work if identity, authorization, and patient data exist first.

**Rule:** you define the problem, requirements, and acceptance criteria. AI implements only after you approve the design. If you cannot explain the code, it is not done.

**Safety rule:** this is a prototype. It must not diagnose, prescribe, hide safety-critical data, or claim medical certainty.

---

## How each feature is built

Repeat this loop for every feature in the phases below.

```
1. You write: problem, requirements, acceptance criteria
2. AI researches options (no code yet)
3. You choose architecture / rules
4. You record the decision (short note in docs/decisions when it is important)
5. AI implements the approved design (no architecture changes)
6. AI generates tests from your acceptance criteria
7. You review: authorization, validation, errors, secrets, understandability
8. Tests + lint + types
9. You manually check the UI / API path
10. Update SESSION_CONTEXT.md with the prompt and the outcome
11. Only then move to the next feature
```

**Prompt styles (use these, do not skip steps):**

| Stage | What you ask AI |
| --- | --- |
| Architecture | Review my proposed design. List security, failure, scale, and complexity issues. Do not write code. |
| Implementation | Implement the approved design. Do not change architecture. Follow these requirements: … |
| Debugging | Expected vs actual, error, logs, relevant code. Give the three most likely causes. Do not modify code yet. |
| Security | Review as a security engineer (access control, injection, data exposure, auth bypass). Do not rewrite yet. |

---

## Phase 0 — Project foundation

**Goal:** a runnable app skeleton, not features.

| Step | You own | AI can do after you approve |
| --- | --- | --- |
| 0.1 Repo layout | folders: `client` + `server` (MERN: MongoDB, Express, React, Node) | scaffold Vite React + Express |
| 0.2 Tooling | lint, format, env example (no secrets) | ESLint, Prettier, `.env.example`, Docker Compose (MongoDB) |
| 0.3 Docs stubs | create empty docs listed below | draft headings only |
| 0.4 CI | what must fail a PR | GitHub Actions: install, typecheck, lint, test |

**Create these docs as you go (not all on day one):**

- `docs/architecture.md`
- `docs/requirements.md`
- `docs/security.md`
- `docs/context-engine.md`
- `docs/ai-safety.md`
- `docs/edge-cases.md`
- `docs/decisions/` (ADRs)
- `docs/ai/prompts.md`

**Exit:** `npm` scripts run for client and server; MongoDB starts locally; CI is a skeleton.

---

## Phase 1 — Identity and tenancy

**Goal:** a user is a Doctor, Patient, or Admin inside an organization. No patient chart yet.

| Feature | Human first | Then AI | Collaboration |
| --- | --- | --- | --- |
| Organizations + users | roles, org boundary | schemas, APIs, admin UI | privilege escalation |
| Authentication | JWT vs session, expiry, logout | middleware, login/register | token theft, logout, refresh |
| RBAC | who can call which route | permission helpers | bypass tests |

**Exit:** login works; a doctor cannot hit admin routes; a patient cannot hit doctor routes.

---

## Phase 2 — Patient record (data, not ranking)

**Goal:** authorized CRUD for profile, allergies, medications, reports, appointments.

Build in this order:

1. **Patient profile** — fields, who can read/write
2. **Allergies** — severity, verification, current vs historical (this feeds later safety)
3. **Medications** — status, dates, dosage (no interaction engine yet)
4. **Reports** — metadata + secure upload (type, date, source, verification)
5. **Appointments** — doctor, specialty, reason, datetime, patient

Every write must be authorized and audited at least as “who changed what.” Full audit service can wait until Phase 4 if you log the events now.

**Exit:** a doctor with access can view the chart; a doctor without access cannot; patient can manage their own data per your rules.

---

## Phase 3 — Consent (authorization layer)

**Goal:** access is not only “same org + role.” Patient consent gates the chart.

You define: grant, expire, revoke, what happens mid-session if consent is revoked.

Then AI implements schema, APIs, UI, tests.

**Must-test:** expired consent, revoked consent, race (revoke while doctor is viewing).

**Exit:** no consent → no normal chart access (emergency is Phase 4).

---

## Phase 4 — Emergency access + audit

**Goal:** break-glass is explicit, temporary, and fully logged. It does not become a silent back door.

You define: when it is allowed, required reason, duration, who can use it.

Then AI implements API, UI, middleware, audit events, tests.

**Audit must record:** chart access, report access, consent change, emergency access, medication change.

**Exit:** emergency access works, expires, and appears in the audit log; abuse cases are tested.

---

## Phase 5 — Context Engine (core product)

**Goal:** ranking, not hiding. Authorization is unchanged.

You define:

- Safety bucket always on top (severe allergies, current meds, critical conditions, serious reactions)
- Relevance by appointment specialty + recency
- Why an item was ranked (explanation)
- Full record still reachable for authorized users

Then AI implements ranking + unit tests. You validate edge cases (unknown severity, old cardiac data vs new unrelated labs, conflicting records).

**Exit:** cardiology example from the README behaves as specified; unrelated severe allergy still CRITICAL.

---

## Phase 6 — Medication safety warnings

**Goal:** clinician-facing *potential concerns*, never “this is safe.”

Pipeline you already specified:

```
Medication → allergies → current meds → previous reactions
→ prototype interaction data → potential concern → explanation → clinician review
```

No auto-change of medications. AI implements matching + UI banners. You own the prototype interaction dataset and wording.

**Exit:** penicillin allergy + penicillin-class med shows a warning; copy does not claim certainty.

---

## Phase 7 — AI assistance (optional, after the engine)

**Goal:** summarization of *already authorized, already ranked* context only.

You define: what the model is allowed to see, allowed outputs, failure if the provider is down, rejection of diagnostic language.

Then AI implements provider adapter, prompts, parsing, tests.

**Collaboration:** prompt injection, hallucination, source attribution.

**Exit:** AI failure does not block the chart; AI never receives another patient’s data.

---

## Phase 8 — Hardening and demo

- Rate limiting, input validation pass, secure file handling review
- Playwright (or similar) for login → consent → appointment → ranked chart → warning
- Seed data for a demo patient (cardiology + severe allergy + mixed reports)
- README usage section: how to run locally
- You walk the human critical-thinking checklist (Why / What / Who / When / What if / Security / Data / Scale / AI / Failure) on Phases 3–7

---

## Suggested session order (what you start with)

| Session | Work |
| --- | --- |
| 1 | Confirm this workflow. Fill `docs/requirements.md` with personas and non-goals (you write; AI may format). |
| 2 | ADR: architecture (Next + Express + Mongo) and why. AI reviews, you decide. |
| 3 | Scaffold apps + Docker Mongo + CI (Phase 0). |
| 4 | Auth + roles (Phase 1) — high human involvement. |
| 5+ | Follow phases 2→8, one feature loop at a time. |

---

## Definition of done (every feature)

- [ ] Requirement and acceptance criteria exist
- [ ] Architecture / rules understood by you
- [ ] Implementation works
- [ ] Types and lint pass
- [ ] Tests pass (including deny-access cases)
- [ ] Security and edge cases reviewed
- [ ] UI checked manually if there is UI
- [ ] Docs updated
- [ ] Prompt + answer logged in `SESSION_CONTEXT.md`
- [ ] You can explain the code

---

## What not to do

- Do not start with the Context Engine or AI summaries.
- Do not ask AI to “build the whole platform.”
- Do not merge code you cannot defend in a review.
- Do not let ranking replace authorization.
- Do not let emergency access skip the audit log.
