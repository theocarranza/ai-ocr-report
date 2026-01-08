
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'export', // Ensures static export
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: true, // Required for static export (next export)
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4.5mb',
    },
  }
};

export default nextConfig;
