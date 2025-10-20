# 🚂 Railway Deployment Guide

Complete guide for deploying the classify-restate system to Railway.

## 📋 Overview

This guide covers deploying the complete stack:
- **TimescaleDB** (PostgreSQL with time-series extensions)
- **Restate Server** (workflow orchestration)
- **Classify Services** (Node.js classification/quality/consensus services)
- **Environment Configuration**
- **Scaling & Monitoring**

---

## 🏗️ Architecture on Railway

```
Railway Project: tellimer-classify
├── Service 1: timescaledb (PostgreSQL)
├── Service 2: restate-server (Restate runtime)
└── Service 3: classify-service (Node.js app)
    ├── Classification API
    ├── Data Quality API
    ├── Consensus Analysis API
    └── Final Indicators API
```

---

## 🚀 Step-by-Step Deployment

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Empty Project"**
4. Name it: `tellimer-classify`

---

### Step 2: Deploy TimescaleDB

#### Option A: Using Railway PostgreSQL Plugin (Recommended)

1. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway will provision a PostgreSQL instance
3. Click on the PostgreSQL service → **"Variables"** tab
4. Note these environment variables (auto-generated):
   - `DATABASE_URL`
   - `PGHOST`
   - `PGPORT`
   - `PGDATABASE`
   - `PGUSER`
   - `PGPASSWORD`

5. **Enable TimescaleDB Extension:**
   - Click **"Data"** tab
   - Click **"Query"**
   - Run: `CREATE EXTENSION IF NOT EXISTS timescaledb;`

#### Option B: Custom TimescaleDB Docker Image

1. Click **"+ New"** → **"Empty Service"**
2. Name: `timescaledb`
3. Go to **"Settings"** → **"Source"**
4. Set **"Source Image"**: `timescale/timescaledb:latest-pg16`
5. Add environment variables:
   ```
   POSTGRES_USER=classify
   POSTGRES_PASSWORD=<generate-strong-password>
   POSTGRES_DB=classify
   ```
6. Go to **"Settings"** → **"Networking"**
7. Click **"Enable Public Networking"** (optional, for external access)
8. Note the internal URL: `timescaledb.railway.internal:5432`

---

### Step 3: Deploy Restate Server

1. Click **"+ New"** → **"Empty Service"**
2. Name: `restate-server`
3. Go to **"Settings"** → **"Source"**
4. Set **"Source Image"**: `docker.restate.dev/restatedev/restate:latest`

5. Add environment variables:
   ```
   RESTATE_LOG_FILTER=restate=info
   RESTATE_WORKER__INVOKER__INACTIVITY_TIMEOUT=5m
   RESTATE_WORKER__INVOKER__ABORT_TIMEOUT=5m
   ```

6. Go to **"Settings"** → **"Networking"**
   - **Ingress Port**: `8080` (for HTTP API)
   - **Admin Port**: `9070` (for admin/registration)
   - Click **"Generate Domain"** for both ports

7. Note your domains:
   - Ingress: `https://restate-server-production.up.railway.app`
   - Admin: `https://restate-server-admin-production.up.railway.app`

---

### Step 4: Deploy Classify Service

#### Option 1: Deploy from GitHub (Recommended)

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your repository: `tellimer/open-source`
3. Set **"Root Directory"**: `apps/classify/restate`
4. Railway will auto-detect the Dockerfile

#### Option 2: Deploy from Local

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login:
   ```bash
   railway login
   ```

3. Link to project:
   ```bash
   cd apps/classify/restate
   railway link
   ```

4. Deploy:
   ```bash
   railway up
   ```

#### Configure Service

