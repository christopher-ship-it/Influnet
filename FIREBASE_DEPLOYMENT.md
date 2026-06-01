# Firebase Hosting — Influnet

Firebase serves **one site** from this folder:

| URL | What |
|-----|------|
| `/` | Marketing (`index.html`) |
| `/discover.html` | Creator discover (static) |
| `/app/**` | React app (login, signup, dashboards) |
| `login.html`, `signup.html`, … | Short links from `index.html` → redirect into `/app/...` |

Project ID is in `.firebaserc` (`influnet-63626`). Links on the marketing pages use same-origin `/app/...` in production (see `app-config.js`).

---

## Before each deploy

Build the React app and copy it into `app/` (required for login/signup to work).

**WSL or Git Bash** (recommended), from `d:\influnet.io\Influnet-Io\Influnet-Io`:

```bash
export PORT=5000
export BASE_PATH=/app/
pnpm install
pnpm --filter @workspace/influnet build
```

Copy output:

```bash
cp -r artifacts/influnet/dist/public/* /mnt/d/influnet/app/
```

**Windows PowerShell** (after a successful build):

```powershell
.\scripts\build-react-app.ps1
```

Confirm `app/index.html` and `app/assets/` exist (not only the “not built yet” placeholder).

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

Marketing and the app share the same origin, so `/app/login` works without CORS changes.

---

## What gets uploaded

- `index.html`, `discover.html`, `app-config.js`, `site-nav.js`, `Asset/`
- `app/` — full Vite build (`index.html`, `assets/*`, etc.)

Not uploaded (see `firebase.json` `ignore`): `main.py`, `scripts/`, dotfiles, Replit files.

---

## Routing

- Static files are served as-is (`/index.html`, `/Asset/...`, `/app/assets/...`).
- Any other path under `/app/` (e.g. `/app/login`, `/app/dashboard`) is rewritten to `/app/index.html` for client-side routing (Wouter).

---

## Local testing (matches Firebase)

```bash
py main.py
# http://localhost:8080/          → marketing
# http://localhost:8080/app/login → React (after build in app/)
```

Or emulate hosting:

```bash
firebase emulators:start --only hosting
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `/app/login` shows “React app not built yet” | Run build + copy into `app/` before `firebase deploy` |
| 404 on `/app/dashboard` after refresh | Ensure `rewrites` for `/app/**` are in `firebase.json` and redeploy |
| Old JS after deploy | Hard refresh; `app/index.html` is `no-cache`; hashed files under `app/assets/` are long-cached |
| Deploy permission error | `firebase login` and confirm project in `.firebaserc` |

---

## CI (optional)

```yaml
# Example GitHub Actions step
- run: |
    export PORT=5000 BASE_PATH=/app/
    pnpm install --filter @workspace/influnet...
    pnpm --filter @workspace/influnet build
    cp -r artifacts/influnet/dist/public/* $GITHUB_WORKSPACE/influnet/app/
- run: firebase deploy --only hosting --token ${{ secrets.FIREBASE_TOKEN }}
```

Generate a token: `firebase login:ci`.
