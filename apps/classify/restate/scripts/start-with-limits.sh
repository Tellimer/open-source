#!/bin/bash
# Start Restate services with proper resource limits

# Increase file descriptor limit (required for high concurrency)
ulimit -n 10240

# Increase max user processes if needed
ulimit -u 4096

echo "🔧 Resource Limits:"
echo "   Max open files: $(ulimit -n)"
echo "   Max processes: $(ulimit -u)"
echo ""

# Start services
cd "$(dirname "$0")/.."
bun run dev:local
