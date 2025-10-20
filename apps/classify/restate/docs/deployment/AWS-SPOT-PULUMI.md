# ☁️ AWS Spot Instance Deployment with Pulumi

Deploy your complete classify-restate cluster to AWS EC2 Spot Instances for **70% cost savings** using Pulumi Infrastructure as Code.

## 📋 Overview

This guide covers deploying the full Docker Compose cluster stack:
- **5 Restate Nodes** (workflow orchestration)
- **10 Classify Services** (classification/quality/consensus)
- **TimescaleDB** (PostgreSQL with time-series)
- **Traefik** (load balancer)
- **MinIO** (S3-compatible storage)

**Why Spot Instances?**
- 💰 **70-90% cheaper** than on-demand instances
- 🚀 **Same performance** as on-demand
- ⚠️ **Can be interrupted** (with 2-minute warning)
- ✅ **Perfect for batch workloads** like indicator classification

---

## 🏗️ Architecture

```
AWS VPC
├── Public Subnet
│   ├── EC2 Spot Instance (t3.2xlarge)
│   │   ├── Docker Compose Stack
│   │   │   ├── 5x Restate Nodes
│   │   │   ├── 10x Classify Services
│   │   │   ├── TimescaleDB
│   │   │   ├── Traefik (Load Balancer)
│   │   │   └── MinIO (S3)
│   │   └── Ports: 8080 (HTTP), 9070 (Admin), 5432 (PostgreSQL)
│   └── Elastic IP (static public IP)
├── Security Group (firewall rules)
└── EBS Volume (persistent storage)
```

---

## 🚀 Quick Start

### Prerequisites

```bash
# Install Pulumi
curl -fsSL https://get.pulumi.com | sh

# Install AWS CLI
brew install awscli  # macOS
# or: sudo apt-get install awscli  # Linux

# Configure AWS credentials
aws configure
```

### Deploy in 5 Minutes

```bash
# 1. Create Pulumi project
cd apps/classify/restate
pulumi new aws-typescript --name classify-spot --force

# 2. Copy infrastructure code (provided below)
# 3. Set AWS region
pulumi config set aws:region us-east-1

# 4. Set secrets
pulumi config set --secret openaiApiKey sk-proj-YOUR_KEY

# 5. Deploy
pulumi up
```

---

## 📦 Pulumi Infrastructure Code

Create these files in `apps/classify/restate/infra/`:

### `infra/index.ts` - Main Infrastructure

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as fs from "fs";

const config = new pulumi.Config();
const openaiApiKey = config.requireSecret("openaiApiKey");
const anthropicApiKey = config.getSecret("anthropicApiKey") || "";

// Configuration
const instanceType = config.get("instanceType") || "t3.2xlarge"; // 8 vCPU, 32GB RAM
const region = config.get("aws:region") || "us-east-1";
const spotMaxPrice = config.get("spotMaxPrice") || "0.15"; // Max $0.15/hr (70% off on-demand)
const volumeSize = config.getNumber("volumeSize") || 100; // 100GB SSD

// Get latest Ubuntu 22.04 AMI
const ubuntu = aws.ec2.getAmi({
  mostRecent: true,
  filters: [
    {
      name: "name",
      values: ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"],
    },
    {
      name: "virtualization-type",
      values: ["hvm"],
    },
  ],
  owners: ["099720109477"], // Canonical
});

// Create VPC
const vpc = new aws.ec2.Vpc("classify-vpc", {
  cidrBlock: "10.0.0.0/16",
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: {
    Name: "classify-vpc",
  },
});

// Create Internet Gateway
const internetGateway = new aws.ec2.InternetGateway("classify-igw", {
  vpcId: vpc.id,
  tags: {
    Name: "classify-igw",
  },
});

// Create Public Subnet
const publicSubnet = new aws.ec2.Subnet("classify-public-subnet", {
  vpcId: vpc.id,
  cidrBlock: "10.0.1.0/24",
  availabilityZone: `${region}a`,
  mapPublicIpOnLaunch: true,
  tags: {
    Name: "classify-public-subnet",
  },
});

// Create Route Table
const routeTable = new aws.ec2.RouteTable("classify-route-table", {
  vpcId: vpc.id,
  routes: [
    {
      cidrBlock: "0.0.0.0/0",
      gatewayId: internetGateway.id,
    },
  ],
  tags: {
    Name: "classify-route-table",
  },
});

