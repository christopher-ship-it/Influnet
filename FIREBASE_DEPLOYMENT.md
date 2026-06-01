# Firebase Hosting — Influnet

Firebase serves **one React SPA** from this folder.

| URL | What |
|-----|------|
| `/` | Marketing landing + app (client routes) |
| `/login`, `/signup`, `/dashboard`, … | React screens |
| `/Asset/**` | Images, logos, media |
| `/assets/**` | Vite JS/CSS bundles |
| `login.html`, `discover.html`, … | Legacy short links → redirect to React routes |

Project ID is in `.firebaserc` (`influnet-63626`).

`/app/**` permanently redirects to the same path without `/app` (old bookmarks).

---

## Before each deploy

Build the React app and copy assets into the site root (required for the site to work).

**WSL or Git Bash**, from `d:\influnet.io\Influnet-Io\Influnet-Io`:

```bash
export PORT=5000
export BASE_PATH=/
pnpm install
pnpm --filter @workspace/influnet build
```

Copy output:

```bash
cp -r artifacts/influnet/dist/public/assets/* /mnt/d/influnet/assets/
cp artifacts/influnet/dist/public/favicon.svg /mnt/d/influnet/
```

If hashed bundle names changed, update `index.html` script/link paths.

**Windows PowerShell**:

```powershell
.\scripts\build-react-app.ps1
```

Confirm `assets/index-*.js` exists and `index.html` references match.

---

## Deploy

```bash
cd d:\influnet
firebase login
firebase deploy --only hosting
```

Preview channel (optional):

```bash
firebase hosting:channel:deploy preview
```

---

## Custom domain (influnet.io)

1. Firebase Console → **Hosting** → **Add custom domain**
2. Add `influnet.io` and `www.influnet.io` (or your chosen canonical host)
3. Add the DNS records Firebase shows at your registrar
4. Wait for SSL provisioning (often minutes, DNS up to 24h)

All routes share one origin; no `/app` prefix.

---

## What gets uploaded

- `index.html` — SPA shell
- `assets/` — Vite build
- `Asset/` — marketing media
- `favicon.svg`, `robots.txt`, legacy `*.html` redirects

Not uploaded (see `firebase.json` `ignore`): `main.py`, `scripts/`, `influnet.io/`, dotfiles, Replit files.

---

## Routing

- Existing static files are served as-is (`/Asset/...`, `/assets/...`, `login.html`, etc.).
- All other paths rewrite to `/index.html` for client-side routing (Wouter, base `/`).

---

## Local testing

```bash
firebase emulators:start --only hosting
# http://localhost:5000/           → landing
# http://localhost:5000/login      → React login
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank page at `/` | Run `build-react-app.ps1`; check browser console for 404 on `/assets/*.js` |
| 404 on `/login` after refresh | Ensure `rewrites` in `firebase.json` and redeploy |
| Old `/app/login` links | Firebase 301 redirects `/app/**` → `/**` |
| Old JS after deploy | Hard refresh; `index.html` is `no-cache`; hashed files under `/assets/` are long-cached |
| Deploy permission error | `firebase login` and confirm project in `.firebaserc` |

---

## CI (optional)

```yaml
- run: |
    export PORT=5000 BASE_PATH=/
    pnpm install --filter @workspace/influnet...
    pnpm --filter @workspace/influnet build
    cp -r artifacts/influnet/dist/public/assets/* $GITHUB_WORKSPACE/influnet/assets/
- run: firebase deploy --only hosting --token ${{ secrets.FIREBASE_TOKEN }}
```

Generate a token: `firebase login:ci`.
