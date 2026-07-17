import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/console/:path*',
        destination: 'https://agenticpipelineweb-production.up.railway.app/api/console/:path*',
      },
      {
        source: '/api/system/:path*',
        destination: 'https://agenticpipelineweb-production.up.railway.app/api/system/:path*',
      },
      {
        source: '/api/tickets',
        destination: 'https://agenticpipelineweb-production.up.railway.app/api/tickets/',
      },
      {
        source: '/api/tickets/:path*',
        destination: 'https://agenticpipelineweb-production.up.railway.app/api/tickets/:path*/',
      },
      {
        source: '/api/v1/:path*',
        destination: 'https://agenticpipelineweb-production.up.railway.app/api/v1/:path*',
      },
    ]
  },
}

export default nextConfig