// Associate Route Table with Subnet
const routeTableAssociation = new aws.ec2.RouteTableAssociation(
  "classify-route-table-association",
  {
    subnetId: publicSubnet.id,
    routeTableId: routeTable.id,
  }
);

// Create Security Group
const securityGroup = new aws.ec2.SecurityGroup("classify-sg", {
  vpcId: vpc.id,
  description: "Security group for classify-restate cluster",
  ingress: [
    {
      protocol: "tcp",
      fromPort: 22,
      toPort: 22,
      cidrBlocks: ["0.0.0.0/0"], // SSH (restrict to your IP in production)
    },
    {
      protocol: "tcp",
      fromPort: 8080,
      toPort: 8080,
      cidrBlocks: ["0.0.0.0/0"], // HTTP API
    },
    {
      protocol: "tcp",
      fromPort: 9070,
      toPort: 9070,
      cidrBlocks: ["0.0.0.0/0"], // Restate Admin
    },
    {
      protocol: "tcp",
      fromPort: 8081,
      toPort: 8081,
      cidrBlocks: ["0.0.0.0/0"], // Traefik Dashboard
    },
    {
      protocol: "tcp",
      fromPort: 5432,
      toPort: 5432,
      cidrBlocks: ["10.0.0.0/16"], // PostgreSQL (internal only)
    },
  ],
  egress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  tags: {
    Name: "classify-sg",
  },
});

// Create Key Pair (for SSH access)
const keyPair = new aws.ec2.KeyPair("classify-keypair", {
  publicKey: fs.readFileSync(`${process.env.HOME}/.ssh/id_rsa.pub`, "utf8"),
  tags: {
    Name: "classify-keypair",
  },
});

// User data script to install Docker and start services
const userData = pulumi.interpolate`#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Bun (for running scripts)
curl -fsSL https://bun.sh/install | bash
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> /home/ubuntu/.bashrc

# Clone repository (replace with your repo)
cd /home/ubuntu
git clone https://github.com/tellimer/open-source.git
cd open-source/apps/classify/restate

# Create .env file
cat > .env.docker <<EOF
OPENAI_API_KEY=${openaiApiKey}
OPENAI_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY=${anthropicApiKey}
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
EOF

# Set ownership
chown -R ubuntu:ubuntu /home/ubuntu/open-source

# Increase file descriptors
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Start Docker Compose cluster
cd /home/ubuntu/open-source/apps/classify/restate
docker-compose -f docker-compose.cluster.yml up -d

# Wait for services to start
sleep 30

# Initialize database
docker exec classify-service-1 bun run db:init

# Register services with Restate
for i in {1..10}; do
  docker exec classify-service-1 curl -X POST http://restate-1:9070/deployments \\
    -H 'content-type: application/json' \\
    -d "{\\"uri\\": \\"http://classify-service-$i:9080\\"}" || true
done

echo "✅ Classify cluster deployed and ready!"
`;

// Create EBS Volume for persistent storage
const ebsVolume = new aws.ebs.Volume("classify-data-volume", {
  availabilityZone: publicSubnet.availabilityZone,
  size: volumeSize,
  type: "gp3",
  encrypted: true,
  tags: {
    Name: "classify-data-volume",
  },
});

// Create Spot Instance Request
const spotInstance = new aws.ec2.SpotInstanceRequest("classify-spot-instance", {
  ami: ubuntu.then(ami => ami.id),
  instanceType: instanceType,
  spotPrice: spotMaxPrice,
  spotType: "persistent", // Automatically restart after interruption
  instanceInterruptionBehavior: "stop", // Stop (not terminate) on interruption

  keyName: keyPair.keyName,
  vpcSecurityGroupIds: [securityGroup.id],
  subnetId: publicSubnet.id,

  userData: userData,

  rootBlockDevice: {
    volumeSize: 30,
    volumeType: "gp3",
    deleteOnTermination: true,
  },

  tags: {
    Name: "classify-spot-instance",
    Environment: "production",
  },

  // Wait for fulfillment
  waitForFulfillment: true,
});

