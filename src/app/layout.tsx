import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Matematik Akademi', template: '%s · Matematik Akademi' },
  description: 'Akıllı soru bankası: yanlış ve boş soruları biriktir, tekrar et, eksiklerini kapat.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

// Tema: kayıtlı tercih (localStorage) ya da sistem tercihi; sayfa çizilmeden uygulanır (beyaz parlama olmaz)
const themeScript = `try{var t=localStorage.getItem('tema');var d=t?t==='koyu':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
