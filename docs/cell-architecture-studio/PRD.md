# Product Requirements Document — Cell Architecture Studio (Scalable Edition)

**Status:** Draft v1 · **Owner:** _TBD_ · **Last updated:** 2026-07-09
**One-liner:** An interactive 3D cell-biology explorer with a context-grounded AI tutor, built to scale from a free public demo to classroom cohorts and research groups on a single codebase.

> This PRD is derived from a teardown of the live reference app (`cell-architecture-studio.lanshuagent.com`) plus a scalable target architecture. Sections marked _(reference app)_ describe observed behavior of the existing app; everything else is the product we are specifying.

---

## 1. Background & problem

Students learning cell biology work mostly from static 2D diagrams that misrepresent spatial structure, and researchers have no lightweight way to share interactive 3D models of their own specimens. The reference app proves the core experience works — scientifically-sourced 3D cell models, rotate/cross-section/label/compare, plus an AI tutor grounded in the currently-selected organelle. What it lacks (for institutional use) is identity, persistence, a content-authoring pipeline, and cost controls on the AI layer.

**This product** keeps the reference app's client experience and adds the layers needed to serve real cohorts and labs without runaway cost or fragility.

### What the reference app already does _(reference app)_
- React 19 + TypeScript, built with Vite; 3D via Three.js + react-three-fiber + drei.
- 7 specimens (plant, animal, white blood cell, neuron, epithelial, bacteria, muscle) as **data-driven config** (organelle IDs, 3D label anchors, descriptions, comparison metadata).
- DRACO-compressed `.glb` meshes (several from the NIH 3D collection), lazy-loaded with LOD + instancing, with a **procedural-geometry fallback**.
- AI tutor: `POST /api/tutor` with the current organelle as context, a **9s abort timeout**, response validation, and a **local fallback answer** on failure.
- View modes (native material / cross-section / microscope), an animation layer, side-by-side comparison, progress tracking.
- i18n across EN / DE / ES / ZH; responsive across desktop / compact / mobile.

---

## 2. Goals & non-goals

### Goals
1. Ship a **free public explorer** (no login) that works on a low-end Chromebook or mid-range phone.
2. Let a **teacher** assign lessons to a class and see each student's progress.
3. Let a **researcher** upload their own 3D model, annotate it, and share a citable link.
4. Keep **per-user AI cost bounded** as usage grows (caching + rate limits + fallback).
5. Let a **non-developer biologist** add or edit a specimen via a reviewed data change, not a code change.

### Non-goals (v1)
- Real-time multi-user collaboration (deferred to a later phase).
- Native mobile apps (responsive web only).
- Simulation of dynamic cellular processes / physics (static + scripted animation only).
- A general 3D modeling/authoring tool — we ingest and annotate meshes, we don't create them.

---

## 3. Target users & personas

| Persona | Context | Primary need | Success looks like |
|---|---|---|---|
| **Maya, high-school student** | $200 Chromebook, school Wi-Fi | Understand organelle structure & function for an exam | Rotates a cell, taps the nucleus, asks the tutor "what does this do", passes the quiz |
| **Mr. Chen, biology teacher** | Manages 5 classes, Google Classroom | Assign a lesson, see who's stuck | Assigns "Plant vs animal cell", sees mastery per student next morning |
| **Dr. Okafor, researcher/TA** | Has a confocal-derived mesh | Share an interactive, annotated, citable model with a lab/course | Uploads a mesh, labels 4 features, sends a permalink that opens to that view |
| **Sam, content contributor** | Grad student, not a developer | Add a new specimen to the public library | Opens a PR editing a manifest + mesh; CI validates it; it ships |

---

## 4. Product scope by tier

Build in tiers on one codebase. Each tier = the previous plus a bounded addition. **Do not build Tier 3 first.**

### Tier 1 — Public Explorer (MVP)
The reference-app experience, hardened. No accounts, no database.
- Static SPA + 3D assets on a global CDN.
- Data-driven specimen registry; ≥7 specimens at launch.
- View modes, labels, cross-section, compare, quiz, progress in `localStorage`.
- One serverless `/api/tutor` endpoint with semantic cache + local fallback.
- Full i18n (EN/DE/ES/ZH) and accessibility baseline (§7).

