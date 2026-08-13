---
name: cloud-deployment
description: Design and review container-based cloud deployments, release strategies, observability, rollback, and production-readiness controls. Use for deployment plans, Dockerfiles, cloud infrastructure, or release reviews.
---

# Skill: cloud-deployment

Container deployment patterns for `{{CLOUD_PROVIDER}}`. Examples use AWS ECS + Fargate — translate to GCP Cloud Run, Azure Container Apps, or GKE as needed.

---

## Container Design Rules

### Dockerfile
```dockerfile
# Multi-stage: build stage has dev deps, production stage has none
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json .
USER app
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

Rules:
- Use specific version tags — never `latest` in production images
- Run as non-root user
- Multi-stage builds — no dev dependencies in final image
- Minimal base image (Alpine, Distroless)
- `.dockerignore` excludes: `node_modules`, `.env`, `*.local`, `coverage`, `_ai`

### Health Checks
Every service exposes two endpoints:

```typescript
// GET /health/live — am I running?
app.get('/health/live', (req, res) => res.status(200).json({ status: 'ok' }))

// GET /health/ready — am I ready to serve traffic?
app.get('/health/ready', async (req, res) => {
  const dbOk = await checkDatabaseConnection()
  if (!dbOk) return res.status(503).json({ status: 'not_ready', reason: 'database' })
  res.status(200).json({ status: 'ok' })
})
```

### Graceful Shutdown
```typescript
process.on('SIGTERM', async () => {
  // Stop accepting new connections
  server.close(async () => {
    // Finish in-flight requests, drain job queue
    await jobQueue.stop()
    await db.pool.end()
    process.exit(0)
  })
  // Force exit if drain takes too long
  setTimeout(() => process.exit(1), 30_000)
})
```

---

## AWS ECS + Fargate (Reference Architecture)

### Task Definition (key settings)
```json
{
  "family": "{{SERVICE_NAME}}",
  "cpu": "512",
  "memory": "1024",
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "containerDefinitions": [{
    "name": "app",
    "image": "{{ECR_URI}}:{{IMAGE_TAG}}",
    "portMappings": [{ "containerPort": 3000 }],
    "environment": [
      { "name": "NODE_ENV", "value": "production" },
      { "name": "PORT", "value": "3000" }
    ],
    "secrets": [
      { "name": "DATABASE_URL", "valueFrom": "{{SSM_OR_SECRETS_MANAGER_ARN}}" }
    ],
    "healthCheck": {
      "command": ["CMD-SHELL", "wget -q -O - http://localhost:3000/health/live || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3,
      "startPeriod": 10
    },
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/{{SERVICE_NAME}}",
        "awslogs-region": "{{AWS_REGION}}",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }]
}
```

### Service (key settings)
- Launch type: `FARGATE`
- Min healthy percent: 100 (rolling deployment, no downtime)
- Max healthy percent: 200 (double capacity during deploy)
- Desired count: 2 minimum in production
- Auto-scaling: CPU > 70% → scale out; CPU < 30% for 5 min → scale in

### Networking
```
VPC
├── Public Subnets (2 AZs)    ← ALB only
├── Private Subnets (2 AZs)   ← ECS tasks, RDS, ElastiCache
└── Database Subnets (2 AZs)  ← RDS only, no outbound internet
```

Security groups:
- ALB: inbound 443 from 0.0.0.0/0
- ECS tasks: inbound 3000 from ALB SG only
- RDS: inbound 5432 from ECS SG only

---

## Environment Configuration

Never bake config into images. Everything via environment at runtime.

```
# Required in all environments
DATABASE_URL          ← from Secrets Manager
REDIS_URL             ← from Secrets Manager (if used)
SESSION_SECRET        ← from Secrets Manager
NODE_ENV              ← production / staging / development
PORT                  ← 3000

# Feature flags / runtime config
LOG_LEVEL             ← info / debug / warn
RATE_LIMIT_WINDOW_MS  ← 60000
RATE_LIMIT_MAX        ← 100
```

`.env.example` documents every variable with placeholder values and comments. Never committed: `.env`, `.env.local`, `.env.production`.

---

## CI/CD Pipeline (GitHub Actions Reference)

```yaml
# .github/workflows/deploy.yml

on:
  push:
    branches: [main, dev]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_PASSWORD: test }
        options: --health-cmd pg_isready
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with: { role-to-assume: ${{ secrets.AWS_ROLE_ARN }}, aws-region: ap-south-1 }
      - uses: aws-actions/amazon-ecr-login@v2
      - run: |
          docker build -t $ECR_URI:${{ github.sha }} .
          docker push $ECR_URI:${{ github.sha }}

  deploy-staging:
    needs: build-and-push
    if: github.ref == 'refs/heads/dev'
    runs-on: ubuntu-latest
    steps:
      - run: aws ecs update-service --cluster staging --service {{SERVICE_NAME}} --force-new-deployment

  deploy-production:
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    environment: production  # requires manual approval
    runs-on: ubuntu-latest
    steps:
      - run: aws ecs update-service --cluster production --service {{SERVICE_NAME}} --force-new-deployment
```

---

## Observability

### Structured Logging
```json
{
  "timestamp": "2024-01-15T09:30:00.000Z",
  "level": "info",
  "message": "Application status changed",
  "trace_id": "abc123",
  "tenant_id": "tenant-uuid",
  "user_id": "user-uuid",
  "resource_type": "application",
  "resource_id": "app-uuid",
  "from_status": "pending",
  "to_status": "active",
  "duration_ms": 45
}
```

### Key Metrics to Instrument
- `http_request_duration_ms` — p50, p95, p99 per route
- `http_requests_total` — by method, route, status code
- `db_query_duration_ms` — p50, p95 per query name
- `job_queue_depth` — per queue name
- `job_processing_duration_ms` — per job type

### Alert Thresholds (Adjust Per Project)
| Metric | Warning | Critical |
|---|---|---|
| Error rate (5xx) | > 1% for 5min | > 5% for 2min |
| P99 latency | > 2s for 5min | > 5s for 2min |
| Service health | Any task unhealthy | 50% tasks unhealthy |
| Queue depth | > 100 jobs | > 1000 jobs |
