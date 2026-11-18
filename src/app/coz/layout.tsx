import { requireStudent } from '@/lib/auth';

// Deneme çözme ekranı: menüsüz, tam ekran (dikkat dağılmasın)
export default async function SolveLayout({ children }: { children: React.ReactNode }) {
  await requireStudent();
  return <div className="min-h-screen bg-slate-100 dark:bg-slate-950">{children}</div>;
}