// Attach EBS Volume to Instance
const volumeAttachment = new aws.ec2.VolumeAttachment(
  "classify-volume-attachment",
  {
    deviceName: "/dev/sdf",
    volumeId: ebsVolume.id,
    instanceId: spotInstance.spotInstanceId,
  }
);

// Create Elastic IP (static public IP)
const eip = new aws.ec2.Eip("classify-eip", {
  instance: spotInstance.spotInstanceId,
  vpc: true,
  tags: {
    Name: "classify-eip",
  },
});

// Outputs
export const instanceId = spotInstance.spotInstanceId;
export const publicIp = eip.publicIp;
export const publicDns = eip.publicDns;
export const vpcId = vpc.id;
export const subnetId = publicSubnet.id;
export const securityGroupId = securityGroup.id;

// Service URLs
export const classifyApiUrl = pulumi.interpolate`http://${eip.publicIp}:8080`;
export const restateAdminUrl = pulumi.interpolate`http://${eip.publicIp}:9070`;
export const traefikDashboardUrl = pulumi.interpolate`http://${eip.publicIp}:8081`;

// SSH command
export const sshCommand = pulumi.interpolate`ssh -i ~/.ssh/id_rsa ubuntu@${eip.publicIp}`;
```

### `infra/Pulumi.yaml` - Pulumi Configuration

```yaml
name: classify-spot
runtime: nodejs
description: AWS Spot Instance deployment for classify-restate cluster

config:
  aws:region:
    description: AWS region to deploy to
    default: us-east-1

  instanceType:
    description: EC2 instance type
    default: t3.2xlarge

  spotMaxPrice:
    description: Maximum spot price per hour (USD)
    default: "0.15"

  volumeSize:
    description: EBS volume size in GB
    default: 100

  openaiApiKey:
    description: OpenAI API key (secret)
    secret: true

  anthropicApiKey:
    description: Anthropic API key (optional, secret)
    secret: true
```

### `infra/package.json` - Dependencies

```json
{
  "name": "classify-spot-infra",
  "version": "1.0.0",
  "dependencies": {
    "@pulumi/pulumi": "^3.100.0",
    "@pulumi/aws": "^6.20.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "typescript": "^5.3.0"
  }
}
```

---

## 🚀 Deployment Steps

### 1. Install Dependencies

```bash
cd apps/classify/restate/infra
npm install
```

### 2. Configure Pulumi

```bash
# Initialize Pulumi stack
pulumi stack init production

# Set AWS region
pulumi config set aws:region us-east-1

# Set instance type (8 vCPU, 32GB RAM)
pulumi config set instanceType t3.2xlarge

# Set spot max price ($0.15/hr = 70% savings)
pulumi config set spotMaxPrice 0.15

# Set storage size
pulumi config set volumeSize 100

# Set secrets
pulumi config set --secret openaiApiKey sk-proj-YOUR_KEY_HERE
pulumi config set --secret anthropicApiKey sk-ant-YOUR_KEY_HERE
```

### 3. Generate SSH Key (if needed)

```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
```

### 4. Deploy Infrastructure

```bash
# Preview changes
pulumi preview

# Deploy (takes ~5 minutes)
pulumi up --yes

# Wait for deployment to complete
# Outputs will show public IP and service URLs
```

### 5. Verify Deployment

```bash
# Get outputs
pulumi stack output

# SSH into instance
ssh -i ~/.ssh/id_rsa ubuntu@$(pulumi stack output publicIp)

# Check Docker containers
docker ps

