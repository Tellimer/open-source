#!/bin/bash
# Start Restate services and automatically configure timeouts

set -e

echo "🧹 Cleaning up old processes and data..."
pkill -9 -f "restate-server" 2>/dev/null || true
pkill -9 -f "bun run dev" 2>/dev/null || true
sleep 2

cd "$(dirname "$0")/.."
rm -rf restate-data
echo "✅ Clean environment ready"

echo ""
echo "🔧 Setting resource limits..."
ulimit -n 10240
echo "   Max open files: $(ulimit -n)"

echo ""
echo "🚀 Starting dev server..."
bun run dev > /tmp/restate-dev.log 2>&1 &
DEV_PID=$!
echo "   Dev server PID: $DEV_PID"

echo ""
echo "⏳ Waiting for dev server to initialize..."
sleep 5

echo ""
echo "🚀 Starting Restate server..."
bun run restate:server > /tmp/restate-server.log 2>&1 &
SERVER_PID=$!
echo "   Restate server PID: $SERVER_PID"

echo ""
echo "⏳ Waiting for Restate server to initialize..."
sleep 10

echo ""
echo "📡 Registering services with Restate..."
curl -s -X POST http://localhost:9070/deployments \
  -H 'content-type: application/json' \
  -d '{"uri": "http://localhost:9080"}' > /dev/null
echo "✅ Services registered"

echo ""
echo "⚙️  Configuring service timeouts..."

# Set abort timeout for classification-workflow
curl -s -X PATCH http://localhost:9070/services/classification-workflow \
  -H 'content-type: application/json' \
  -d '{"abort_timeout": "10m", "inactivity_timeout": "5m"}' > /dev/null
echo "✅ classification-workflow: abort_timeout=10m, inactivity_timeout=5m"

# Set abort timeout for all services
for service in "normalization" "time-inference" "family-assignment" "type-classification" "boolean-review" "final-review"; do
  curl -s -X PATCH http://localhost:9070/services/$service \
    -H 'content-type: application/json' \
    -d '{"abort_timeout": "10m", "inactivity_timeout": "5m"}' > /dev/null
  echo "✅ $service: abort_timeout=10m, inactivity_timeout=5m"
done

echo ""
echo "✅ All services configured and ready!"
echo ""
echo "📊 Service Status:"
echo "   Dev Server: http://localhost:9080 (PID: $DEV_PID)"
echo "   Restate HTTP: http://localhost:8080 (PID: $SERVER_PID)"
echo "   Restate Admin: http://localhost:9070"
echo ""
echo "💡 Logs:"
echo "   Dev: tail -f /tmp/restate-dev.log"
echo "   Server: tail -f /tmp/restate-server.log"
echo ""
echo "🎯 Ready to classify!"
echo "   bun run classify:ultra"