# Analysis API and rollout

## Runtime behavior

Opening pages reads saved results. Analyze creates or reuses a result within its 24-hour freshness window. Refresh explicitly creates a new result. Field geometry and analysis schema versions identify snapshots; edited fields cannot accidentally reuse another geometry's results. Exporting a report reads saved snapshots and never starts a model, satellite or map request. Missing sections are identified in the PDF.

All paid APIs require a Firebase ID token in `Authorization: Bearer …` and an `Idempotency-Key` of 16–128 letters/digits/hyphens/underscores. The frontend supplies both. To retry an uncertain request, preserve that key; check saved results first. A failed attempt is retained and charged against the request quota because the provider may already have consumed resources. An explicit new attempt needs a new key. Paid calls are not automatically retried.

| API | Purpose |
|---|---|
| `GET /api/analyses/:kind?fieldId=…` | Read current saved result, or null; no inference |
| `POST /api/analyses/:kind` | `{fieldId, refresh?: boolean}`; kind is forecast, analytics or vegetation |
| `POST /api/ai/alert-descriptions` | `{fieldId, period}`; explain the latest fresh forecast for day_1, day_7 or day_14 |
| `POST /api/ai/insight` | `{fieldId, section}`; explain saved analytics |
| `POST /api/ai/generate` | Bounded chat message |
| `POST /api/disease/predict`, `/api/pest/predict` | One PNG/JPEG file, max 4 MiB and 25 megapixels (within Vercel's request limit) |
| `POST /api/report/generate` | `{fieldId}`; saved-only PDF export |
| `POST /api/notifications` | `{fieldId, period, consent:true}`; returns provider acceptance, not proof of delivery |

Snapshots and chunked payloads live under `users/{uid}/analysisRuns`, with indexes/leases under `analysisKeys` and idempotency records under `analysisRequests`. Clients cannot write these collections or quota records. Large results are split into bounded documents. Freshness is not data retention: configure a separate recursive cleanup job for expired runs/parts and old request/usage records; Firestore TTL on parent documents alone does not clean subcollections. Keep request records at least as long as the supported retry window.

Defaults: 20 paid operations per user per UTC day; 500 globally; 2 concurrent per user; 10 globally. One operation is not a currency/token budget: a vegetation operation fetches one raster and computes four indices, a chat call has a different provider cost. Limits count started work, including failures. Firestore transactions enforce shared limits across replicas; leases expire after five minutes after process failure. Provider deadlines are shorter than the lease. Failure of the quota datastore denies new paid work.

## Server configuration

Use Node 22. Configure Firebase Admin credentials or Application Default Credentials with access to the correct project. `FIREBASE_DATABASE_URL` can override the Realtime Database URL.

```dotenv
ANALYSIS_USER_DAILY_LIMIT=20
ANALYSIS_GLOBAL_DAILY_LIMIT=500
ANALYSIS_USER_CONCURRENCY=2
ANALYSIS_GLOBAL_CONCURRENCY=10
CLOUD_RUN_AUTH=true
CORS_ORIGINS=https://your-frontend.example
GROQ_MODEL=openai/gpt-oss-20b
NOTIFICATION_WEBHOOK_URL=https://your-webhook.example/notifications
NOTIFICATION_WEBHOOK_SECRET=configure-in-secret-manager
```

Keep provider URLs/keys server-side (`LSTM_API_URL`, `COLLECTOR_API_URL`, `DISEASE_API_URL`, `PEST_API_URL`, Sentinel credentials, `GROQ_API_KEY`). The frontend only needs `VITE_API_BASE_URL` for these calls. Existing browser Firebase/Maps/weather credentials still need the appropriate provider restrictions. Notifications require a verified account email or a matching phone-auth claim, plus a configured HTTPS webhook and secret. A freely editable profile phone field is not treated as verification.

## Deployment requirements

1. Deploy application changes and Firebase rules together to staging. Validate with two separate users, including unauthorized reads/writes and field switching. The included `firestore.rules` and `database.rules.json` have local emulator coverage. Do not assume they match the rules currently deployed to your project.
2. Remove unauthenticated invoker access from the model/collector Cloud Run services. Grant the backend service account invoker access and set `CLOUD_RUN_AUTH=true`. Use Google application credentials for that account. This repository cannot protect still-public external model URLs. Configure instance/concurrency limits and billing alerts with each provider.
3. Migrate sensor writers to `users/{uid}/fields/{fieldId}/soil/{readingId}` with a server-issued `sensor:true` custom claim tied to that owning UID. Regular clients can read their own readings and delete them, but cannot forge readings. The old shared `/soil` path is blocked; do not automatically assign shared historical readings to a user without a reliable ownership mapping.
4. Vendor opportunities now use an opt-in directory with name and generalized location, without account contact details. Existing users are opted out until they enable the checkbox in Profile. Vendor documents remain business listings available to signed-in users; keep private business data in a separate protected store.
5. Configure and verify notification delivery in staging. The webhook must accept its configured Bearer secret. Production delivery needs provider receipts/callbacks if final delivered/failed status is required. No notifications were sent by the tests.
6. Verify live provider schemas, expected risk scale, imagery quality and model calibration before production release. The UI labels 0–100 values as scores, not calibrated disease probabilities. Bump analysis version when a model/schema changes. The current central schema version is in `analysisStore.js`.

## Vegetation contract

NDVI, NDRE, SAVI and EVI are standard formulas evaluated from Sentinel-2 L2A reflectance. They do not require a language model or a trained classifier. One 256×256 raster carries four indices, a clear-pixel flag, an invalid/cloud flag, acquisition day and coverage. Local aggregation excludes pixels outside the saved polygon and invalid/cloud pixels, and makes excluded heatmap pixels transparent. The response reports actual bounds, contributing imagery dates, coverage, approximate field/analyzed area and geometry hash. This replaces the inconsistent old five/six-band classifier paths. It is an index calculation, not a disease diagnosis or a validated crop-stage classifier.

The index formulas follow [Sentinel Hub's NDVI](https://custom-scripts.sentinel-hub.com/sentinel-2/ndvi/), [EVI](https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/evi/), and [SAVI](https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/savi/) references. Geometry handling uses the [Copernicus Process API](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/ApiReference.html).

## Checks

```sh
cd backend
npm ci
npm test
npm run test:rules  # requires Java 21
npm audit
cd ../frontend
npm ci
npm test
npm run lint
npm run build
npm audit
```

The rule test command uses only a demo project and local emulators. Backend tests stub provider calls; frontend tests cover explicit requests, deduplication, retries, and late responses after field changes. GitHub Actions runs the same checks. The live authenticated browser flow and paid provider integration still need a staging smoke test. Firebase Admin bypasses client rules, so ownership validation in backend handlers remains necessary ([Firebase documentation](https://firebase.google.com/docs/firestore/security/rules-conditions)).