# Check Restate services
curl http://$(pulumi stack output publicIp):9070/services
```

---

## 💰 Cost Analysis

### Spot Instance Pricing (us-east-1)

| Instance Type | vCPU | RAM | On-Demand | Spot Price | Savings |
|--------------|------|-----|-----------|------------|---------|
| t3.xlarge | 4 | 16GB | $0.1664/hr | $0.05/hr | 70% |
| t3.2xlarge | 8 | 32GB | $0.3328/hr | $0.10/hr | 70% |
| m5.2xlarge | 8 | 32GB | $0.384/hr | $0.12/hr | 69% |
| c5.4xlarge | 16 | 32GB | $0.68/hr | $0.20/hr | 71% |

**Recommended:** `t3.2xlarge` at $0.10/hr spot price

### Monthly Cost Estimate

**Infrastructure (24/7):**
- EC2 Spot (t3.2xlarge): $0.10/hr × 730hr = $73/month
- EBS Storage (100GB): $10/month
- Data Transfer: ~$5/month
- **Total Infrastructure**: ~$88/month

**LLM API (10,000 indicators daily):**
- Classification: ~$15/month
- Data Quality: ~$5/month
- Consensus: ~$3/month
- **Total LLM**: ~$23/month

**Grand Total**: ~$111/month

**vs Railway**: ~$113/month (comparable!)
**vs AWS On-Demand**: ~$350/month (68% savings!)

---

## 🔄 Spot Instance Interruption Handling

### What Happens During Interruption?

1. **2-Minute Warning**: AWS sends notification
2. **Docker Containers Stop**: Gracefully
3. **Instance Stops**: Not terminated (persistent spot)
4. **Data Preserved**: On EBS volume
5. **Auto-Restart**: When capacity available

### Handle Interruptions

**Option 1: Automatic Restart (Default)**
```typescript
// In Pulumi code:
spotType: "persistent",
instanceInterruptionBehavior: "stop",
```

**Option 2: Spot Fleet (High Availability)**

Create multiple spot instances across availability zones:

```typescript
// infra/spot-fleet.ts
const spotFleet = new aws.ec2.SpotFleetRequest("classify-fleet", {
  allocationStrategy: "lowestPrice",
  targetCapacity: 3, // 3 instances

  launchSpecification: [{
    instanceType: "t3.2xlarge",
    ami: ubuntu.then(ami => ami.id),
    spotPrice: "0.15",
    // ... other config
  }],
});
```

**Option 3: Checkpointing**

Add to your workflow to save progress:

```typescript
// In workflow code
await ctx.set("checkpoint", {
  processedIndicators: completed,
  timestamp: Date.now(),
});

// On restart, resume from checkpoint
const checkpoint = await ctx.get("checkpoint");
if (checkpoint) {
  startFrom = checkpoint.processedIndicators;
}
```

---

## 📊 Monitoring & Alerting

### CloudWatch Monitoring

Add to Pulumi code:

```typescript
// CloudWatch alarm for spot interruption
const interruptionAlarm = new aws.cloudwatch.MetricAlarm(
  "spot-interruption-alarm",
  {
    name: "classify-spot-interruption",
    comparisonOperator: "GreaterThanThreshold",
    evaluationPeriods: 1,
    metricName: "StatusCheckFailed",
    namespace: "AWS/EC2",
    period: 60,
    statistic: "Average",
    threshold: 0,
    alarmDescription: "Spot instance interrupted",
    dimensions: {
      InstanceId: spotInstance.spotInstanceId,
    },
    alarmActions: [snsTopicArn], // Send to SNS
  }
);
```

### Log Aggregation

Ship logs to CloudWatch:

```bash
# Install CloudWatch agent on instance
sudo yum install amazon-cloudwatch-agent

# Configure log groups
/aws/classify/docker
/aws/classify/restate
/aws/classify/postgres
```

---

## 🔐 Security Best Practices

### 1. Restrict SSH Access

```typescript
// In security group:
ingress: [
  {
    protocol: "tcp",
    fromPort: 22,
    toPort: 22,
    cidrBlocks: ["YOUR_IP/32"], // Only your IP
  },
]
```

### 2. Use AWS Secrets Manager

```typescript
import * as aws from "@pulumi/aws";

const secret = new aws.secretsmanager.Secret("classify-secrets", {
  name: "classify/api-keys",
});

const secretVersion = new aws.secretsmanager.SecretVersion(
  "classify-secret-version",
  {
    secretId: secret.id,
    secretString: JSON.stringify({
      openaiApiKey: openaiApiKey,
      anthropicApiKey: anthropicApiKey,
    }),
  }
);
```

### 3. Enable Encryption

- ✅ EBS volumes encrypted (enabled in code)
- ✅ Secrets encrypted in Pulumi
- ✅ HTTPS for public endpoints (add Traefik SSL)

---

## 🔧 Operational Tasks

### SSH into Instance

```bash
# Get public IP from Pulumi
PUBLIC_IP=$(pulumi stack output publicIp)

# SSH
ssh -i ~/.ssh/id_rsa ubuntu@$PUBLIC_IP
```

### View Logs

```bash
# SSH into instance
ssh ubuntu@$PUBLIC_IP

