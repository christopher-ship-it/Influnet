# Firebase Hosting — Influnet

Firebase serves the **`influnet/`** folder as the site root (single React SPA).

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

Build the React app and copy assets into `influnet/`:

**Windows PowerShell** (from repo root):

```powershell
.\scripts\build-react-app.ps1
```

**WSL / Git Bash** (from `d:\influnet.io\Influnet-Io\Influnet-Io`):

```bash
export PORT=5000 BASE_PATH=/
pnpm install
pnpm --filter @workspace/influnet build
cp -r artifacts/influnet/dist/public/assets/* /mnt/d/influnet/influnet/assets/
```

If hashed bundle names changed, update `influnet/index.html` script/link paths.

---

## Deploy

```bash
cd d:\influnet
firebase login
firebase deploy --only hosting
```

---

## Local test

```bash
cd d:\influnet
firebase emulators:start --only hosting
```

- http://127.0.0.1:5000/ → landing  
- http://127.0.0.1:5000/login → React login  

---

## What gets uploaded

Everything under **`influnet/`** only:

- `index.html`, `assets/`, `Asset/`, `favicon.svg`, `robots.txt`, legacy `*.html`

Not uploaded: repo root `scripts/`, `influnet.io/`, dotfiles (see `firebase.json` `ignore`).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank page at `/` | Run `build-react-app.ps1`; check 404 on `/assets/*.js` in DevTools |
| 404 on `/login` after refresh | Redeploy; confirm `rewrites` in `firebase.json` |
| Old `/app/login` links | Firebase 301 `/app/**` → `/**` |
| Live site still “Coming Soon” | Run `firebase deploy --only hosting` after merge |
