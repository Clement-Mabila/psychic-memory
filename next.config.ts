import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/console/:path*',
        destination: 'http://localhost:8000/api/console/:path*',
      },
    ]
  },
}

export default nextConfig
