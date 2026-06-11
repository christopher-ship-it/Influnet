# Influnet website

All deployable site files live in this folder. Firebase Hosting serves this directory as the site root (`firebase.json` → `"public": "influnet"`).

## Contents

| Path | Purpose |
|------|---------|
| `index.html` | React SPA shell |
| `assets/` | Vite JS/CSS bundles |
| `Asset/` | Images, logos, media |
| `*.html` stubs | Legacy short links (redirect to React routes) |
| `app/` | Legacy `/app` redirect |

## Build

From the repo root:

```powershell
.\scripts\build-react-app.ps1
```

Source monorepo (separate clone): `D:\influnet.io\Influnet-Io\Influnet-Io` with `BASE_PATH=/`.

After a build, if bundle hashes change, update `script` / `link` in `index.html`.

## Routes

| Path | Screen |
|------|--------|
| `/` | Marketing landing |
| `/login` | Log in |
| `/signup`, `/signup/business`, `/signup/influencer` | Sign up |
| `/dashboard`, `/dashboard/influencer` | Dashboards |
| `/influencers` | Creator discover |
| `/for-businesses`, `/for-influencers`, `/how-it-works`, `/pricing` | Marketing |

## Supabase (login / signup)

- `supabase-config.js` — project URL + publishable key  
- `supabase-auth-bridge.js` — connects UI to Supabase Auth  

Run DB migration (optional but recommended):

```powershell
.\scripts\apply-supabase-schema.ps1
```

In Supabase Dashboard → **Authentication** → disable **Confirm email** for easier testing.

## Local test

```powershell
cd D:\influnet
.\scripts\serve-local.ps1
```

Open http://127.0.0.1:5000/

If you see **Cannot GET /**, an old server is still on port 5000 — run `serve-local.ps1` (it stops the stale process) or close other terminals using that port.

Firebase emulator (optional):

```powershell
cd D:\influnet
firebase emulators:start --only hosting
```
