# Influnet React app (from `d:\influnet.io`)

The marketing site (`index.html`) stays at the site root. The React app is served under **`/app/`**.

## Build and copy into this folder

From `d:\influnet.io\Influnet-Io\Influnet-Io` (requires [pnpm](https://pnpm.io)):

```bash
pnpm install
set PORT=5000
set BASE_PATH=/app/
pnpm --filter @workspace/influnet build
```

Then copy the build output:

```powershell
Remove-Item -Recurse -Force "d:\influnet\app\*" -ErrorAction SilentlyContinue
Copy-Item -Recurse "d:\influnet.io\Influnet-Io\Influnet-Io\artifacts\influnet\dist\public\*" "d:\influnet\app\"
```

## Local development (two servers)

1. **Marketing site** (this folder): `py main.py` → http://localhost:8080  
2. **React app** (influnet.io repo):

```bash
cd d:\influnet.io\Influnet-Io\Influnet-Io
set PORT=5000
set BASE_PATH=/app/
pnpm --filter @workspace/influnet dev
```

Links from `index.html` open http://localhost:5000/app/login (etc.) automatically.

## Routes

| Path | React screen |
|------|----------------|
| `/app/login` | Log in |
| `/app/signup` | Sign up hub |
| `/app/signup/business` | Business sign up |
| `/app/signup/influencer` | Creator sign up |
| `/app/dashboard` | Business dashboard |
| `/app/dashboard/influencer` | Creator dashboard |
