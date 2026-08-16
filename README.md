# cloudinary-server (Vercel)

Replaces the Firebase Cloud Functions `getCloudinarySignature` / `deleteCloudinaryAsset`
with two Vercel serverless functions, so you don't need the Firebase Blaze plan
just for these two endpoints. Firebase Auth + Firestore are still used (only to verify
who is calling and whether they own the visit) — just not Cloud Functions.

## Endpoints
- `POST /api/get-signature` — body: `{ visitId, schoolId, category }`
- `POST /api/delete-asset` — body: `{ visitId, publicId, resourceType }`

Both require header: `Authorization: Bearer <Firebase ID token>`

## Deploy
1. `cd cloudinary-server`
2. `npm i -g vercel` (once), then `vercel` → follow prompts → `vercel --prod`
   (or: push this repo to GitHub and import it in the Vercel dashboard,
   set **Root Directory** to `cloudinary-server`)
3. In the Vercel project → Settings → Environment Variables, add all vars from `.env.example`.
4. Copy the deployment URL (e.g. `https://cloudinary-server.vercel.app`) into the
   Android app's `VERCEL_API_BASE_URL`.
