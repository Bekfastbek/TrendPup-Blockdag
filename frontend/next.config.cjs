const path = require('path');
const withTM = require('next-transpile-modules')([
  '@metamask/sdk',
  '@metamask/providers',
  'uuid',
  'cross-fetch',
]);

/** @type {import('next').NextConfig} */
const nextConfig = withTM({
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Disable caching during development
  ...(process.env.NODE_ENV === 'development' && {
    experimental: {
      isrMemoryCacheSize: 0, // Disable ISR memory cache
    },
    // Force no-cache headers for API routes during development
    async headers() {
      return [
        {
          source: '/api/:path*',
          headers: [
            { key: 'Cache-Control', value: 'no-cache, no-store, max-age=0, must-revalidate' },
            { key: 'Pragma', value: 'no-cache' },
            { key: 'Expires', value: '0' },
          ],
        },
        {
          source: '/:path*',
          headers: [
            { key: 'Access-Control-Allow-Origin', value: '*' },
            { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
            { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With, Content-Type, Authorization' }
          ],
        },
      ]
    },
  }),
  // Production headers
  ...(process.env.NODE_ENV === 'production' && {
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            { key: 'Access-Control-Allow-Origin', value: '*' },
            { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
            { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With, Content-Type, Authorization' }
          ],
        },
      ]
    },
  }),
  webpack(config, { isServer }) {
    if (!isServer) {
      config.module.rules.push({
        test: /HeartbeatWorker\.js$/,
        use: 'null-loader',
      });
      // Alias cross-fetch to a stub that uses the global fetch
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'cross-fetch': path.resolve(__dirname, 'src/cross-fetch-stub.js'),
      };
    }
    return config;
  },
});

module.exports = nextConfig;