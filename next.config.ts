import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://*.firebaseapp.com https://*.googleapis.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.googleapis.com; frame-src 'self' https://*.firebaseapp.com; object-src 'none';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
