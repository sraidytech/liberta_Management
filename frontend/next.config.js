/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  // Removed rewrites - using direct API calls instead
  
  // Production optimization for Docker deployments
  ...(process.env.NODE_ENV === 'production' && {
    // Generate a unique build ID to force cache invalidation
    generateBuildId: async () => {
      return `build-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    },
  }),
}

module.exports = nextConfig