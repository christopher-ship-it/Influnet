# Influnet

Repository for [Influnet](https://github.com/christopher-ship-it/Influnet) Firebase Hosting.

## Layout

```
influnet/          ← entire website (SPA, assets, media, redirects)
scripts/           ← build helper (copies React output into influnet/)
influnet.io/       ← optional; React source monorepo (not deployed; ignored by Firebase)
firebase.json      ← hosting config (public folder: influnet)
```

## Quick start

```powershell
cd D:\influnet
.\scripts\serve-local.ps1
# http://127.0.0.1:5000/

firebase deploy --only hosting
```

If the browser shows **Cannot GET /**, stop old servers on port 5000 and run `serve-local.ps1` again.

See [FIREBASE_DEPLOYMENT.md](FIREBASE_DEPLOYMENT.md) and [influnet/README.md](influnet/README.md).

**Database (Supabase):** [docs/SUPABASE.md](docs/SUPABASE.md) — schema + wiring for business / influencer login & signup UI.
