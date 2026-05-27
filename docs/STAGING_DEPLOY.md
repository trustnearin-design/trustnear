# TrustNear API — Staging Deploy (Today's runbook)

**Goal:** Get the Hono API running on AWS App Runner with a public HTTPS URL within ~1-2 hours.

**Scope:** Staging only. Uses your existing **dev Neon + dev Upstash** credentials (sharing risk acknowledged). No custom domain, no S3, no CloudFront. Production-grade deploy comes later in [DEPLOY.md](DEPLOY.md).

---

## What you'll have at the end

- A public URL like `xyz.ap-south-1.awsapprunner.com`
- Auto-deploys on every push to GitHub `main`
- CloudWatch logs
- Same data as dev (Neon + Upstash dev tier)

---

## Step 1 — Create AWS account (15 min)

1. Go to https://aws.amazon.com/ → "Create an AWS account"
2. Use **a new email** like `aws+trustnear@yourgmail.com` (Gmail supports `+` aliases — keeps prod isolated from your personal AWS)
3. Add a payment method (₹500 hold, no actual charge yet)
4. Phone OTP verification
5. Pick **Basic Support — Free**
6. After signup completes:
   - Sign in to console
   - Top-right → your account → **My Account → Edit Account Settings → Confirm region = `ap-south-1` (Mumbai)**
   - Enable MFA on root: IAM → Users → security credentials → assign MFA
   - **Set billing alert:** Billing & Cost Management → Budgets → Create budget → "Monthly cost" $50 → email yourself when 80% / 100% spent

**⏱ Time:** 10-15 min. Don't skip MFA.

---

## Step 2 — Create GitHub repo + push code (10 min)

### 2a. Make a new GitHub repo

- https://github.com/new
- Owner: yourself / your org
- Name: `trustnear` (or `sevalink-monorepo` — your call)
- **Private** (recommended for an unreleased product)
- Skip "Add README" / `.gitignore` / license (we already have these)

You'll land on an empty repo page. Copy the URL — it'll look like `https://github.com/vikasjain/trustnear.git`.

### 2b. Commit today's work + push

Open PowerShell in the repo root:

```powershell
# Stage everything (gitignore already excludes .env files + node_modules)
git add .

# Sanity check — make sure no .env files are staged
git diff --cached --name-only | Select-String "\.env"
# Expected output: nothing. If something matches, STOP and tell me.

# Commit
git commit -m "feat: 2026-05-27 — brand integration, mascot system, admin image upload, production prep"

# Add remote (paste your GitHub URL)
git remote add origin https://github.com/<your-username>/trustnear.git

# Push
git push -u origin main
```

If push asks for a credential, GitHub now requires a **personal access token**, not your password. Generate one at https://github.com/settings/tokens/new → check `repo` scope → copy → paste as password.

---

## Step 3 — Create App Runner service (15 min, console clicks)

1. **AWS console → App Runner → Create service**
2. **Source and deployment:**
   - Repository type: **Source code repository**
   - Connect to GitHub → "Add new" → authorize AWS in GitHub → pick your `trustnear` repo
   - Branch: `main`
   - Source directory: `.` (just a dot — repo root)
   - Deployment trigger: **Automatic** (auto-redeploy on every push to main)
3. **Configure build (next page):**
   - Configuration source: **Configure all settings here**
   - Build settings: **Dockerfile**
   - Dockerfile location: `apps/api/Dockerfile`
   - Image port: `8080`
4. **Configure service (next page):**
   - Service name: `trustnear-api-staging`
   - Virtual CPU: `1 vCPU`
   - Virtual memory: `2 GB`
   - Auto scaling: leave defaults (1 min, 25 max)
5. **Environment variables:** Click "Add environment variable" for each row below. Values come from your local `.env.local`:

