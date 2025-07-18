FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client with relaxed settings
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build with relaxed TypeScript checking (skip strict type errors)
RUN npx tsc --noEmitOnError false --skipLibCheck true

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]