FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Force Prisma client generation with all necessary steps
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
RUN rm -rf node_modules/.prisma node_modules/@prisma/client/index.d.ts || echo "Cleanup completed"
RUN npm install @prisma/client@6.9.0 --force
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN ls -la node_modules/@prisma/client/ || echo "Checking Prisma client files"

# Build the application
RUN npm run build

# Expose port
EXPOSE 5000

# Start the application in development mode
CMD ["npm", "run", "dev"]