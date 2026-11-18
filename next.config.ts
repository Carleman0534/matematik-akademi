import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/login', destination: '/giris', permanent: true },
      { source: '/teacher', destination: '/ogretmen', permanent: true },
      { source: '/teacher/reports', destination: '/ogretmen/raporlar', permanent: true },
      { source: '/teacher/exams', destination: '/ogretmen/deneme-olustur', permanent: true },
      { source: '/teacher/:path*', destination: '/ogretmen/:path*', permanent: true },
      { source: '/student', destination: '/ogrenci', permanent: true },
      { source: '/student/:path*', destination: '/ogrenci/:path*', permanent: true },
      { source: '/ogretmen/reports', destination: '/ogretmen/raporlar', permanent: true },
      { source: '/ogretmen/exams', destination: '/ogretmen/deneme-olustur', permanent: true },
    ];
  },
};

export default nextConfig;
