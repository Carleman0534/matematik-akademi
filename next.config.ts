import type { NextConfig } from "next";

// Eski ve İngilizce adresler, birleştirilen sayfalara yönlendirilir (kaldırılan sayfalar 404 vermesin)
const nextConfig: NextConfig = {
  // Yalnızca geliştirmede: öğretmen ve öğrenciyi aynı tarayıcıda ayrı oturumla denemek için (localhost + 127.0.0.1)
  allowedDevOrigins: ['127.0.0.1'],
  async redirects() {
    return [
      { source: '/login', destination: '/giris', permanent: true },
      { source: '/teacher/reports', destination: '/ogretmen/raporlar', permanent: true },
      { source: '/teacher/exams', destination: '/ogretmen/denemeler', permanent: true },
      { source: '/teacher', destination: '/ogretmen', permanent: true },
      { source: '/teacher/:path*', destination: '/ogretmen/:path*', permanent: true },
      { source: '/student', destination: '/ogrenci', permanent: true },
      { source: '/student/:path*', destination: '/ogrenci/:path*', permanent: true },
      { source: '/ogretmen/reports', destination: '/ogretmen/raporlar', permanent: true },
      { source: '/ogretmen/exams', destination: '/ogretmen/denemeler', permanent: true },
      { source: '/ogretmen/deneme-olustur', destination: '/ogretmen/denemeler/yeni', permanent: false },
      { source: '/ogretmen/denemeler/toplu-ata', destination: '/ogretmen/denemeler', permanent: false },
      { source: '/ogretmen/denemeler/canli', destination: '/ogretmen/denemeler', permanent: false },
      { source: '/ogretmen/denemeler/:id/hizli-optik-giris', destination: '/ogretmen/denemeler/:id/optik-giris', permanent: false },
      { source: '/ogretmen/deneme-analizleri/:path*', destination: '/ogretmen/denemeler', permanent: false },
      { source: '/ogretmen/eksiklik-haritasi', destination: '/ogretmen/raporlar', permanent: false },
      { source: '/ogretmen/pdf-denemeler', destination: '/ogretmen/pdf-arsivi', permanent: false },
      { source: '/ogrenci/pdf-denemeler', destination: '/ogrenci/denemeler', permanent: false },
      { source: '/ogrenci/denemeler/:id/coz', destination: '/ogrenci/denemeler/:id', permanent: false },
    ];
  },
};

export default nextConfig;
