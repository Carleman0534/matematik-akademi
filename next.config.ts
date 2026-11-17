import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/login', destination: '/giris', permanent: true },
      { source: '/teacher', destination: '/ogretmen', permanent: true },
      { source: '/teacher/:path*', destination: '/ogretmen/:path*', permanent: true },
      { source: '/student', destination: '/ogrenci', permanent: true },
      { source: '/student/:path*', destination: '/ogrenci/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
