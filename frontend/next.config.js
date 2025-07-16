/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    // Generate a unique build ID to force cache invalidation
    generateBuildId: async () => {
      return `build-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    },
    
    // Bundle optimization
    experimental: {
      optimizeCss: true,
      optimizePackageImports: ['lucide-react', '@radix-ui/react-label', '@radix-ui/react-slot'],
    },
    
    // Image optimization
    images: {
      formats: ['image/webp', 'image/avif'],
      minimumCacheTTL: 60,
    },
    
    // Webpack optimizations
    webpack: (config, { isServer }) => {
      // Optimize bundle size
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
        };
      }
      
      return config;
    },
  }),
}

module.exports = nextConfig
