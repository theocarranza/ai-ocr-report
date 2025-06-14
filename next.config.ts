import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
  },
  // The i18n object for Next.js built-in i18n is removed
  // as we are attempting a manual i18next setup.
  // This might have been conflicting.
  experimental: {
    allowedDevOrigins: ["*.cloudworkstations.dev"],
  }
};

export default nextConfig;