### Tier 2 — Classroom
Adds identity and a thin write path.
- Auth + **SSO / LTI** (Google Classroom, Clever).
- Serverless Postgres: users, classes, enrollments, progress, quiz attempts.
- Teacher dashboard: create class, assign lesson, view per-student mastery.
- Server-side progress (replaces `localStorage`), synced across devices.
- Per-user + per-org tutor rate limits and usage caps.

### Tier 3 — Research
Adds an ingest + sharing surface.
- Mesh/volumetric **upload → validate → transcode (DRACO + KTX2/Basis)** pipeline.
- Custom annotations, measurements, and per-model metadata/provenance.
- **Citable exports** and **shareable scene permalinks** (specimen + camera + labels encoded).
- Embeddable viewer (iframe/LMS).

---

## 5. Functional requirements

IDs are stable so you can reference them in tickets. Priority: **P0** = MVP-blocking, **P1** = tier goal, **P2** = nice-to-have.

### 5.1 Explorer & rendering
- **FR-EX-1 (P0):** Render a selectable specimen as an interactive 3D scene (orbit, zoom, pan) at ≥30 FPS on a mid-range 2022 Chromebook.
- **FR-EX-2 (P0):** Lazy-load each specimen's mesh behind a loading overlay; **fall back to procedural geometry** if the mesh fails or times out.
- **FR-EX-3 (P0):** Tap/click an organelle to select it, surfacing a detail panel (name, function, description) anchored to its 3D position.
- **FR-EX-4 (P0):** View modes: native material, cross-section, microscope. State is shareable via URL.
- **FR-EX-5 (P1):** Compare mode — two specimens side by side with aligned organelle callouts.
- **FR-EX-6 (P1):** Scripted animation layer per specimen (e.g. highlight tour).
- **FR-EX-7 (P0):** **2D/text equivalent** for every scene, driven from the same organelle data (accessibility + low-bandwidth).

### 5.2 AI tutor
- **FR-AI-1 (P0):** `POST /api/tutor` accepts `{ question, specimenId, organelleId, locale }` and returns `{ answer: string, source: "api" | "local" }`.
- **FR-AI-2 (P0):** Client enforces a **9s timeout** (AbortController); validates `answer` is a non-empty string; on any failure returns a **local fallback answer**.
- **FR-AI-3 (P0):** Server grounds the prompt in the specimen + organelle context and caps output tokens.
- **FR-AI-4 (P1):** **Semantic cache** keyed on normalized `(specimenId, organelleId, question, locale)`; cache hit returns without an LLM call.
- **FR-AI-5 (P1):** **Rate limits** per user (Tier 2) / per IP (Tier 1) and per org, with a friendly "tutor is resting" state that falls back to local answers.
- **FR-AI-6 (P2):** Stream responses token-by-token for perceived latency.
- **FR-AI-7 (P0):** Never expose provider keys client-side; all LLM calls are server-side.

### 5.3 Content model & authoring
- **FR-CT-1 (P0):** Each specimen is a **versioned manifest**: `id`, display names (per locale), mesh asset + LODs, organelle list (`id`, label anchor `[x,y,z]`, function text per locale), provenance/citation, comparison metadata.
- **FR-CT-2 (P0):** Manifests are **schema-validated in CI**; an invalid manifest fails the build.
- **FR-CT-3 (P1):** A contributor can add/edit a specimen via a data-only PR (manifest + mesh); no engine code change required.
- **FR-CT-4 (P1):** Automated asset step transcodes uploaded meshes to DRACO + KTX2 and generates LODs.

### 5.4 Accounts, classes, progress (Tier 2)
- **FR-AC-1 (P1):** Sign in via SSO / LTI (Google, Clever); create student & teacher roles.
- **FR-AC-2 (P1):** Teacher creates a class, invites/rosters students, assigns lessons.
- **FR-AC-3 (P1):** Persist per-user progress, quiz attempts/scores, and mastery per organelle.
- **FR-AC-4 (P1):** Teacher dashboard shows per-student and class-level mastery.
- **FR-AC-5 (P1):** Progress syncs across devices; anonymous `localStorage` progress migrates on first sign-in.

