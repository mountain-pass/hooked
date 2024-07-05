/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*' // Proxy to Backend
      },
      {
        source: '/auth/:path*',
        destination: 'http://localhost:4000/auth/:path*' // Proxy to Backend
      }
    ]
  }
};

export default nextConfig;