| Name                       | Source                                                                 |
| -------------------------- | ---------------------------------------------------------------------- |
| `NODE_ENV`                 | `production`                                                           |
| `PORT`                     | `8080`                                                                 |
| `LOG_LEVEL`                | `info`                                                                 |
| `DATABASE_URL`             | Copy from `.env.local`                                                 |
| `DIRECT_URL`               | Copy from `.env.local`                                                 |
| `REDIS_URL`                | Copy from `.env.local`                                                 |
| `JWT_SECRET`               | Copy from `.env.local` (or generate fresh with `openssl rand -hex 32`) |
| `JWT_REFRESH_SECRET`       | Copy from `.env.local` (must be different from JWT_SECRET)             |
| `JWT_ACCESS_EXPIRY`        | `15m`                                                                  |
| `JWT_REFRESH_EXPIRY`       | `30d`                                                                  |
| `MSG91_AUTH_KEY`           | Copy (leave blank if not set — uses mock SMS)                          |
| `MSG91_TEMPLATE_ID`        | Copy (leave blank if not set)                                          |
| `MSG91_SENDER_ID`          | `TRSNER`                                                               |
| `CASHFREE_ENV`             | `sandbox`                                                              |
| `CASHFREE_APP_ID`          | Copy from `.env.local`                                                 |
| `CASHFREE_SECRET_KEY`      | Copy from `.env.local`                                                 |
| `SETU_ENV`                 | `sandbox`                                                              |
| `SETU_BASE_URL`            | `https://dg-sandbox.setu.co`                                           |
| `SETU_CLIENT_ID`           | Copy from `.env.local`                                                 |
| `SETU_CLIENT_SECRET`       | Copy from `.env.local`                                                 |
| `SETU_PRODUCT_INSTANCE_ID` | Copy from `.env.local`                                                 |
| `AWS_REGION`               | `ap-south-1`                                                           |

**Important:** Mark `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CASHFREE_SECRET_KEY`, `SETU_CLIENT_SECRET`, `DATABASE_URL`, `REDIS_URL`, `MSG91_AUTH_KEY` as **Secret** (App Runner stores them in Secrets Manager).

6. **Health check (same page, scroll down):**
   - Protocol: HTTP
   - Path: `/health`
   - Interval: 10 seconds
   - Timeout: 5 seconds
   - Healthy threshold: 1
   - Unhealthy threshold: 5
7. **Networking:** Leave defaults (public endpoint, no VPC connector for now).
8. Click **"Create & deploy"**.

App Runner now builds your image (~5-8 min) and starts the service. Watch the **"Activity"** tab for build logs.

---

## Step 4 — Verify deploy (5 min)

Once status = **"Running"** (green badge), copy the **"Default domain"** URL from the service overview (e.g. `2a3b4c5d.ap-south-1.awsapprunner.com`).

Test in PowerShell:

```powershell
curl https://YOUR-URL.ap-south-1.awsapprunner.com/health
# Expected: {"success":true,"data":{"status":"ok",...}}

curl https://YOUR-URL.ap-south-1.awsapprunner.com/api/v1/categories/tree
# Expected: JSON with 10 parent categories
```

Both work? **Staging is live.** 🚀

---

## Step 5 — Point your phone app at staging (5 min, optional)

If you want to test the live API from your phone:

1. Edit `apps/customer/app.json`:
   ```json
   "extra": {
     "apiBaseUrl": "https://YOUR-URL.ap-south-1.awsapprunner.com",
     "apiBaseUrlDevice": "https://YOUR-URL.ap-south-1.awsapprunner.com",
     ...
   }
   ```
2. Restart Metro (`pnpm start --clear` in `apps/customer`)
3. Phone reload → it'll talk to staging API now

To switch back to local dev, change those URLs back to `http://192.168.1.19:3000`.

---

## What auto-deploys

Every `git push` to `main` triggers a fresh build + zero-downtime deploy on App Runner. No GitHub Actions or OIDC role needed for this path — App Runner manages it.

---

## Troubleshooting

**Build fails:**

- Check App Runner → service → "Logs" → "Application logs" — Dockerfile build output is there
- Most common: missing env var that the API expects at boot. Check `apps/api/src/env.ts` for required fields, add to App Runner env vars.

**Service shows "Operation in progress" forever:**

- Health check is failing. App Runner pings `/health` every 10s; if it doesn't get a 200, container restarts. Check application logs for boot errors (Prisma connection, Redis connection).

**429 rate limited from phone:**

- You added rate limiting earlier (20/min auth, 120/min api). Wait a minute or scale up the windows in `app.ts`.

**Phone can't reach the URL:**

- App Runner uses HTTPS only. If you forgot `https://` in app.json, the fetch will fail silently. Check Metro logs.

---

## Costs (staging, ap-south-1)

- App Runner: ~₹15-25/day idle (1 vCPU / 2 GB, min 1 instance). Scales down to 0 instances if you enable provisioned-only mode, but adds cold start latency.
- Inbound/outbound traffic: free for first 1 GB/month.
- Total: **~₹500-800/month for staging.** Acceptable.

To pause spending while not actively testing:

- App Runner → service → "Pause" (no charges while paused, instant resume).

---

## When you're ready for real production

See [DEPLOY.md](DEPLOY.md) for the full path with:

- Separate Neon prod project
- Separate Upstash prod Redis
- S3 bucket + CloudFront for media
- `trustnear.in` custom domain
- ACM certificate + Route 53
- Secrets Manager integration
- IAM least-privilege

Don't try to do those today. Staging first, then iterate.
