# NOTE: Some cloud providers will require you to specify the platform to match your target architecture
# i.e.: AWS Lightsail requires arm64, therefore you update your FROM statement to: FROM --platform=linux/arm64 denoland/deno:latest
FROM denoland/deno:latest

# Set working directory
WORKDIR /app

# Copy deno configuration
COPY deno.json deno.lock ./

# Install Node.js (required for Motia and better-sqlite3)
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Copy application files
COPY . .

# Cache Deno dependencies
RUN deno cache --reload src/index.ts

# Expose outside access to the motia project
EXPOSE 3000

# Run your application with deno task
CMD ["deno", "task", "dev"]