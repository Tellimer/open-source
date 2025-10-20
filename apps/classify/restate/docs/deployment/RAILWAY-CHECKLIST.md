# 🚂 Railway Deployment Checklist

Use this checklist to ensure a smooth deployment to Railway.

---

## 📋 Pre-Deployment

- [ ] **Railway Account Ready**
  - [ ] Signed up at [railway.app](https://railway.app)
  - [ ] Credit card added (for production usage)
  - [ ] Selected appropriate plan (Pro recommended)

- [ ] **API Keys Obtained**
  - [ ] OpenAI API key (required)
  - [ ] Anthropic API key (optional, for consensus)
  - [ ] Verified API tier limits (RPM)

- [ ] **Code Ready**
  - [ ] Latest code pushed to GitHub
  - [ ] Dockerfile exists and tested locally
  - [ ] package.json scripts configured
  - [ ] .env.railway.example reviewed

---

## 🗄️ Database Setup

- [ ] **TimescaleDB Deployed**
  - [ ] PostgreSQL plugin added OR custom TimescaleDB service
  - [ ] Strong password generated (`openssl rand -base64 32`)
  - [ ] TimescaleDB extension enabled
  - [ ] Private networking configured
  - [ ] Environment variables noted:
    - [ ] `POSTGRES_HOST`
    - [ ] `POSTGRES_PORT`
    - [ ] `POSTGRES_DB`
    - [ ] `POSTGRES_USER`
    - [ ] `POSTGRES_PASSWORD`
    - [ ] `DATABASE_URL`

- [ ] **Database Connection Tested**
  ```bash
  railway run psql $DATABASE_URL
  ```

---

## ⚙️ Restate Server Setup

- [ ] **Restate Service Deployed**
  - [ ] Service created from image: `docker.restate.dev/restatedev/restate:latest`
  - [ ] Environment variables set:
    - [ ] `RESTATE_LOG_FILTER=restate=info`
    - [ ] `RESTATE_WORKER__INVOKER__INACTIVITY_TIMEOUT=5m`
    - [ ] `RESTATE_WORKER__INVOKER__ABORT_TIMEOUT=5m`
  - [ ] Ports configured:
    - [ ] Ingress: `8080`
    - [ ] Admin: `9070`
  - [ ] Public domains generated
  - [ ] Domains noted:
    - [ ] Ingress URL: `https://restate-server-production.up.railway.app`
    - [ ] Admin URL: `https://restate-server-admin-production.up.railway.app`

- [ ] **Restate Health Check**
  ```bash
  curl https://restate-server-admin-production.up.railway.app/health
  ```

---

## 🚀 Classify Service Setup

- [ ] **Service Deployed**
  - [ ] Deployed from GitHub repository
  - [ ] Root directory set: `apps/classify/restate`
  - [ ] Dockerfile detected
  - [ ] Port set: `9080`
  - [ ] Public domain generated
  - [ ] Domain noted: `https://classify-service-production.up.railway.app`

- [ ] **Environment Variables Set**
  - [ ] `PORT=9080`
  - [ ] `HOST=0.0.0.0`
  - [ ] `NODE_ENV=production`
  - [ ] Database variables (reference `${{Postgres.*}}` or `${{timescaledb.*}}`)
  - [ ] `OPENAI_API_KEY`
  - [ ] `OPENAI_MODEL=gpt-4o-mini`
  - [ ] `ANTHROPIC_API_KEY` (optional)
  - [ ] `ANTHROPIC_MODEL=claude-3-5-sonnet-20241022` (optional)
  - [ ] Restate URLs (reference `${{restate-server.*}}`)
  - [ ] `PIPELINE_VERSION=2.0.0`

- [ ] **Build Configuration**
  - [ ] Build command: `bun install`
  - [ ] Start command: `bun run start`
  - [ ] Watch paths: `src/**`

- [ ] **Health Check**
  ```bash
  curl https://classify-service-production.up.railway.app/classify-api/health
  ```

---

## 🔗 Service Registration

- [ ] **Register Classify Service with Restate**
  ```bash
  curl -X POST https://restate-server-admin-production.up.railway.app/deployments \
    -H 'content-type: application/json' \
    -d '{"uri": "https://classify-service-production.up.railway.app"}'
  ```

- [ ] **Verify Registration**
  ```bash
  curl https://restate-server-admin-production.up.railway.app/services
  ```

- [ ] **Check Registered Services**
  - [ ] `classify-api` visible
  - [ ] `data-quality-api` visible
  - [ ] `consensus-analysis-api` visible
  - [ ] `final-indicators-api` visible
  - [ ] `classification-workflow` visible
  - [ ] `data-quality-workflow` visible
  - [ ] `consensus-analysis-workflow` visible

---

## 🗃️ Database Initialization

- [ ] **Run Migrations**
  ```bash
  railway run --service classify-service bun run db:migrate
  ```

- [ ] **Initialize Schema**
  ```bash
  railway run --service classify-service bun run db:init
  ```

- [ ] **Verify Tables Created**
  ```bash
  railway run --service Postgres psql -c "\dt"
  ```

  Expected tables:
  - [ ] `source_indicators`
  - [ ] `classifications`
  - [ ] `data_quality_reports`
  - [ ] `consensus_analysis_reports`
  - [ ] `final_indicators`

---

## ✅ Smoke Tests

- [ ] **Classification Endpoint**
  ```bash
  curl https://classify-service-production.up.railway.app/classify-api/health
  ```

- [ ] **Data Quality Endpoint**
  ```bash
  curl https://classify-service-production.up.railway.app/data-quality-api/health
  ```

- [ ] **Consensus Analysis Endpoint**
  ```bash
  curl https://classify-service-production.up.railway.app/consensus-analysis-api/health
  ```

- [ ] **Final Indicators Endpoint**
  ```bash
  curl https://classify-service-production.up.railway.app/final-indicators-api/health
  ```

---

## 🧪 Functional Tests

- [ ] **Test Classification**
  ```bash
  # Classify single indicator
  curl -X POST https://classify-service-production.up.railway.app/classify-api/batch \
    -H 'Content-Type: application/json' \
    -d '{"provider": "openai", "indicator_ids": ["TEST_ID"]}'
  ```

- [ ] **Test Data Quality**
  ```bash
  # Check quality for test indicator
  curl -X POST https://classify-service-production.up.railway.app/data-quality-api/check \
    -H 'Content-Type: application/json' \
    -d '{"indicator_ids": ["TEST_ID"]}'
  ```

- [ ] **Verify Results**
  ```bash
  # Check classification result
  curl https://classify-service-production.up.railway.app/classify-api/getStatus/TEST_ID

  # Check quality result
  curl https://classify-service-production.up.railway.app/data-quality-api/report/TEST_ID
  ```

---

## 📊 Production Data Processing

- [ ] **Load Source Indicators**
  - [ ] Source data uploaded to database
  - [ ] Verify count: `SELECT COUNT(*) FROM source_indicators;`

- [ ] **Run Classification Pipeline**
  ```bash
  # Option 1: Via Railway CLI
  railway run --service classify-service bun run classify:safe

  # Option 2: Via API
  curl -X POST https://classify-service-production.up.railway.app/classify-api/batch \
    -H 'Content-Type: application/json' \
    -d '{"provider": "openai"}'
  ```

- [ ] **Monitor Progress**
  - [ ] Check Railway logs
  - [ ] Query processing status:
    ```bash
    railway run --service classify-service bun run stats
    ```

- [ ] **Run Data Quality**
  ```bash
  curl -X POST https://classify-service-production.up.railway.app/data-quality-api/check-all \
    -H 'Content-Type: application/json'
  ```

- [ ] **Run Consensus Analysis**
  ```bash
  curl -X POST https://classify-service-production.up.railway.app/consensus-analysis-api/analyze-all \
    -H 'Content-Type: application/json'
  ```

- [ ] **Migrate to Final Indicators**
  ```bash
  railway run --service classify-service bun run final:migrate
  ```

- [ ] **Verify Final Results**
  ```bash
  curl https://classify-service-production.up.railway.app/final-indicators-api/stats
  ```

---

## 📈 Monitoring Setup

- [ ] **Railway Metrics Enabled**
  - [ ] CPU usage monitoring
  - [ ] Memory usage monitoring
  - [ ] Network traffic monitoring

- [ ] **Log Aggregation**
  - [ ] Railway logs accessible
  - [ ] Log retention configured
  - [ ] Error alerts configured (optional)

- [ ] **Custom Monitoring** (Optional)
  - [ ] Sentry integration
  - [ ] Datadog integration
  - [ ] Custom metrics endpoint

---

## 🔐 Security Review

- [ ] **Secrets Management**
  - [ ] All API keys in Railway variables (not code)
  - [ ] Variables encrypted at rest
  - [ ] No secrets in Git history

- [ ] **Network Security**
  - [ ] HTTPS enforced (Railway default)
  - [ ] Private networking for inter-service communication
  - [ ] Database not publicly accessible

- [ ] **Database Security**
  - [ ] Strong password used
  - [ ] SSL enabled for PostgreSQL
  - [ ] Regular backups enabled (Railway auto-backups)

- [ ] **API Security** (If applicable)
  - [ ] Rate limiting configured
  - [ ] Authentication implemented
  - [ ] CORS configured

---

## 💰 Cost Management

- [ ] **Usage Monitoring Enabled**
  - [ ] Railway usage dashboard reviewed
  - [ ] Budget alerts configured
  - [ ] Cost breakdown understood

- [ ] **Resource Optimization**
  - [ ] Right-sized instances (RAM/CPU)
  - [ ] Appropriate replica count
  - [ ] Efficient batch sizes

- [ ] **LLM Cost Tracking**
  - [ ] OpenAI usage dashboard reviewed
  - [ ] Rate limits appropriate for tier
  - [ ] Cost per indicator calculated

---

## 📚 Documentation

- [ ] **URLs Documented**
  - [ ] Railway project URL
  - [ ] Database connection string (secure location)
  - [ ] Restate admin URL
  - [ ] Classify service URL
  - [ ] API endpoints documented

- [ ] **Runbook Created**
  - [ ] Deployment procedure
  - [ ] Rollback procedure
  - [ ] Troubleshooting guide
  - [ ] On-call contacts

- [ ] **Team Access**
  - [ ] Team members invited to Railway project
  - [ ] Permissions assigned
  - [ ] Documentation shared

---

## 🔄 Ongoing Operations

- [ ] **Regular Maintenance**
  - [ ] Weekly log review
  - [ ] Monthly cost review
  - [ ] Quarterly security audit

- [ ] **Scaling Strategy**
  - [ ] Vertical scaling limits defined
  - [ ] Horizontal scaling plan
  - [ ] Auto-scaling triggers (if applicable)

- [ ] **Backup & Recovery**
  - [ ] Database backup schedule confirmed
  - [ ] Disaster recovery plan documented
  - [ ] Recovery tested

---

## 🎉 Deployment Complete!

Once all items are checked, your Railway deployment is production-ready.

**Next Steps:**
1. Share URLs with stakeholders
2. Schedule first production run
3. Monitor performance and costs
4. Iterate and optimize

**Support:**
- Railway Discord: https://discord.gg/railway
- Internal docs: [RAILWAY.md](./RAILWAY.md)
- Operational scripts: [SCRIPTS.md](./SCRIPTS.md)

---

**Deployment Date:** ______________

**Deployed By:** ______________

**Railway Project:** ______________

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
