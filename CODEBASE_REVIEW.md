# Codebase review — 2026-10-29

Scope: static review of the React frontend, Express API, Firebase integration, and external analysis call paths. Cloud model implementations are outside this repository. This is not a production security audit or validation of model accuracy.

## Current resolution status

All reviewed categories have code changes in the working tree. Deployment controls below remain required before treating the cloud system as hardened.

| Finding | Implemented change |
|---|---|
| Paid endpoint access and cost controls | Firebase Bearer authentication on every paid API and saved-result read; frontend calls backend only; Firestore transaction-backed daily quotas, concurrency leases, and idempotency. Optional Google identity tokens support private Cloud Run services. |
| Caller-supplied identity | Backend derives ownership from the verified token and reads `users/{uid}/fields/{fieldId}`. Legacy field writes removed. |
| Disease risk | Dashboard and Alerts use validated model scores on a 0–100 scale. Missing stays unavailable. NDVI is never converted into disease probability. |
| Geometry and imagery | Polygon validation, canonical geometry hashes, extent/vertex limits, Sentinel polygon requests, local polygon/no-data/cloud masking and exact raster bounds. All four indices use one reflectance raster and standard formulas. |
| Export costs and band mismatch | Reports export saved snapshots only, make no provider calls, identify stale/missing sections and include provenance. The duplicate five/six-band model pipelines were replaced by one versioned raster contract. |
| Resource limits | Bounded bodies, uploads, image signatures/dimensions, response sizes, input validation, provider deadlines, and consistent errors. No automatic retries of paid work. |
| Saved results and explanation costs | Owner-scoped backend snapshots, 24-hour freshness, geometry/schema invalidation, read-only hydration, explicit refresh. AI explanations batch all metrics into one request per forecast period and are snapshot-scoped. |
| Auth and sensor data | Common protected route boundary; unconditional hooks; scoped RTDB paths and rules. Field-switch responses are guarded against stale updates. |
| Notifications | Verified identity supplies the recipient; explicit consent; server-only authenticated webhook; persisted accepted-delivery receipt; no hardcoded recipients in the active notification flow. |
| Delivery and observability | CI for tests, emulators, audit, lint and build; lockfiles; lazy routes; request/provider timing without logging tokens, provider bodies or account profiles in the new paths. Firebase SDK updated. |

Verification: 17 backend tests, 9 frontend tests, and 5 Firestore/RTDB emulator tests pass. Full frontend lint and production build are checked. Dependency audits report zero known vulnerabilities after upgrades/overrides. No paid model calls or real notifications were made during verification. CI is configured but has not run on GitHub in this session.

Production work remains: deploy the included Firebase rules, restrict Cloud Run invokers and configure backend identity, configure notification secrets and verified contacts, migrate sensor writers/data to owned paths, and configure provider billing alerts. Model calibration and the live Sentinel/forecast/collector contracts require a staging smoke test. See [HARDENING.md](HARDENING.md).

The remaining sections retain the original findings for traceability; their descriptions refer to the code before this hardening pass.

## Initial implementation (historical)

- Dashboard forecasts, vegetation indices, Analytics data generation, and Alerts inference require an explicit Analyze action.
- Removed the dashboard cache-miss prediction fallback and its two-second polling loop, plus the separate automatic forecast request.
- Viewing cached alerts no longer generates AI descriptions. “Explain alerts with AI” starts that work separately.
- Session results are keyed by user, field, coordinates and analysis parameters. Concurrent requests with the same key share one promise. Failed requests can be retried. Explicit reanalysis replaces the saved result.
- Dashboard and vegetation/analytics controls show analysis timestamps. Missing risk/count data displays `--` rather than a measured zero. Fixed the dashboard's undefined weather API key variable.
- Session cache is bounded to 50 results and clears on reload; existing Alerts localStorage cache is retained. This is a UI usage control, not a backend spending limit.

## Original findings, in priority order

### P0 — Paid work can be triggered without authentication or usage limits

Evidence: `backend/src/routes/ai.js`, `backend/src/routes/pest.js`, `backend/src/routes/predict.js`, and the `/api/analyze-ndvi` route in `backend/server.js` do not apply `authenticate`. Frontend Analytics and Alerts also call externally hosted collector/LSTM services directly (`frontend/src/api/endpoints.js`). A UI button cannot prevent direct requests. External services' own authentication settings cannot be established from this repository.

Fix: route work through authenticated backend endpoints; verify Firebase tokens and field ownership; add per-user quotas, concurrency limits, request identifiers, and provider spending alerts. Restrict cloud model ingress to the backend where possible. CORS alone does not provide authorization.

### P1 — Field processing trusts the caller's user ID

Evidence: `backend/src/routes/field.js` has no authentication. `backend/src/controllers/field.controller.js` accepts `userId` from the request body; `backend/src/services/field.service.js` writes to `fields/{userId}`. This allows requests to target someone else's document if the endpoint is reachable.

Fix: derive identity from a verified token, validate polygon points, and use one field schema: `users/{uid}/fields/{fieldId}`. Confirm deployed Firestore/Realtime Database rules separately; their access rules are not included here.

