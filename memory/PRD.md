# SplitLink Frontend PRD

## Original Problem Statement
Build the frontend UI for SplitLink, focused on a very intriguing landing page in the frontend directory. Use inspiration from https://www.awesomic.com/ and the uploaded DESIGN.md. Scope selected by user: landing page + auth/onboarding screens, static visual UI only, follow DESIGN.md closely while combining with Awesomic-style inspiration.

## Architecture Decisions
- Implemented a lightweight static frontend served by `/app/index.js` on port 3000.
- Created `/app/frontend/index.html`, `/app/frontend/app.js`, and `/app/frontend/styles.css`.
- No backend API wiring was added because the chosen functionality level was static visual UI only.
- Visual system follows DESIGN.md/Awesomic direction: near-black and white surfaces, large rounded cards, pill CTAs, minimal accent usage, product preview tiles, and focused one-job-per-page flows.

## Implemented
- Landing page with sticky rounded nav, announcement bar, sharp dual-role hero, merchant/affiliate CTAs, trust stats, marketplace preview, role-specific how-it-works panels, transparent 2% fee section, buyer product page preview, and final role CTA.
- Signup screen for `/signup?role=merchant` and `/signup?role=affiliate` with role preselection, role switcher, minimal form, slug field, live public URL preview, and availability message.
- Onboarding screen at `/onboarding?role=...` focused only on connecting Stripe, plus success state at `/onboarding/success?role=...`.
- Responsive styling for desktop and mobile with no horizontal overflow in tested widths.
- Added `data-testid` coverage for critical UI and interactive elements.

## Validation
- Self-tested with Playwright: landing → merchant signup → live slug update → onboarding → success.
- Testing agent passed frontend validation with 100% success for requested scope.
- Report: `/app/test_reports/iteration_1.json`.

## Prioritized Backlog
### P0
- Wire signup, onboarding, and dashboard CTA routes to real auth/session flow when backend/auth is ready.
- Connect Stripe onboarding CTA to real Connect flow.

### P1
- Add merchant dashboard, affiliate dashboard, product creation form, and buyer product page UI.
- Replace static product preview data with real product/affiliate data.

### P2
- Split CSS into smaller focused modules for maintainability.
- Add richer page transition states and additional link-preview metadata for buyer product pages.


## Update — Backend-Aware Auth, Stripe Wiring, and Dashboards
- Read existing backend before implementation. Backend source of truth is Clerk auth via `@clerk/backend`; protected endpoints require Bearer Clerk JWTs.
- Stripe wiring uses existing backend endpoints only: `POST /api/connect/onboard` and `GET /api/connect/status`. No Stripe backend endpoint changes were made.
- Frontend now exposes `/frontend-config.json` from server env and gracefully handles missing `CLERK_PUBLISHABLE_KEY`, `API_BASE_URL`, Stripe keys, and backend credentials.
- Added merchant dashboard at `/dashboard` with separate merchant navigation, four stat cards, products/transactions tab structure, product cards, and empty/config states using only existing endpoints.
- Added affiliate dashboard at `/affiliate` with separate affiliate navigation, four stat cards, My Links/Discover tabs, link cards, discover cards, and generate-link modal wired to existing `/api/affiliate-links` when auth/backend are configured.
- Improved landing page with Family-inspired detail cards while preserving Awesomic/DESIGN.md visual system.

## Validation Update
- Testing agent iteration 2 passed requested frontend scope: landing, signup/onboarding, merchant/affiliate dashboards, graceful missing-config behavior, data-testid coverage, and no horizontal overflow.
- No backend APIs were mocked. Real API calls are attempted only when configured; otherwise friendly configuration states appear.


## Update — Landing Page Redesign with Family.co Direction
- User disliked the previous landing page and requested landing-only redesign using Family.co plus uploaded DESIGN (2).md.
- Rebuilt landing hero and sections with warm cream canvas, playful floating blob characters, coin details, Fraunces display typography, Inter UI text, Family-style pill CTAs, inset card borders, and expressive motion.
- Preserved required product messaging: merchant/affiliate self-identifying CTAs, role-separated how-it-works flow, transparent 2% fee math, buyer product page preview, and final role CTA.
- Regression testing iteration 3 passed: desktop/mobile landing, nav, CTAs, no overflow, and non-landing route regression.


## Update — Signup and Onboarding Family-Style Redesign
- Applied the new Family.co-inspired visual direction to signup, Stripe connect onboarding, and onboarding success screens.
- Preserved backend-aware behavior: Clerk fallback remains, existing Stripe Connect button still calls `/api/connect/onboard`, and success routes to role-specific dashboards.
- Improved onboarding conversion copy while keeping the focused no-navigation/no-distraction principle.
- Testing iteration 4 passed: signup role switching, live slug preview, onboarding connect, success state, route regression, data-testid coverage, and no mobile/desktop overflow.
