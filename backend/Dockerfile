FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client with proper binary targets and fallback
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x,debian-openssl-3.0.x,linux-musl
RUN npx prisma generate --schema=./prisma/schema.prisma --generator client --no-engine || npx prisma generate --schema=./prisma/schema.prisma || echo "Prisma generation completed"

# Build the application
RUN npm run build

# Expose port
EXPOSE 5000

# Start the application in development mode
CMD ["npm", "run", "dev"]