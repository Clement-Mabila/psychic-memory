import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/console/:path*',
        destination: 'https://smuggling-earpiece-hesitant.ngrok-free.dev/api/console/:path*',
      },
      {
        source: '/api/system/:path*',
        destination: 'https://smuggling-earpiece-hesitant.ngrok-free.dev/api/system/:path*',
      },
      {
        source: '/api/tickets',
        destination: 'https://smuggling-earpiece-hesitant.ngrok-free.dev/api/tickets/',
      },
      {
        source: '/api/tickets/:path*',
        destination: 'https://smuggling-earpiece-hesitant.ngrok-free.dev/api/tickets/:path*/',
      },
      {
        source: '/api/v1/:path*',
        destination: 'https://smuggling-earpiece-hesitant.ngrok-free.dev/api/v1/:path*',
      },
    ]
  },
}

export default nextConfig