# View all logs
docker-compose -f docker-compose.cluster.yml logs -f

# View specific service
docker logs classify-service-1 -f
```

### Run Classification

```bash
# SSH into instance
ssh ubuntu@$PUBLIC_IP

# Run classification
cd /home/ubuntu/open-source/apps/classify/restate
docker exec classify-service-1 bun run classify:cluster:max

# Or via API
curl -X POST http://$PUBLIC_IP:8080/classify-api/batch \
  -H 'Content-Type: application/json' \
  -d '{"provider": "openai"}'
```

### Update Code

```bash
# SSH into instance
ssh ubuntu@$PUBLIC_IP

# Pull latest code
cd /home/ubuntu/open-source
git pull origin main

# Rebuild containers
cd apps/classify/restate
docker-compose -f docker-compose.cluster.yml up -d --build
```

### Backup Database

```bash
# Backup to S3
docker exec timescaledb pg_dump -U classify classify | \
  aws s3 cp - s3://your-bucket/classify-backup-$(date +%Y%m%d).sql

# Restore from S3
aws s3 cp s3://your-bucket/classify-backup-20250120.sql - | \
  docker exec -i timescaledb psql -U classify classify
```

---

## 🧪 Testing Spot Interruption

```bash
# Simulate interruption (SSH into instance)
sudo shutdown -h +2  # Shutdown in 2 minutes

# Check if services restart
aws ec2 start-instances --instance-ids $(pulumi stack output instanceId)

# Verify containers restart
ssh ubuntu@$PUBLIC_IP
docker ps
```

---

## 🔄 Scaling Strategies

### Vertical Scaling (Bigger Instance)

```bash
# Change instance type
pulumi config set instanceType m5.4xlarge

# Redeploy
pulumi up
```

### Horizontal Scaling (More Instances)

Modify Pulumi code to create spot fleet:

```typescript
const fleet = new aws.ec2.SpotFleetRequest("classify-fleet", {
  targetCapacity: 5, // 5 instances
  allocationStrategy: "diversified",
  // ... config
});
```

---

## 🆘 Troubleshooting

### Spot Request Not Fulfilled

**Check bid price:**
```bash
# Get current spot prices
aws ec2 describe-spot-price-history \
  --instance-types t3.2xlarge \
  --start-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --product-descriptions "Linux/UNIX" \
  --query 'SpotPriceHistory[*].[AvailabilityZone,SpotPrice]'

# Increase max price
pulumi config set spotMaxPrice 0.20
pulumi up
```

### Instance Keeps Getting Interrupted

**Use diversified strategy:**
- Multiple instance types
- Multiple availability zones
- Higher max bid price

### Docker Containers Won't Start

```bash
# SSH into instance
ssh ubuntu@$PUBLIC_IP

# Check Docker
sudo systemctl status docker

# Check logs
docker-compose -f docker-compose.cluster.yml logs

# Restart Docker
sudo systemctl restart docker
```

---

## 🎉 Deployment Checklist

- [ ] AWS credentials configured
- [ ] Pulumi installed
- [ ] SSH key generated
- [ ] Pulumi stack initialized
- [ ] Secrets configured (API keys)
- [ ] Infrastructure deployed (`pulumi up`)
- [ ] Instance running
- [ ] Docker containers started
- [ ] Database initialized
- [ ] Services registered with Restate
- [ ] Health checks passing
- [ ] Classification test successful
- [ ] Monitoring configured
- [ ] Backups scheduled

---

## 📚 Additional Resources

- [Pulumi AWS Documentation](https://www.pulumi.com/docs/clouds/aws/)
- [AWS Spot Instances Guide](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Restate Documentation](https://docs.restate.dev)

---

## 💡 Cost Optimization Tips

1. **Use Spot Savings Plans**: Additional 10-15% savings
2. **Reserved Capacity**: Combine spot + reserved for guaranteed availability
3. **Auto-scaling**: Scale down during off-hours
4. **Lifecycle Policies**: Delete old EBS snapshots
5. **S3 Intelligent Tiering**: For backup storage

---

**Your AWS Spot Instance cluster is ready!** ☁️

Deploy with: `pulumi up`
Destroy with: `pulumi destroy`

Enjoy 70% cost savings with the full power of your classify-restate cluster on AWS! 🚀
