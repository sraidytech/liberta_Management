-- Add baseUrl column to api_configurations table
ALTER TABLE "api_configurations" ADD COLUMN "baseUrl" TEXT NOT NULL DEFAULT 'https://natureldz.ecomanager.dz/api/shop/v2';

-- Remove the default constraint after adding the column (since we want to handle defaults in backend)
ALTER TABLE "api_configurations" ALTER COLUMN "baseUrl" DROP DEFAULT;