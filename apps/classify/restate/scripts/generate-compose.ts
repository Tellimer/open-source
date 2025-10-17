#!/usr/bin/env bun
/**
 * Generate docker-compose cluster configuration with configurable node and service counts
 *
 * Usage:
 *   bun run scripts/generate-compose.ts --nodes=5 --services=10
 *   bun run scripts/generate-compose.ts --nodes=10 --services=20
 */

const args = process.argv.slice(2);
const getArg = (name: string, defaultValue: number) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? parseInt(arg.split('=')[1]) : defaultValue;
};

const NODES = getArg('nodes', 5);
const SERVICES = getArg('services', 5);

console.log(`🔧 Generating docker-compose.cluster.yml with ${NODES} nodes and ${SERVICES} services...`);

// Common environment variables for all Restate nodes
const commonEnv = {
  RESTATE_CLUSTER_NAME: 'restate-cluster',
  RESTATE_LOG_FILTER: 'restate=info',
  RESTATE_DEFAULT_REPLICATION: 2,
  RESTATE_METADATA_CLIENT__ADDRESSES: JSON.stringify(
    Array.from({ length: NODES }, (_, i) => `http://restate-${i + 1}:5122`)
  ),
  RESTATE_WORKER__SNAPSHOTS__DESTINATION: 's3://restate/snapshots',
  RESTATE_WORKER__SNAPSHOTS__SNAPSHOT_INTERVAL_NUM_RECORDS: '1000',
  RESTATE_WORKER__SNAPSHOTS__AWS_REGION: 'local',
  RESTATE_WORKER__SNAPSHOTS__AWS_ENDPOINT_URL: 'http://minio:9000',
  RESTATE_WORKER__SNAPSHOTS__AWS_ALLOW_HTTP: true,
  RESTATE_WORKER__SNAPSHOTS__AWS_ACCESS_KEY_ID: 'minioadmin',
  RESTATE_WORKER__SNAPSHOTS__AWS_SECRET_ACCESS_KEY: 'minioadmin'
};

const config = {
  services: {} as any,
  volumes: {
    'restate-data': null,
    'timescale-data': null
  },
  networks: {
    'restate-cluster': {
      driver: 'bridge'
    }
  }
};

// Generate Restate nodes
for (let i = 1; i <= NODES; i++) {
  const portOffset = (i - 1) * 10000;
  config.services[`restate-${i}`] = {
    image: 'docker.restate.dev/restatedev/restate:latest',
    restart: 'unless-stopped',
    extra_hosts: ['host.docker.internal:host-gateway'],
    volumes: ['restate-data:/restate-data'],
    ports: [
      `${8080 + portOffset}:8080`,  // Ingress
      `${9070 + portOffset}:9070`,  // Admin
      `${5122 + portOffset}:5122`   // Node-to-node
    ],
    environment: {
      ...commonEnv,
      RESTATE_NODE_NAME: `restate-${i}`,
      RESTATE_FORCE_NODE_ID: i,
      RESTATE_ADVERTISED_ADDRESS: `http://restate-${i}:5122`,
      RESTATE_AUTO_PROVISION: i === 1 ? 'true' : 'false'
    },
    networks: ['restate-cluster'],
    depends_on: i === 1 ? ['minio'] : ['minio', 'restate-1']
  };
}

// Generate classification services
for (let i = 1; i <= SERVICES; i++) {
  const isFirst = i === 1;

  const labels = [
    'traefik.enable=true',
    'traefik.http.services.classify.loadbalancer.server.port=9080',
    'traefik.http.services.classify.loadbalancer.server.scheme=h2c'
  ];

  // Only first service defines routers
  if (isFirst) {
    labels.push(
      'traefik.http.routers.discover.rule=PathPrefix(`/discover`)',
      'traefik.http.routers.discover.priority=100',
      'traefik.http.routers.discover.service=discover-service',
      'traefik.http.services.discover-service.loadbalancer.server.port=9080',
      'traefik.http.services.discover-service.loadbalancer.server.scheme=h2c',
      'traefik.http.routers.classify.rule=PathPrefix(`/`)',
      'traefik.http.routers.classify.priority=1',
      'traefik.http.routers.classify.service=classify'
    );
  }

  config.services[`classify-service-${i}`] = {
    build: {
      context: '.',
      dockerfile: 'Dockerfile.service'
    },
    env_file: ['.env.docker'],
    environment: {
      PORT: 9080,
      HOST: '0.0.0.0',
      // Override with Docker service names (ignores .env file)
      POSTGRES_HOST: 'timescaledb',
      POSTGRES_PORT: 5432,
      POSTGRES_DB: 'classify',
      POSTGRES_USER: 'classify',
      POSTGRES_PASSWORD: 'classify',
      OPENAI_API_KEY: '${OPENAI_API_KEY}',
      OPENAI_MODEL: '${OPENAI_MODEL:-gpt-4o-mini}',
      ANTHROPIC_API_KEY: '${ANTHROPIC_API_KEY:-}',
      ANTHROPIC_MODEL: '${ANTHROPIC_MODEL:-claude-3-5-sonnet-20241022}'
    },
    'extra_hosts': ['host.docker.internal:host-gateway'],
    networks: ['restate-cluster'],
    labels
  };
}

// Add Traefik
config.services.traefik = {
  image: 'traefik:v2.10',
  ports: [
    '9080:9080',  // Service port
    '8081:8080'   // Dashboard
  ],
  volumes: [
    '/var/run/docker.sock:/var/run/docker.sock:ro',
    './traefik.yml:/etc/traefik/traefik.yml:ro'
  ],
  networks: ['restate-cluster'],
  depends_on: Array.from({ length: SERVICES }, (_, i) => `classify-service-${i + 1}`)
};

// Add MinIO
config.services.minio = {
  image: 'quay.io/minio/minio',
  entrypoint: '/bin/sh',
  command: '-c \'mkdir -p /data/restate && /usr/bin/minio server --quiet /data\'',
  ports: ['9000:9000'],
  networks: ['restate-cluster']
};

// Add TimescaleDB
config.services.timescaledb = {
  image: 'timescale/timescaledb:latest-pg16',
  environment: {
    POSTGRES_USER: 'classify',
    POSTGRES_PASSWORD: 'classify',
    POSTGRES_DB: 'classify'
  },
  ports: ['5432:5432'],
  volumes: ['timescale-data:/var/lib/postgresql/data'],
  healthcheck: {
    test: ['CMD-SHELL', 'pg_isready -U classify'],
    interval: '10s',
    timeout: '5s',
    retries: 5
  },
  command: 'postgres -c shared_preload_libraries=timescaledb -c max_connections=2000',
  networks: ['restate-cluster']
};

// Convert to YAML (simplified - using JSON for now)
import { writeFileSync } from 'fs';
import { dump } from 'js-yaml';

try {
  const yaml = dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true
  });

  writeFileSync('docker-compose.cluster.yml', yaml);
  console.log(`✅ Generated docker-compose.cluster.yml with:`);
  console.log(`   - ${NODES} Restate nodes`);
  console.log(`   - ${SERVICES} Classification services`);
  console.log(`   - Traefik load balancer`);
  console.log(`   - TimescaleDB with max_connections=2000`);
  console.log(`   - MinIO for snapshots`);
} catch (error) {
  console.error('❌ Error generating config:', error);
  process.exit(1);
}
