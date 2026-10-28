# Production deployment

Frontend: https://farm-analysis-zeta.vercel.app
API: https://farm-analysis-api.vercel.app

Vercel account/team: `kaksaab2605-8884s-projects`.

| Folder | Vercel project | Runtime |
|---|---|---|
| `frontend` | `farm-analysis` | Vite / Node 22 build |
| `backend` | `farm-analysis-api` | Node 22 Vercel Function, 300-second maximum |

## Configuration

- The frontend production environment sets `VITE_API_BASE_URL=https://farm-analysis-api.vercel.app/api`.
- Backend credentials and provider secrets are stored as sensitive Vercel environment variables. Neither deployment uploads local `.env*` files.
- The API permits the production frontend origin through `CORS_ORIGINS`.
- `NODE_OPTIONS=--experimental-require-module` is required for Firebase Admin 14's JWKS dependency on Vercel. This follows [Vercel's Node configuration documentation](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration).
- New Firebase authorized domain: `farm-analysis-zeta.vercel.app`. Anonymous authentication is enabled.
- The repository's reviewed Firestore ownership rules were published. The previous ruleset reference was backed up locally under `/tmp/farmAnalysis-firestore-rules-before-deployment.json`.
- Uploads are limited to 4 MiB to stay below [Vercel's function payload limit](https://vercel.com/docs/functions/limitations).
- All model work remains explicit and quota-controlled. Deployment verification does not execute paid inference or create test accounts.
- Realtime Database sensor migration and provider/notification configuration requirements remain as documented in `HARDENING.md`.

## Deploy updates

The current deployment was published from the local working tree. No Git commit or push was performed.

Run from the appropriate linked folder:

```sh
npx --yes vercel deploy --prod --yes --scope kaksaab2605-8884s-projects
```

To reapply allowlisted environment values after changing local configuration, run from `backend`:

```sh
node scripts/prepare-vercel.mjs backend
node scripts/prepare-vercel.mjs frontend https://farm-analysis-api.vercel.app
node scripts/prepare-vercel.mjs cors https://farm-analysis-zeta.vercel.app
```

These scripts read the existing Vercel login and upload allowlisted settings directly; secret values are not logged or placed in shell arguments. Redeploy after updating environment variables. Do not replace development localhost URLs throughout the source.

## Verification

The production homepage and signup route return HTTP 200. The API health route returns HTTP 200. Unauthenticated analysis requests return HTTP 401, and the production frontend's CORS preflight returns HTTP 204. The deployed frontend asset points at the new API URL. Full authenticated application testing is left to the user.
