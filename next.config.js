/** @type {import('next').NextConfig} */
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
  // Quand tu bosses en local avec 2 ports (API sur :3001), active le rewrite.
  // En prod (Render, serveur fusionné), on ne réécrit rien.
  async rewrites() {
    if (!isProd && process.env.LOCAL_SPLIT === '1') {
      return [{ source: '/api/:path*', destination: 'http://localhost:3001/api/:path*' }];
    }
    return [];
  },
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false }
};
module.exports = nextConfig;