### P1 — Disease risk is calculated from NDVI instead of the forecast risk

Evidence: `frontend/src/components/dashboard/StatsCards.jsx` derives a disease percentage from NDVI thresholds, while Alerts reads `forecast.day_1.disease_risk`. The two views can contradict each other, and the displayed percentage has no calibrated probability established in this code.

Fix: use the same validated model output and units in both views. Label vegetation condition separately and show missing values as unavailable. Validate the model's scale and calibration before presenting probabilities.

### P1 — Analysis does not honor the submitted polygon

Evidence: vegetation requests include polygon and bounds, but `backend/src/controllers/ndvi.controller.js` only uses latitude, longitude, index and radius. It retrieves a square bounding box; the UI overlays results against field polygon bounds, which may represent a different footprint.

Fix: validate geometry server-side; clip/mask analysis to the actual field; return the imagery's exact bounds, capture date, cloud coverage and analyzed area. Include a geometry hash in saved result identifiers.

### P1 — Report export repeats expensive work and uses a different band contract

Evidence: `backend/src/controllers/report.controller.js` invokes the collector again and loops over four indices, fetching imagery/token/model results separately for each. Its image script uses five bands, whereas `ndvi.controller.js` sends six including B11. The external model's expected contract needs confirmation. Heatmap failures are caught and converted to missing results, so a report can still be returned partially complete.

Fix: export an existing analysis snapshot; make refresh explicit. Retrieve imagery once and reuse it across indices. Share a versioned band/schema contract and identify missing sections clearly in exported reports.

### P1 — External calls and uploads lack resource bounds

Evidence: model fetches and Sentinel/model axios requests generally have no timeout. Pest/disease routes use `multer()` without file-size limits or content validation. Disease prediction accesses `req.file.buffer` without checking for a file; proxies do not consistently preserve upstream error statuses.

Fix: enforce upload size/type and coordinate/radius/index validation, request deadlines, consistent error responses, bounded retries and concurrency. Avoid automatic retries of billable work without idempotency.

### P2 — Saved results need freshness, provenance and shared storage

Evidence: Alerts localStorage results have timestamps but no expiry checks or geometry/model version validation. New session results do not persist across reloads or devices. Dashboard and Alerts maintain separate presentation caches. AI explanations can make five generation calls per period (`backend/src/services/description.js`), up to fifteen across three periods.

Fix: persist analysis snapshots on the backend with user/field/geometry/model/input versions, generated time and imagery time. Display age and let users refresh deliberately. Batch explanations into one short structured response and cache it against the snapshot. Add TTL and invalidation rules without automatically starting inference when a result becomes stale.

### P2 — Auth and data scoping are inconsistent across pages

Evidence: `frontend/src/App.jsx` labels routes protected but has no common route guard. Some pages guard themselves; others rely on user checks inside effects. `frontend/src/pages/SoilAnalysis.jsx` returns before a later hook and reads/deletes from a shared `soil` RTDB path.

Fix: use a central authenticated route boundary, keep hooks unconditional, and scope sensor readings/deletions to verified user/field ownership. Actual RTDB access depends on deployed rules and must be checked separately.

### P2 — Notifications use a fixed recipient

Evidence: `frontend/src/pages/Alerts.jsx` contains a fixed phone number in send requests and confirmation text. This can route a user's farm information to the wrong recipient.

Fix: obtain the verified user's configured recipient server-side, with consent and delivery status. Do not accept arbitrary recipient identity as proof of authorization.

### P2 — Delivery and observability need a baseline

Evidence: package scripts do not define an application test suite; lint flags existing issues across the frontend. The production entry bundle is about 1.9 MB before gzip. Controllers log provider responses and user/profile details.

Fix: add CI for build/lint and meaningful auth/ownership, request-count, field-switch, failure/retry and API contract tests. Lazy-load routes/charts/maps. Record request IDs, per-provider latency, failure rates and usage per analysis while redacting personal data and provider details.

## Original implementation recommendation (now implemented in code)

Create an authenticated analysis API with `POST /fields/:id/analyses` and read-only `GET` endpoints for saved snapshots. The server validates field ownership and inputs, deduplicates jobs by geometry/model/input version, applies quotas, and stores status/results. Dashboard reads snapshots; Analyze creates a job. Reports consume the chosen snapshot. Text explanations are optional and generated once per snapshot. Start with a bounded synchronous backend flow if latency permits; introduce a queue when model latency or concurrency requires one.

Costs cannot be quantified from this repository alone. ML/image processing consumes provider compute and satellite processing resources; AI explanations/chat consume language-model tokens. Confirm savings with provider metrics and per-analysis request counts after deployment.

## Initial verification (superseded by current resolution status)

Six Node tests cover rendering without starting work, cache reads, concurrent request deduplication, isolation, failure/retry, and explicit refresh. Rendering tests use server rendering; they do not exercise browser effects. Production build passes with a bundle-size warning. Targeted lint passes with one existing Alerts dependency warning. Full authenticated browser flows and deployed external services were not exercised, and no paid model calls were made as part of verification. Existing unrelated working-tree edits were preserved.
