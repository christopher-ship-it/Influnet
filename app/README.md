# Influnet React app (site root)

The full site is a **single React SPA** served from the repository root (`/`).

## Build and deploy

From `D:\influnet.io\Influnet-Io\Influnet-Io` (requires [pnpm](https://pnpm.io)):

```bash
export PORT=5000
export BASE_PATH=/
pnpm install
pnpm --filter @workspace/influnet build
```

Copy build output into this repo:

```powershell
.\scripts\build-react-app.ps1
```

Or manually:

```powershell
Copy-Item -Recurse "D:\influnet.io\Influnet-Io\Influnet-Io\artifacts\influnet\dist\public\assets\*" "D:\influnet\assets\"
```

After a build, if Vite emits new hashed filenames, update `script` / `link` tags in `D:\influnet\index.html`.

## Routes (same origin)

| Path | Screen |
|------|--------|
| `/` | Marketing landing |
| `/login` | Log in |
| `/signup` | Sign up hub |
| `/signup/business` | Business sign up |
| `/signup/influencer` | Creator sign up |
| `/dashboard` | Business dashboard |
| `/dashboard/influencer` | Creator dashboard |
| `/influencers` | Creator discover |
| `/for-businesses`, `/for-influencers`, `/how-it-works`, `/pricing` | Marketing pages |

Legacy `/app/**` URLs redirect to the same paths without `/app` (see `firebase.json`).

## Local development

```bash
cd D:\influnet.io\Influnet-Io\Influnet-Io
export PORT=5000 BASE_PATH=/
pnpm --filter @workspace/influnet dev
```

Or after `build-react-app.ps1`, use Firebase emulator:

```bash
cd D:\influnet
firebase emulators:start --only hosting
```
