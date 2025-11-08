/** @type {import('next').NextConfig} */
const path = require('path');
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: false },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' }
    ],
    unoptimized: true
  },
  async rewrites() {
    if (!isProd && process.env.LOCAL_SPLIT === '1') {
      return [{ source: '/api/:path*', destination: 'http://localhost:3001/api/:path*' }];
    }
    return [];
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname);
    return config;
  },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true }
};

module.exports = nextConfig;
