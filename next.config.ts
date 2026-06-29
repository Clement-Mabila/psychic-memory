import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/console/:path*',
        destination: 'http://localhost:8000/api/console/:path*',
      },
      {
        source: '/api/system/:path*',
        destination: 'http://localhost:8000/api/system/:path*',
      },
      {
        source: '/api/tickets',
        destination: 'http://localhost:8000/api/tickets/',
      },
      {
        source: '/api/tickets/:path*',
        destination: 'http://localhost:8000/api/tickets/:path*/',
      },
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8000/api/v1/:path*',
      },
    ]
  },
}

export default nextConfig