### 5.5 Research features (Tier 3)
- **FR-RE-1 (P2):** Upload a mesh (glTF/GLB/OBJ/STL) → validate → transcode → private specimen.
- **FR-RE-2 (P2):** Add custom labels, measurements, and provenance to an uploaded model.
- **FR-RE-3 (P2):** Generate a **shareable permalink** encoding specimen + camera + active labels + view mode.
- **FR-RE-4 (P2):** Export a citable reference (model + metadata + attribution) and an embeddable iframe.

---

## 6. Data model (Tier 2+)

Minimal relational sketch — content stays static/manifest-based; only per-user data is in Postgres.

```
users(id, email, role, org_id, locale, created_at)
orgs(id, name, sso_provider)
classes(id, org_id, teacher_id, name)
enrollments(user_id, class_id, role)
assignments(id, class_id, specimen_id, lesson_ref, due_at)
progress(user_id, specimen_id, organelle_id, mastery, updated_at)
quiz_attempts(id, user_id, specimen_id, score, answers_json, created_at)
tutor_usage(user_id, day, count)          -- rate limiting / cost tracking
uploaded_models(id, owner_id, status, mesh_uri, manifest_json, visibility)  -- Tier 3
```

Content (specimens/organelles/lessons) is **not** in the DB — it's versioned manifests served from the CDN. This keeps the heavy, read-mostly data cacheable and the DB small and write-light.

---

## 7. Non-functional requirements

### Performance & assets
- **NFR-P-1:** First specimen interactive in **≤4s on a 10 Mbps connection**; ≤2s on broadband.
- **NFR-P-2:** Per-specimen initial payload **≤6 MB** (DRACO geometry + KTX2 textures + one LOD); additional LODs streamed.
- **NFR-P-3:** ≥30 FPS orbit on a mid-range 2022 Chromebook; graceful quality reduction (lower LOD) below that.
- **NFR-P-4:** Preload only the next likely specimen; never all seven at once.

### Accessibility (education is not optional here)
- **NFR-A-1:** Every 3D scene has a keyboard-navigable label list and a text/2D equivalent (FR-EX-7).
- **NFR-A-2:** Respect `prefers-reduced-motion`; all animation is skippable.
- **NFR-A-3:** WCAG 2.1 AA for all non-canvas UI; visible keyboard focus states.
- **NFR-A-4:** Works with the procedural fallback and text mode when WebGL is unavailable.

### Scalability & cost
- **NFR-S-1:** Tier 1 serves ≥10k concurrent anonymous users from CDN with a stateless tutor function.
- **NFR-S-2:** **AI cost per active user is bounded** by cache-hit rate + rate limits; target ≥60% tutor cache-hit rate at steady state.
- **NFR-S-3:** No single point of failure in the read path (static assets + read-only content).
- **NFR-S-4:** Tutor degrades to local answers under load/outage rather than erroring (hard requirement).

### Privacy & compliance
- **NFR-C-1:** Student data handling compliant with **FERPA / COPPA** (US K-12) and GDPR for EU users.
- **NFR-C-2:** Tutor questions from minors are not used for model training; log retention is bounded and configurable.
- **NFR-C-3:** No PII in tutor prompts; context is specimen/organelle only.

### Internationalization
- **NFR-I-1:** All user-facing strings from a translation table; launch locales EN/DE/ES/ZH; adding a locale is data-only.

---

## 8. Technical architecture (recommended)

| Layer | Choice | Rationale |
|---|---|---|
| App | React 19 + TypeScript + Vite | Matches reference app; strongest 3D ecosystem |
| 3D | three.js / react-three-fiber / drei | LOD, instancing, Suspense streaming built in |
| Assets | DRACO (geometry) + KTX2/Basis (textures), transcoded in CI | Smallest payload; GPU-friendly textures |
| Hosting/CDN | Static SPA + object storage behind a global CDN | Push immutable bytes to the edge |
| AI tutor | Serverless fn → **Claude** + semantic cache | Grounded, cheap-at-scale, streamed |
| Auth | Managed auth + SSO/LTI (Google, Clever) | Meets schools where they are |
| Data | Serverless Postgres (Neon / Supabase) | Small write-light per-user store |
| Content | Git-backed JSON manifests + schema validation (or headless CMS) | Non-dev authoring, versioned |
| Verification | Playwright visual snapshots | Reference repo already does this; keep it |

