# 🚀 Railway Quick Start (5 Minutes)

Get your classify-restate system running on Railway in 5 minutes.

---

## 📋 Prerequisites

- Railway account ([sign up](https://railway.app))
- GitHub repository with this code
- OpenAI API key

---

## 🏃 Quick Deploy (5 Steps)

### Step 1: Create Project (30 seconds)

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Empty Project"**
4. Name: `tellimer-classify`

### Step 2: Add Database (1 minute)

1. Click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Click on PostgreSQL service → **"Data"** → **"Query"**
3. Run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS timescaledb;
   ```

### Step 3: Deploy Restate (1 minute)

1. Click **"+ New"** → **"Empty Service"**
2. Name: `restate-server`
3. **Settings** → **"Source"** → Set image:
   ```
   docker.restate.dev/restatedev/restate:latest
   ```
4. **Settings** → **"Networking"** → Add ports:
   - Port `8080` → Click **"Generate Domain"**
   - Port `9070` → Click **"Generate Domain"**

### Step 4: Deploy Classify Service (2 minutes)

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your repo: `tellimer/open-source`
3. Set **"Root Directory"**: `apps/classify/restate`
4. **Settings** → **"Networking"** → Port `9080` → **"Generate Domain"**
5. **Variables** tab → Add:
   ```bash
   PORT=9080
   NODE_ENV=production
   OPENAI_API_KEY=sk-proj-YOUR_KEY
   OPENAI_MODEL=gpt-4o-mini
   POSTGRES_HOST=${{Postgres.PGHOST}}
   POSTGRES_PORT=${{Postgres.PGPORT}}
   POSTGRES_DB=${{Postgres.PGDATABASE}}
   POSTGRES_USER=${{Postgres.PGUSER}}
   POSTGRES_PASSWORD=${{Postgres.PGPASSWORD}}
   ```

### Step 5: Initialize & Register (30 seconds)

1. Wait for deployment to complete (green checkmark)
2. Click **"Deploy Logs"** to see URL
3. Register with Restate:
   ```bash
   curl -X POST https://restate-server-production.up.railway.app/deployments \
     -H 'content-type: application/json' \
     -d '{"uri": "https://classify-service-production.up.railway.app"}'
   ```

---

## ✅ Verify Deployment

```bash
# Health check
curl https://classify-service-production.up.railway.app/classify-api/health

# Should return:
# {"status":"healthy","service":"classify-api","timestamp":"..."}
```

---

## 🎯 Run Your First Classification

```bash
# Via Railway CLI
railway login
railway link
railway run bun run classify:safe

# Or via API
curl -X POST https://classify-service-production.up.railway.app/classify-api/batch \
  -H 'Content-Type: application/json' \
  -d '{"provider": "openai"}'
```

---

## 📊 Monitor Progress

1. **Railway Dashboard**: Click on classify-service → **"Logs"**
2. **Restate Dashboard**: https://restate-server-production.up.railway.app
3. **Check stats**:
   ```bash
   railway run bun run stats
   ```

---

## 🎉 You're Live!

Your services are now running on Railway:

- 📊 **Classify API**: `https://classify-service-production.up.railway.app`
- 🔄 **Restate Server**: `https://restate-server-production.up.railway.app`
- 🗄️ **PostgreSQL**: Internal only (via Railway networking)

---

## 📚 Next Steps

1. **Load Data**: Upload your indicators to the database
2. **Run Pipeline**:
   ```bash
   railway run bun run pipeline:full
   ```
3. **View Results**:
   ```bash
   curl https://classify-service-production.up.railway.app/final-indicators-api/stats
   ```

---

## 🆘 Troubleshooting

**Service won't start?**
```bash
railway logs --service classify-service
```

**Database connection failed?**
- Check PostgreSQL service is running
- Verify variable references: `${{Postgres.PGHOST}}`

**Restate registration failed?**
- Verify both services are deployed
- Check URLs are correct
- Try re-registering

---

## 📖 Full Documentation

- [Complete Railway Guide](./RAILWAY.md)
- [Deployment Checklist](./RAILWAY-CHECKLIST.md)
- [Operational Scripts](./SCRIPTS.md)

---

**That's it! You're deployed to Railway in 5 minutes.** 🚂
