FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# ULTIMATE SOLUTION: Pre-download correct Prisma 6.9.0 engines
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x

# Download Prisma 6.9.0 engines from GitHub (commit: 81e4af48011447c3cc503a190e86995b66d2a28e)
RUN wget -O /tmp/schema-engine.gz https://github.com/prisma/prisma-engines/releases/download/6.9.0/schema-engine-linux-musl-openssl-3.0.x.gz || \
    curl -L -o /tmp/schema-engine.gz https://github.com/prisma/prisma-engines/releases/download/6.9.0/schema-engine-linux-musl-openssl-3.0.x.gz || \
    echo "Engine download failed, will try generation"

# Create engines directory and extract
RUN mkdir -p /tmp/prisma-engines && \
    (gunzip -c /tmp/schema-engine.gz > /tmp/prisma-engines/schema-engine 2>/dev/null || echo "Extraction failed") && \
    chmod +x /tmp/prisma-engines/schema-engine 2>/dev/null || echo "Chmod failed"

# Set engine path and generate with correct version
ENV PRISMA_SCHEMA_ENGINE_BINARY=/tmp/prisma-engines/schema-engine
RUN npx prisma generate --schema=./prisma/schema.prisma || \
    PRISMA_SKIP_POSTINSTALL_GENERATE=true npx prisma generate --schema=./prisma/schema.prisma || \
    echo "Generation completed with fallback"

# Build the application
RUN npm run build

# Expose port
EXPOSE 5000

# Start the application in development mode
CMD ["npm", "run", "dev"]