**AI tutor detail:** back it with Claude — a fast model (e.g. Claude Haiku 4.5) for cached, high-volume Q&A and a stronger model for open-ended questions. Send `{ specimen, organelle }` as structured context, cap output tokens, cache on a normalized key, and keep the local fallback. _When implementing, load the `claude-api` skill for current model IDs, pricing, streaming, and prompt-caching rather than hard-coding them._

---

## 9. Success metrics

| Metric | Target |
|---|---|
| Time-to-first-interaction (p75, 10 Mbps) | ≤4s |
| Tutor cache-hit rate (steady state) | ≥60% |
| Tutor p95 latency (cache miss) | ≤3s |
| Lesson completion rate (Tier 2) | ≥50% of assigned |
| Quiz mastery lift (pre→post) | measurable +1 band |
| Low-end device crash/GPU-fail rate | <2% of sessions |
| Cost per monthly active user (AI + infra) | within budget target _TBD_ |

---

## 10. Milestones

- **M1 — Explorer MVP (Tier 1):** static SPA, ≥7 specimens, tutor endpoint + cache + fallback, i18n, a11y baseline. _Exit: public demo passing NFR-P and NFR-A._
- **M2 — Content pipeline:** manifest schema + CI validation + transcode step; a contributor can add a specimen by PR.
- **M3 — Classroom (Tier 2):** SSO/LTI, Postgres, progress sync, teacher dashboard, rate limits.
- **M4 — Research (Tier 3):** upload/transcode, annotations, permalinks, embeds.
- **M5 — Hardening:** cost dashboards, compliance review (FERPA/COPPA/GDPR), load test to NFR-S-1.

---

## 11. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| 3D assets too heavy for target devices | Students can't use it | Hard payload budget (NFR-P-2), LODs, procedural fallback, text mode |
| AI tutor cost scales linearly with users | Unsustainable | Semantic cache, rate limits, cheap default model, local fallback |
| Content authoring stays developer-bound | Catalogue stalls | Data-only manifests + CI validation + transcode automation (M2) |
| WebGL unavailable / accessibility gaps | Excludes users, compliance risk | Text/2D equivalent + keyboard nav as P0, not P2 |
| Student-data compliance | Legal/adoption blocker | FERPA/COPPA/GDPR review before Tier 2 launch; no PII in prompts |
| Asset provenance/licensing unclear | Can't ship a model | Require citation/provenance in every manifest (FR-CT-1) |

---

## 12. Open questions

1. Budget ceiling for AI cost per MAU? (drives model choice + cache aggressiveness)
2. Which LMS integrations are must-have at launch — Google Classroom, Clever, Canvas LTI?
3. Is the public library curated-only, or community-contributed with moderation?
4. Do researchers need private/unlisted models, or is all uploaded content public?
5. Which grade bands / curricula are we aligning content to (drives specimen selection & quiz design)?
6. Self-host vs. managed for auth and Postgres?

---

## Appendix A — Reference app observations _(evidence)_

From the live app's shipped bundle/CSS and public repo:
- React + react-three-fiber/drei signatures; DRACO decoder; `useGLTF`, `Suspense`, `LOD`, instancing, `OrbitControls`, `Environment`, `Bounds`.
- `fetch("/api/tutor", { method: "POST" })` with `AbortController` 9s timeout; response validated for non-empty `answer`; `source: "local"` fallback path.
- i18n strings across EN/DE/ES/ZH (e.g. Chinese tutor labels present).
- NIH 3D asset URLs (`3d.nih.gov/entries/...`); specimen data for plant/animal/bacteria/neuron/muscle/epithelial/white-blood.
- Repo: `github.com/cclank/cell-architecture-studio` (React 19, TypeScript, Vite 7, Playwright visual verification).

_The reference app's backend is not public; §5.2/§8 tutor specifics beyond the observable request/response contract are recommendations, not observations._
