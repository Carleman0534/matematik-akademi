import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabase/server';
import { getStudent, getClasses } from '@/lib/data';
import { QuestionBank } from '@/components/questions/QuestionBank';
import { EditStudentForm, PasswordForm, ActiveToggle } from '../StudentForms';
import { getStudentProfileHubData } from '@/lib/studentProfile';
import { StudentProfileHub } from './StudentProfileHub';

export const metadata: Metadata = { title: 'Öğrenci Profili | Öğretmen Paneli' };

export default async function StudentDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const sb = await supabaseServer();

  const s = await getStudent(sb, id);
  if (!s) notFound();

  // Öğrencinin kapsamlı profil, deneme, ödev ve kazanım verilerini getir
  const profileData = await getStudentProfileHubData(id);

  // Öğrencinin adı s'ten güncel geldiyse profile aktar
  if (s.full_name && s.full_name !== 'Öğrenci') {
    profileData.student.full_name = s.full_name;
  }
  if (s.grade_level) {
    profileData.student.grade_level = s.grade_level;
  }
  if (s.school_name) {
    profileData.student.school_name = s.school_name;
  }

  const classes = s.teacher_id ? await getClasses(sb, s.teacher_id) : [];
  const base = '/ogretmen/ogrenciler/' + id;

  const questionBankNode = (
    <QuestionBank
      sb={sb}
      studentId={id}
      searchParams={sp}
      basePath={base}
      addHref={base + '/soru-ekle'}
    />
  );

  const studentFormsNode = (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="card lg:col-span-2">
        <h3 className="font-bold text-base mb-4">Öğrenci Bilgilerini Güncelle</h3>
        <EditStudentForm s={s} classes={classes} />
      </div>
      <div className="card space-y-4">
        <h3 className="font-bold text-base mb-4">Hesap ve Giriş Güvenliği</h3>
        <div className="space-y-5">
          {s.profile_id && <PasswordForm id={s.id} />}
          <ActiveToggle id={s.id} active={s.is_active} />
        </div>
      </div>
    </div>
  );

  return (
    <StudentProfileHub
      initialData={profileData}
      questionBankNode={questionBankNode}
      studentFormsNode={studentFormsNode}
      basePath={base}
    />
  );
}
