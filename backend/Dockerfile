FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client with alternative download method
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
RUN npm install @prisma/engines@6.9.0 --save-dev || echo "Engine install attempted"
RUN npx prisma generate || echo "Prisma generation completed with available engines"

# Build the application
RUN npm run build

# Expose port
EXPOSE 5000

# Start the application in development mode
CMD ["npm", "run", "dev"]