1. Go to **"Settings"** → **"Environment Variables"**
2. Add all required variables (see [Environment Variables](#environment-variables) section)

3. Go to **"Settings"** → **"Networking"**
   - Set **"Port"**: `9080`
   - Click **"Generate Domain"**
   - Note your service URL: `https://classify-service-production.up.railway.app`

4. Go to **"Settings"** → **"Deploy"**
   - **Build Command**: `bun install`
   - **Start Command**: `bun run start`
   - **Watch Paths**: `src/**`

---

## 🔐 Environment Variables

### Classify Service Variables

Add these in Railway → classify-service → Variables:

```bash
# Service Configuration
PORT=9080
HOST=0.0.0.0
NODE_ENV=production

# Database (Reference TimescaleDB service)
POSTGRES_HOST=${{timescaledb.PGHOST}}
POSTGRES_PORT=${{timescaledb.PGPORT}}
POSTGRES_DB=${{timescaledb.PGDATABASE}}
POSTGRES_USER=${{timescaledb.PGUSER}}
POSTGRES_PASSWORD=${{timescaledb.PGPASSWORD}}
DATABASE_URL=${{timescaledb.DATABASE_URL}}

# OpenAI API
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini

# Anthropic API (Optional - for consensus review)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# LM Studio (Optional - for local LLM)
LM_STUDIO_BASE_URL=http://localhost:1234/v1
LM_STUDIO_MODEL=mistral-7b-instruct-v0.3

# Restate Configuration
RESTATE_ADMIN_URL=${{restate-server.RAILWAY_PUBLIC_DOMAIN}}:9070
RESTATE_INGRESS_URL=${{restate-server.RAILWAY_PUBLIC_DOMAIN}}:8080

# Pipeline Configuration
PIPELINE_VERSION=2.0.0
```

### Variable References in Railway

Railway supports cross-service variable references using `${{service.VARIABLE}}`:

```bash
# Reference PostgreSQL from classify-service
POSTGRES_HOST=${{timescaledb.PGHOST}}

# Reference Restate from classify-service
RESTATE_URL=${{restate-server.RAILWAY_PUBLIC_DOMAIN}}
```

---

## 📦 Dockerfile for Railway

Railway will use your existing Dockerfile. Ensure it's optimized:

```dockerfile
# Dockerfile.railway
FROM oven/bun:1 AS base

WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Expose port
EXPOSE 9080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:9080/classify-api/health || exit 1

# Start service
CMD ["bun", "run", "start"]
```

**Update `package.json` for Railway:**
```json
{
  "scripts": {
    "start": "bun run src/index.ts",
    "build": "echo 'No build step required for Bun'",
    "railway:migrate": "bun run db:migrate"
  }
}
```

---

## 🔄 Post-Deployment Setup

### 1. Initialize Database

```bash
# SSH into classify-service (Railway CLI)
railway run bun run db:init

# Or via API
curl -X POST https://classify-service-production.up.railway.app/admin/db/init
```

### 2. Register Services with Restate

```bash
# Register classify service with Restate
curl -X POST https://restate-server-admin-production.up.railway.app/deployments \
  -H 'content-type: application/json' \
  -d '{"uri": "https://classify-service-production.up.railway.app"}'
```

### 3. Verify Deployment

```bash
# Check classify service health
curl https://classify-service-production.up.railway.app/classify-api/health

# Check Restate server
curl https://restate-server-admin-production.up.railway.app/health

# Check registered services
curl https://restate-server-admin-production.up.railway.app/services
```

---

## 📊 Running the Pipelines on Railway

### Option 1: Via Railway CLI

```bash
# Connect to Railway project
railway link

# Run classification
railway run bun run classify:safe

# Run data quality
railway run bun run quality:check

# Run consensus analysis
railway run bun run consensus:analyze

# Migrate to final indicators
railway run bun run final:migrate
```

### Option 2: Via API Endpoints

```bash
# Classification
curl -X POST https://classify-service-production.up.railway.app/classify-api/batch \
  -H 'Content-Type: application/json' \
  -d '{"provider": "openai"}'

# Data Quality
curl -X POST https://classify-service-production.up.railway.app/data-quality-api/check-all \
  -H 'Content-Type: application/json'

# Consensus Analysis
curl -X POST https://classify-service-production.up.railway.app/consensus-analysis-api/analyze-all \
  -H 'Content-Type: application/json'
```

### Option 3: Scheduled Jobs (Railway Cron)

Create a cron service in Railway:

1. Click **"+ New"** → **"Empty Service"**
2. Name: `classify-cron`
3. Add script: `cron.sh`

```bash
#!/bin/bash
# cron.sh - Run daily classification pipeline

# Run full pipeline
curl -X POST https://classify-service-production.up.railway.app/classify-api/batch
curl -X POST https://classify-service-production.up.railway.app/data-quality-api/check-all
curl -X POST https://classify-service-production.up.railway.app/consensus-analysis-api/analyze-all

# Migrate to final indicators
railway run --service classify-service bun run final:migrate
```

4. Set cron schedule in Railway:
   - Go to **"Settings"** → **"Cron Schedule"**
   - Set: `0 2 * * *` (daily at 2 AM UTC)

---

## 🔧 Scaling on Railway

### Vertical Scaling (Increase Resources)

1. Go to classify-service → **"Settings"** → **"Resources"**
2. Adjust:
   - **Memory**: 2GB → 4GB → 8GB
   - **CPU**: 2 vCPU → 4 vCPU → 8 vCPU

### Horizontal Scaling (Multiple Instances)

Railway supports **replicas**:

1. Go to classify-service → **"Settings"** → **"Deployment"**
2. Set **"Replicas"**: `3` (or more)
3. Railway will:
   - Deploy 3 identical instances
   - Load balance across them
   - Share environment variables

**For High-Volume Workloads:**
- **3 replicas**: Up to 1,500 RPM
- **5 replicas**: Up to 2,500 RPM
- **10 replicas**: Up to 5,000 RPM

---

## 💰 Cost Estimation

### Railway Pricing (as of 2025)

**Hobby Plan** (Free):
- $5 credit/month
- Good for: Development, testing
- Limits: 512MB RAM, shared CPU

**Pro Plan** ($20/month):
- $20 credit included
- Additional usage: $0.000231/GB-hour (RAM), $0.000463/vCPU-hour
- Good for: Production (small-medium)

**Estimated Monthly Cost for Production:**

| Component | Configuration | Monthly Cost |
|-----------|--------------|--------------|
| TimescaleDB | 1GB RAM, 1 vCPU | ~$10 |
| Restate Server | 2GB RAM, 2 vCPU | ~$20 |
| Classify Service (3 replicas) | 2GB RAM, 2 vCPU each | ~$60 |
| **Total** | | **~$90/month** |

**For 10,000 indicators processed daily:**
- Classification: ~$15/month (OpenAI API)
- Data Quality: ~$5/month (OpenAI API)
- Consensus: ~$3/month (OpenAI API)
- **Total LLM Cost**: ~$23/month

**Grand Total**: ~$113/month (Railway + LLMs)

---

## 📈 Monitoring & Logs

### View Logs

1. Railway Dashboard → Select service → **"Logs"** tab
2. Filter by:
   - Severity (info, warn, error)
   - Time range
   - Search keywords

### Metrics

1. Railway Dashboard → Select service → **"Metrics"** tab
2. View:
   - CPU usage
   - Memory usage
   - Network traffic
   - Request rates

### Custom Monitoring

Add health check endpoints:

```typescript
// src/api/admin.api.ts
export const adminApi = restate.service({
  name: "admin-api",
  handlers: {
    health: async () => ({
      status: "healthy",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    }),

    metrics: async () => {
      const repo = new DatabaseRepository();
      const [totalIndicators, classifiedCount, qualityChecked] = await Promise.all([
        repo.queryOne(`SELECT COUNT(*) FROM source_indicators`),
        repo.queryOne(`SELECT COUNT(*) FROM classifications`),
        repo.queryOne(`SELECT COUNT(*) FROM data_quality_reports`),
      ]);

      return {
        total_indicators: totalIndicators?.count || 0,
        classified: classifiedCount?.count || 0,
        quality_checked: qualityChecked?.count || 0,
      };
    },
  },
});
```

---

## 🔒 Security Best Practices

### 1. Environment Variables
- Never commit API keys to Git
- Use Railway's encrypted variables
- Rotate secrets regularly

### 2. Database Security
- Use strong passwords (generate with `openssl rand -base64 32`)
- Enable SSL for PostgreSQL connections
- Restrict network access (Railway private networking)

### 3. API Security
- Add rate limiting to public endpoints
- Implement authentication for admin endpoints
- Use HTTPS only (Railway provides free SSL)

### 4. Network Security
```bash
# Use Railway's private networking for inter-service communication
POSTGRES_HOST=timescaledb.railway.internal  # Not public IP
RESTATE_URL=restate-server.railway.internal:8080
```

---

## 🐛 Troubleshooting

### Service Won't Start

**Check logs:**
```bash
railway logs --service classify-service
```

**Common issues:**
- Missing environment variables
- Database connection failed
- Port conflict

**Fix:**
1. Verify all env vars are set
2. Check DATABASE_URL is correct
3. Ensure PORT=9080

### Database Connection Failed

**Test connection:**
```bash
railway run psql $DATABASE_URL
```

**Fix:**
1. Check POSTGRES_* variables
2. Verify TimescaleDB service is running
3. Check network connectivity

### Restate Registration Failed

**Check Restate admin:**
```bash
curl https://restate-server-admin.railway.app/health
```

**Re-register service:**
```bash
curl -X POST https://restate-server-admin.railway.app/deployments \
  -H 'content-type: application/json' \
  -d '{"uri": "https://classify-service.railway.app"}'
```

### High Memory Usage

**Check metrics:**
1. Railway Dashboard → classify-service → Metrics
2. Look for memory leaks

**Fix:**
1. Increase memory allocation
2. Add more replicas (horizontal scaling)
3. Optimize batch sizes in scripts

### Rate Limiting

**Check OpenAI usage:**
```bash
curl https://classify-service.railway.app/admin/metrics
```

**Fix:**
1. Reduce RPM in scripts
2. Upgrade OpenAI tier
3. Add retry logic with exponential backoff

---

## 🚀 Production Checklist

- [ ] TimescaleDB deployed with strong password
- [ ] Restate server deployed and healthy
- [ ] Classify service deployed with all env vars
- [ ] Services registered with Restate
- [ ] Database schema initialized (`bun run db:init`)
- [ ] Health checks passing for all services
- [ ] API endpoints accessible via HTTPS
- [ ] Monitoring and alerting configured
- [ ] Backup strategy in place (Railway auto-backups)
- [ ] Cost monitoring enabled
- [ ] Security review completed
- [ ] Documentation updated with Railway URLs

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Restate Documentation](https://docs.restate.dev)
- [TimescaleDB Documentation](https://docs.timescale.com)
- [Railway CLI Reference](https://docs.railway.app/develop/cli)

---

## 🆘 Support

**Railway Support:**
- Discord: https://discord.gg/railway
- Docs: https://docs.railway.app
- Status: https://status.railway.app

**Project-Specific:**
- GitHub Issues: https://github.com/tellimer/open-source/issues
- Internal Slack: #classify-support

---

## 📝 Example Railway Configuration Files

### railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "bun run start",
    "healthcheckPath": "/classify-api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### railway.toml (Alternative)

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "bun run start"
healthcheckPath = "/classify-api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

---

**Your Railway deployment is ready! 🚂**

Follow the steps above, and your complete classify-restate system will be running in production on Railway with automatic scaling, monitoring, and HTTPS endpoints.
