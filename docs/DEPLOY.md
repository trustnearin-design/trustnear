# SEVALINK API — Production Deploy Guide

This is the deploy runbook for `api.trustnear.in`, running on **AWS App Runner** in `ap-south-1` (Mumbai). Decision rationale + roadmap in memory: `project-sevalink-launch-plan`.

---

## One-time setup (Vikas — Day 1)

### 1. AWS account

1. Create a NEW AWS account at https://aws.amazon.com/ (use email `aws+trustnear@<your-email>`).
2. Enable MFA on root, then create IAM admin user for daily work.
3. Set **billing alert at $50/mo** (Billing → Budgets).
4. Verify region: **`ap-south-1` (Mumbai)** for all resources.

### 2. ECR repository

```bash
aws ecr create-repository \
  --repository-name trustnear-api \
  --region ap-south-1 \
  --image-scanning-configuration scanOnPush=true
```

Note the URI: `<account-id>.dkr.ecr.ap-south-1.amazonaws.com/trustnear-api`.

### 3. OIDC trust for GitHub Actions

This lets GitHub push to ECR + trigger App Runner **without long-lived AWS keys**.

```bash
# Create the OIDC provider (one-time per AWS account)
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
  --client-id-list sts.amazonaws.com
```

Create role `github-actions-deploy` with this trust policy (replace `<repo-slug>` with `vikas-jain/sevalink` or your actual repo):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:<repo-slug>:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

Attach inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["apprunner:StartDeployment", "apprunner:DescribeService"],
      "Resource": "arn:aws:apprunner:ap-south-1:<account-id>:service/trustnear-api/*"
    }
  ]
}
```

### 4. App Runner service

1. AWS Console → App Runner → Create service
2. Source: **Container registry → Amazon ECR**
3. Image URI: `<account-id>.dkr.ecr.ap-south-1.amazonaws.com/trustnear-api:latest`
4. Deployment trigger: **Manual** (GitHub Actions will trigger via API)
5. ECR access role: create new (default name OK)
6. Service settings:
   - Name: `trustnear-api`
   - vCPU: **1**, Memory: **2 GB**
   - Port: **8080**
   - Auto scaling: min 1, max 3, concurrency 100
7. Environment variables: paste from `.env.production` (one by one in the UI, or via JSON import)
8. Health check: `/health` (TODO — add this endpoint, currently 404)
9. Create — wait ~5 min for first deploy.

Note the service ARN — needed for GitHub secret.

### 5. Custom domain

1. App Runner service → Custom domains → Add `api.trustnear.in`
2. Add the CNAME records App Runner gives you to your domain DNS (Route 53 or wherever you bought the domain).
3. Wait ~10 min for DNS + cert validation.

### 6. GitHub repo secrets

In GitHub: Settings → Secrets and variables → Actions → New repository secret:

| Secret name              | Value                                           |
| ------------------------ | ----------------------------------------------- |
| `AWS_ACCOUNT_ID`         | 12-digit AWS account number                     |
| `AWS_REGION`             | `ap-south-1`                                    |
| `AWS_DEPLOY_ROLE_ARN`    | ARN of `github-actions-deploy` role from step 3 |
| `APP_RUNNER_SERVICE_ARN` | ARN of `trustnear-api` service from step 4      |

---

## Day-to-day deploy

**Auto:** Push to `main` with any change in `apps/api/**`, `packages/db/**`, `packages/types/**`, `packages/utils/**`, or `pnpm-lock.yaml` → GitHub Actions builds + pushes to ECR + triggers App Runner deploy. Wait ~5 min for new revision to go live.

**Manual hotfix:** GitHub → Actions → "Deploy API → AWS App Runner" → Run workflow → enter reason.

**Rollback:** Go to App Runner console → service → Deployments → select previous deployment → Promote.

---

## Database migrations

Migrations don't auto-run. After a schema change:

```bash
# From repo root
DATABASE_URL=<prod direct URL> pnpm --filter @sevalink/db exec prisma migrate deploy
```

**Always test migrations on the staging DB first** before running against production.

---

## Troubleshooting

| Symptom                          | Likely cause                                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| App Runner shows `CREATE_FAILED` | Image too large (>10GB), or container crashes on boot. Check CloudWatch logs                        |
| 502 Bad Gateway                  | App not listening on port 8080. Check `PORT` env var                                                |
| Prisma "client not generated"    | Dockerfile didn't run `prisma generate` — confirm build stage                                       |
| ECR push 403                     | OIDC role doesn't have ECR permissions, or trust policy mismatch                                    |
| Webhook from Cashfree fails      | App Runner is behind a load balancer — confirm webhook secret matches `CASHFREE_WEBHOOK_SECRET` env |

---

## Cost estimate (steady state)

- App Runner (1 vCPU, 2 GB, ~50% utilization): ~$35/mo
- ECR storage: ~$1/mo
- CloudFront + S3 (low traffic): ~$5/mo
- Route 53 hosted zone: $0.50/mo
- ACM certs: free
- **Total AWS: ~$40-50/mo** at launch traffic
