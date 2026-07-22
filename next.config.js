/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.coingecko.com' },
      { protocol: 'https', hostname: 'my.agnt.social' },
      { protocol: 'https', hostname: 'agnt.social' },
    ],
  },
};

module.exports = nextConfig;
