'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Award, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Plus, 
  Send, 
  Share2, 
  Sparkles, 
  TrendingUp, 
  User, 
  Users, 
  X, 
  AlertCircle,
  Copy,
  ExternalLink,
  ChevronRight,
  XCircle,
  HelpCircle,
  Bot,
  Lightbulb,
  Filter,
  Eye,
  Check
} from 'lucide-react';
import type { StudentProfileData } from '@/lib/studentProfile';
import { INITIAL_LGS_TOPICS } from '@/lib/ai/lgsCurriculum';

interface Props {
  initialData: StudentProfileData;
  questionBankNode: React.ReactNode;
  studentFormsNode: React.ReactNode;
  basePath: string;
}

export function StudentProfileHub({ initialData, questionBankNode, studentFormsNode, basePath }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'exams' | 'homework' | 'analysis' | 'bank' | 'settings'>('exams');

  // Local state for instant optimistic updates
  const [student] = useState(initialData.student);
  const [assignedExams, setAssignedExams] = useState(initialData.assignedExams);
  const [assignedHomeworks, setAssignedHomeworks] = useState(initialData.assignedHomeworks);
  const [topicMastery] = useState(initialData.topicMastery);
  const [availableExams] = useState(initialData.availableExams);
  const [bankStats] = useState(initialData.bankStats);

  // Modals
  const [showExamModal, setShowExamModal] = useState(false);
  const [showHwModal, setShowHwModal] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);

  // Exam assignment form state
  const [selectedExamId, setSelectedExamId] = useState(availableExams[0]?.id || '');
  // 0 = süresiz: süre öğrenci denemeyi ilk açtığında başlar ve çözüm süresi öğretmene kaydedilir
  const [examDuration, setExamDuration] = useState(0);
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [examMsg, setExamMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Homework assignment form state
  const [hwTopicId, setHwTopicId] = useState(INITIAL_LGS_TOPICS[0]?.id || '');
  const [hwTitle, setHwTitle] = useState(`${INITIAL_LGS_TOPICS[0]?.name} Pekiştirme ve Beceri Temelli Sorular`);
  const [hwCount, setHwCount] = useState(15);
  const [hwDifficulty, setHwDifficulty] = useState(3);
  const [hwDueDate, setHwDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [hwShareParent, setHwShareParent] = useState(true);
  const [hwSubmitting, setHwSubmitting] = useState(false);
  const [hwMsg, setHwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // WhatsApp modal copy status
  const [copied, setCopied] = useState(false);

  // Sınav Soru & Yanlış Analizi Modal Durumu
  const [inspectingExam, setInspectingExam] = useState<any | null>(null);
  const [inspectingLoading, setInspectingLoading] = useState(false);
  const [inspectingQuestions, setInspectingQuestions] = useState<any[]>([]);
  const [inspectingFilter, setInspectingFilter] = useState<'all' | 'wrong' | 'blank' | 'correct'>('wrong');
  const [inspectingAiLoading, setInspectingAiLoading] = useState<Record<number, boolean>>({});
  const [inspectingAiAnalysis, setInspectingAiAnalysis] = useState<Record<number, any>>({});
  const [inspectingMistakeSaved, setInspectingMistakeSaved] = useState<Record<number, boolean>>({});

  const openExamInspection = async (exam: any) => {
    setInspectingExam(exam);
    setInspectingLoading(true);
    setInspectingQuestions([]);
    setInspectingFilter('wrong');
    try {
      const res = await fetch(`/api/exam-results/student-exam-detail?examId=${exam.exam_id}&studentId=${student.id}`);
      const data = await res.json();
      if (data.success && data.questions) {
        setInspectingQuestions(data.questions);
        if (data.exam) {
          setInspectingExam((prev: any) => ({ ...prev, ...data.exam }));
        }
      }
    } catch (e) {
      console.error('Error fetching exam detail:', e);
    } finally {
      setInspectingLoading(false);
    }
  };

  const handleRequestQuestionAiAnalysis = async (q: any) => {
    setInspectingAiLoading(prev => ({ ...prev, [q.questionNo]: true }));
    try {
      const res = await fetch('/api/ai/verify-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: q.questionText,
          options: q.options,
          studentAnswer: q.studentAnswer,
          correctAnswer: q.correctAnswer,
          topicName: q.topicName,
          provider: 'auto'
        })
      });
      const data = await res.json();
      setInspectingAiAnalysis(prev => ({ ...prev, [q.questionNo]: data }));
    } catch (err) {
      console.error(err);
    } finally {
      setInspectingAiLoading(prev => ({ ...prev, [q.questionNo]: false }));
    }
  };

  const handlePushToMistakePool = async (q: any) => {
    setInspectingMistakeSaved(prev => ({ ...prev, [q.questionNo]: true }));
    try {
      await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: student.id,
          question_number: q.questionNo,
          question_type: q.isBlank ? 'blank' : 'wrong',
          correct_answer: q.correctAnswer,
          student_answer: q.studentAnswer,
          student_note: q.questionText,
          solution: q.solutionExplanation,
          teacher_note: `Öğretmen İncelemesi: ${q.topicName} Deneme Yanlışı`
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Quick stats calculations
  const latestExam = assignedExams.find(e => e.status === 'completed' && e.net_score !== null);
  const activeHwCount = assignedHomeworks.filter(h => h.status !== 'completed').length;
  const totalSolvedQuestions = topicMastery.reduce((acc, t) => acc + (t.solved_count || 0), 0);
  const avgMastery = totalSolvedQuestions > 0
    ? Math.round(topicMastery.reduce((acc, t) => acc + (t.mastery_score || 0), 0) / (topicMastery.length || 1))
    : 0;
  const strongTopics = topicMastery.filter(t => (t.solved_count || 0) > 0 && t.mastery_score >= 75);
  const focusTopics = topicMastery.filter(t => (t.solved_count || 0) > 0 && t.mastery_score < 65);

  // Topic select handler for homework
  const handleTopicChange = (topicId: string) => {
    setHwTopicId(topicId);
    const topic = INITIAL_LGS_TOPICS.find(t => t.id === topicId);
    if (topic) {
      setHwTitle(`${topic.name} Pekiştirme ve Beceri Temelli Sorular`);
    }
  };

  // Open homework modal preselected with a specific topic
  const openHwForTopic = (topicId: string, topicName: string) => {
    setHwTopicId(topicId);
    setHwTitle(`${topicName} Hedef Geliştirme Ödevi`);
    setShowHwModal(true);
  };

  // Assign Exam action
  const handleAssignExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setExamSubmitting(true);
    setExamMsg(null);
    try {
      const chosen = availableExams.find(x => x.id === selectedExamId);
      if (!chosen) throw new Error('Lütfen atanacak bir deneme seçin.');
      const examTitle = chosen.title;
      const payload = {
        examId: chosen.id,
        studentIds: [student.id],
        durationMin: Math.max(0, Number(examDuration) || 0),
        dueAt: new Date(Date.now() + 7 * 86400000).toISOString()
      };

      const res = await fetch('/api/exam-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Atama başarısız oldu');

      // Listeyi hemen güncelle (aynı deneme zaten atanmışsa yeni kart eklenmez, mevcut olan yenilenir)
      const newAssignment = {
        assignment_id: 'assign_' + Date.now(),
        exam_id: payload.examId,
        title: examTitle,
        question_count: Number(chosen.question_count) || 0,
        duration_min: payload.durationMin,
        assigned_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
        due_at: payload.dueAt.slice(0, 10),
        status: 'pending' as const,
        net_score: null,
        correct_count: null,
        wrong_count: null,
        blank_count: null
      };
      setAssignedExams([newAssignment, ...assignedExams.filter(a => a.exam_id !== payload.examId)]);
      setExamMsg({ type: 'ok', text: 'Deneme başarıyla atandı!' });
      setTimeout(() => {
        setShowExamModal(false);
        setExamMsg(null);
      }, 1200);
    } catch (err: any) {
      setExamMsg({ type: 'err', text: err.message || 'Deneme atanırken hata oluştu.' });
    } finally {
      setExamSubmitting(false);
    }
  };

  // Assign Homework action
  const handleAssignHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    setHwSubmitting(true);
    setHwMsg(null);
    try {
      const topic = INITIAL_LGS_TOPICS.find(t => t.id === hwTopicId);
      const payload = {
        studentId: student.id,
        title: hwTitle,
        description: `${topic?.name || ''} konusu kazanım ve yeni nesil soru pekiştirmesi.`,
        topicId: hwTopicId,
        questionCount: hwCount,
        difficultyLevel: hwDifficulty,
        dueDate: hwDueDate,
        shareWithParent: hwShareParent
      };

      const res = await fetch('/api/teacher/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Ödev atanamadı');

      // Optimistic update
      const newHw = {
        id: data.homework?.id || 'hw_' + Date.now(),
        title: hwTitle,
        topic_name: topic?.name || 'LGS Matematik',
        topic_id: hwTopicId,
        question_count: hwCount,
        difficulty_level: hwDifficulty,
        start_date: new Date().toISOString().slice(0, 10),
        due_date: hwDueDate,
        status: 'assigned',
        completed_question_count: 0,
        completion_percentage: 0
      };
      setAssignedHomeworks([newHw, ...assignedHomeworks]);
      setHwMsg({ type: 'ok', text: 'Ödev başarıyla tanımlandı ve veliye bildirildi!' });
      setTimeout(() => {
        setShowHwModal(false);
        setHwMsg(null);
      }, 1200);
    } catch (err: any) {
      setHwMsg({ type: 'err', text: err.message || 'Ödev atanırken hata oluştu.' });
    } finally {
      setHwSubmitting(false);
    }
  };

  // WhatsApp Message Generator
  const generateWaMessage = () => {
    const today = new Date().toLocaleDateString('tr-TR');
    let text = `📊 *MATEMATİK AKADEMİ - LGS ÖĞRENCİ GELİŞİM VE TAKİP RAPORU*\n`;
    text += `👤 *Öğrenci:* ${student.full_name}\n`;
    text += `🏫 *Okul / Sınıf:* ${student.school_name || 'Ortaokul'} · ${student.grade_level}. Sınıf\n`;
    text += `📅 *Rapor Tarihi:* ${today}\n\n`;

    text += `🎯 *GENEL PERFORMANS:* \n`;
    text += `• LGS Konu Hakimiyeti: %${avgMastery}\n`;
    if (latestExam) {
      text += `• Son Deneme: ${latestExam.title} (${latestExam.net_score} Net - ${latestExam.correct_count}D / ${latestExam.wrong_count}Y)\n`;
    }
    text += `• Soru Bankası: ${bankStats.total} soru çözüldü (${bankStats.learned} öğrenildi, ${bankStats.due} tekrar bekliyor)\n\n`;

    if (assignedHomeworks.length > 0) {
      const topHw = assignedHomeworks[0];
      text += `📝 *GÜNCEL ÖDEV VE HEDEF:* \n`;
      text += `• ${topHw.title} (${topHw.question_count} Soru - Son Teslim: ${topHw.due_date})\n`;
      text += `• İlerleme: %${Math.round(topHw.completion_percentage || 0)} tamamlandı\n\n`;
    }

    if (focusTopics.length > 0) {
      text += `⚡ *ÖNCELİKLİ ODAK / ÇALIŞILACAK KONULAR:* \n`;
      focusTopics.slice(0, 3).forEach(t => {
        text += `• ${t.topic_name}: %${t.mastery_score} hakimiyet\n`;
      });
      text += `\n`;
    }

    if (strongTopics.length > 0) {
      text += `⭐ *EN GÜÇLÜ OLDUĞU KONULAR:* \n`;
      strongTopics.slice(0, 3).forEach(t => {
        text += `• ${t.topic_name}: %${t.mastery_score} başarı\n`;
      });
      text += `\n`;
    }

    text += `Öğrencimizin düzenli soru çözümü ve tekrar takibi devam etmektedir. Başarılar dileriz! 🚀`;
    return text;
  };

  const copyWaText = () => {
    navigator.clipboard.writeText(generateWaMessage());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openWaWeb = () => {
    const text = encodeURIComponent(generateWaMessage());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* 1. Üst Navigasyon & Öğrenci Başlık Kartı */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Link href="/ogretmen/ogrenciler" className="hover:text-indigo-600 hover:underline">
                ← Öğrencilerim
              </Link>
              <span>/</span>
              <span className="text-slate-700 dark:text-slate-300">Öğrenci Profili</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-lg font-black text-white shadow-md shadow-indigo-500/20">
                {student.full_name?.charAt(0) || 'Ö'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                    {student.full_name}
                  </h1>
                  {student.is_active ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Aktif Öğrenci
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Pasif
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {student.grade_level}. Sınıf LGS • {student.school_name || 'Kayıtlı Okul Belirtilmedi'}
                  {student.guardian_name && (
                    <span className="ml-2 font-medium text-slate-700 dark:text-slate-300">
                      • Veli: {student.guardian_name} ({student.guardian_rel || 'veli'})
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Hızlı Aksiyon Butonları */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowExamModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <Award className="h-4 w-4" />
              🎯 Deneme Ata
            </button>
            <button
              onClick={() => setShowHwModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
            >
              <FileText className="h-4 w-4" />
              📝 Ödev Ver
            </button>
            <button
              onClick={() => setShowWaModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <Share2 className="h-4 w-4" />
              💬 WhatsApp Karnesi
            </button>
            <Link
              href={`${basePath}/soru-ekle`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all"
            >
              <Plus className="h-4 w-4" />
              Soru Ekle
            </Link>
          </div>
        </div>

        {/* 2. Hızlı Gösterge Kartları */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800/60 dark:bg-slate-800/40">
            <div className="text-[11px] font-medium text-slate-500">Son Deneme Neti</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                {latestExam ? `${latestExam.net_score} Net` : '—'}
              </span>
              {latestExam && (
                <span className="text-[11px] text-slate-500">
                  ({latestExam.correct_count}D / {latestExam.wrong_count}Y)
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800/60 dark:bg-slate-800/40">
            <div className="text-[11px] font-medium text-slate-500">Aktif / Bekleyen Ödev</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                {activeHwCount} Görev
              </span>
              <span className="text-[11px] text-slate-500">takipte</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800/60 dark:bg-slate-800/40">
            <div className="text-[11px] font-medium text-slate-500">LGS Konu Hakimiyeti</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {totalSolvedQuestions > 0 ? `%${avgMastery}` : '—'}
              </span>
              <span className="text-[11px] text-slate-500">
                {totalSolvedQuestions > 0 ? '12 kazanım' : 'Veri bekleniyor'}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800/60 dark:bg-slate-800/40">
            <div className="text-[11px] font-medium text-slate-500">Soru Bankası & Yanlışlar</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                {bankStats.total} Soru
              </span>
              <span className="text-[11px] text-slate-500">
                ({bankStats.due} tekrar bekliyor)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sekmeli Navigasyon (Tabs) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('exams')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'exams'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Award className="h-4 w-4" />
          🎯 Sınavlar ve Denemeler
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {assignedExams.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('homework')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'homework'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="h-4 w-4" />
          📝 Ödevler ve Hedefler
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {assignedHomeworks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'analysis'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          📊 LGS Konu Başarı Analizi
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {totalSolvedQuestions > 0 ? `%${avgMastery}` : '0'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('bank')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'bank'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          📚 Soru Bankası & Yanlış Havuzu
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {bankStats.total}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'settings'
              ? 'border-slate-800 text-slate-800 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <User className="h-4 w-4" />
          ⚙️ Öğrenci Bilgileri & Hesap
        </button>
      </div>

      {/* 4. Sekme İçerikleri */}

      {/* SEKME 1: Sınavlar ve Denemeler */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Atanan Deneme Sınavları ve Sonuçları
              </h2>
              <p className="text-xs text-slate-500">
                Bu öğrenciye atanan tüm denemeler, net skorları ve katılım durumları.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowExamModal(true)}
                className="btn-primary text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Listeden Deneme Ata
              </button>
              <Link
                href={`/ogretmen/deneme-olustur?studentId=${student.id}`}
                className="btn-secondary text-xs inline-flex items-center gap-1"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Özel Deneme Oluştur (AI / PDF)
              </Link>
            </div>
          </div>

          {/* Sınav Listesi ya da Boş Durum */}
          {assignedExams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
              <Award className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Henüz Atanmış Deneme Sınavı Yok</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">Bu öğrenciye henüz bir deneme sınavı atanmadı. Yukarıdaki &quot;Listeden Deneme Ata&quot; veya &quot;Özel Deneme Oluştur&quot; butonlarını kullanarak hemen deneme atayabilirsiniz.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {assignedExams.map((exam, idx) => (
                <div
                  key={exam.assignment_id || idx}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 hover:border-indigo-300 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        exam.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : exam.status === 'active'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {exam.status === 'completed' ? '✓ Tamamlandı' : exam.status === 'active' ? 'Devam Ediyor' : '⏳ Bekliyor'}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {Number(exam.duration_min) > 0 ? `${exam.duration_min} dk` : 'Süresiz'} · {exam.question_count} soru
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-2">
                      {exam.title}
                    </h3>

                    <div className="text-xs text-slate-500 space-y-0.5">
                      <div>Atanma: {exam.assigned_at?.slice(0, 10)}</div>
                      {exam.due_at && <div>Bitiş: {exam.due_at?.slice(0, 10)}</div>}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    {exam.net_score !== null && exam.net_score !== undefined ? (
                      <div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[11px] text-slate-500 font-medium">Net Sonucu</div>
                            <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                              {exam.net_score} Net
                            </div>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            <span className="font-semibold text-emerald-600">{exam.correct_count}D</span>
                            {' · '}
                            <span className="font-semibold text-red-600">{exam.wrong_count}Y</span>
                            {' · '}
                            <span className="font-semibold text-slate-500">{exam.blank_count}B</span>
                            {Number(exam.total_duration_seconds) > 0 && (
                              <div className="mt-0.5 font-semibold text-slate-600 dark:text-slate-300">
                                ⏱ Çözüm süresi: {Math.floor(Number(exam.total_duration_seconds) / 60)} dk {Number(exam.total_duration_seconds) % 60} sn
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => openExamInspection(exam)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all"
                          >
                            🔍 Soru & Yanlış Analizini İncele
                          </button>
                          <Link
                            href={`/ogrenci/deneme/${exam.exam_id}?studentId=${student.id}`}
                            target="_blank"
                            className="text-xs text-slate-500 hover:text-indigo-600 hover:underline inline-flex items-center gap-1 font-semibold"
                          >
                            Öğrenci Gözüyle Aç <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> Henüz tamamlanmadı
                        </span>
                        <div className="flex items-center gap-3">
                          {!exam.is_study_plan && (
                            <Link
                              href={`/ogretmen/denemeler/${exam.exam_id}/hizli-optik-giris?studentId=${student.id}`}
                              className="text-xs text-emerald-700 hover:underline inline-flex items-center gap-1 font-bold dark:text-emerald-400"
                            >
                              ✍️ Cevapları elle gir
                            </Link>
                          )}
                          <Link
                            href={`/ogrenci/deneme/${exam.exam_id}?studentId=${student.id}`}
                            target="_blank"
                            className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1 font-semibold"
                          >
                            Öğrenci Gözüyle Aç <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SEKME 2: Ödevler ve Hedefler */}
      {activeTab === 'homework' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Ödevler ve Çalışma Hedefleri
              </h2>
              <p className="text-xs text-slate-500">
                Öğrenciye verilen konu pekiştirme ödevleri, tamamlanma oranları ve son teslim tarihleri.
              </p>
            </div>
            <button
              onClick={() => setShowHwModal(true)}
              className="btn-primary text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Yeni Ödev Tanımla
            </button>
          </div>

          {/* Ödev Listesi ya da Boş Durum */}
          {assignedHomeworks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
              <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Henüz Atanmış Ödev Yok</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">Bu öğrenciye henüz bir pekiştirme ödevi tanımlanmadı. &quot;Yeni Ödev Tanımla&quot; butonunu kullanarak dilediğiniz LGS konusundan ödev atayabilirsiniz.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {assignedHomeworks.map((hw, idx) => (
                <div
                  key={hw.id || idx}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {hw.topic_name || 'LGS Konusu'}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      Zorluk: {'⭐'.repeat(hw.difficulty_level || 3)}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      {hw.title}
                    </h3>
                    {hw.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {hw.description}
                      </p>
                    )}
                  </div>

                  {/* İlerleme Çubuğu */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">
                        Çözülen: {hw.completed_question_count || 0} / {hw.question_count} Soru
                      </span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        %{Math.round(hw.completion_percentage || 0)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${Math.min(100, hw.completion_percentage || 0)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Son Teslim: <b>{hw.due_date}</b>
                    </span>
                    <span className="font-semibold capitalize text-slate-700 dark:text-slate-300">
                      {hw.status === 'completed' ? '✓ Teslim Edildi' : 'Takip Ediliyor'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SEKME 3: LGS Konu Başarı Analizi */}
      {activeTab === 'analysis' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                12 Konuluk LGS Matematik Kazanım Hakimiyet Haritası
              </h2>
              <p className="text-xs text-slate-500">
                Öğrencinin çözdüğü tüm sorulara, denemelere ve ödevlere göre konu bazlı net başarısı.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {totalSolvedQuestions > 0 ? (
                <>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                    {strongTopics.length} Güçlü Konu
                  </span>
                  <span className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200">
                    {focusTopics.length} Öncelikli Odak
                  </span>
                </>
              ) : (
                <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                  12 LGS Konusu Tanımlı · Henüz Çözülmüş Soru Yok
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topicMastery.map((topic) => {
              const score = topic.mastery_score || 0;
              const hasData = (topic.solved_count || 0) > 0;
              const isStrong = hasData && score >= 75;
              const isWeak = hasData && score < 65;
              return (
                <div
                  key={topic.topic_id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      {hasData ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isStrong
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : isWeak
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {isStrong ? '🎯 Güçlü Konu' : isWeak ? '⚠️ Öncelikli Odak' : '⚡ Pekiştirilmeli'}
                        </span>
                      ) : (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          ⚪ Veri Bekleniyor
                        </span>
                      )}
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        {hasData ? `%${score}` : '—'}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {topic.topic_name}
                    </h3>
                  </div>

                  <div className="space-y-1.5">
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          !hasData ? 'bg-slate-200 dark:bg-slate-700' : isStrong ? 'bg-emerald-500' : isWeak ? 'bg-red-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${hasData ? score : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{hasData ? `${topic.solved_count} çözülen` : 'Henüz soru çözülmedi'}</span>
                      {hasData ? (
                        <span>
                          <b className="text-emerald-600">{topic.correct_count || 0}D</b> / <b className="text-red-600">{topic.wrong_count || 0}Y</b> / <b className="text-slate-400">{topic.blank_count || 0}B</b>
                        </span>
                      ) : (
                        <span>0D / 0Y / 0B</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => openHwForTopic(topic.topic_id, topic.topic_name)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-center text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-950/40"
                    >
                      📝 Bu Konudan Ödev Ata
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SEKME 4: Soru Bankası & Yanlış Havuzu */}
      {activeTab === 'bank' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Öğrencinin Kişisel Soru Bankası & Tekrar Havuzu
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Öğrencinin yanlış yaptığı ve boş bıraktığı soruların aralıklı tekrar algoritmasıyla (SRS) takibi.
            </p>
            {questionBankNode}
          </div>
        </div>
      )}

      {/* SEKME 5: Öğrenci Bilgileri & Hesap */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
              Öğrenci ve Hesap Yönetimi
            </h2>
            {studentFormsNode}
          </div>
        </div>
      )}

      {/* MODAL 1: DENEME ATA MODALI */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-indigo-600" />
                🎯 Öğrenciye Deneme Sınavı Ata
              </h3>
              <button
                onClick={() => setShowExamModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignExam} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Öğrenci:
                </label>
                <input
                  type="text"
                  disabled
                  value={`${student.full_name} (${student.grade_level}. Sınıf)`}
                  className="input bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Atanacak Deneme Sınavını Seçin:
                </label>
                {availableExams.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    Atanabilecek deneme yok. Önce{' '}
                    <Link href="/ogretmen/pdf-arsivi" className="font-semibold text-indigo-600 hover:underline">PDF Arşivi</Link>
                    {' '}sayfasından bir deneme PDF&apos;i yükleyin (cevap anahtarıyla).
                  </div>
                ) : (
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="input font-medium"
                  >
                    {availableExams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.title} ({ex.question_count} soru{ex.has_key === 0 ? ' · cevap anahtarı yok' : ''})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sınav Süresi (dakika):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={examDuration}
                    onChange={(e) => setExamDuration(Number(e.target.value))}
                    className="input"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">0 = süresiz (geçen süre kaydedilir)</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hedef Bitiş:
                  </label>
                  <input
                    type="text"
                    disabled
                    value="7 Gün İçinde"
                    className="input bg-slate-50 dark:bg-slate-800 text-slate-500"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-indigo-50 p-3 text-xs text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
                💡 Atanan bu deneme anında öğrencinin <b>Denemelerim</b> ekranında görünür.
              </div>

              {examMsg && (
                <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                  examMsg.type === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {examMsg.text}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href={`/ogretmen/deneme-olustur?studentId=${student.id}`}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI ile Seçmece Deneme Yap
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowExamModal(false)}
                    className="btn-secondary text-xs"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={examSubmitting || availableExams.length === 0}
                    className="btn-primary text-xs"
                  >
                    {examSubmitting ? 'Atanıyor…' : 'Denemeyi Ata'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ÖDEV VER MODALI */}
      {showHwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                📝 Öğrenciye Yeni Ödev Ata
              </h3>
              <button
                onClick={() => setShowHwModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignHomework} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Hedef LGS Konusu:
                </label>
                <select
                  value={hwTopicId}
                  onChange={(e) => handleTopicChange(e.target.value)}
                  className="input font-medium"
                >
                  {INITIAL_LGS_TOPICS.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ödev Başlığı:
                </label>
                <input
                  type="text"
                  required
                  value={hwTitle}
                  onChange={(e) => setHwTitle(e.target.value)}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Soru Sayısı:
                  </label>
                  <select
                    value={hwCount}
                    onChange={(e) => setHwCount(Number(e.target.value))}
                    className="input"
                  >
                    <option value={10}>10 Soru</option>
                    <option value={15}>15 Soru</option>
                    <option value={20}>20 Soru</option>
                    <option value={30}>30 Soru</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Zorluk Seviyesi:
                  </label>
                  <select
                    value={hwDifficulty}
                    onChange={(e) => setHwDifficulty(Number(e.target.value))}
                    className="input"
                  >
                    <option value={1}>Seviye 1 (Temel)</option>
                    <option value={2}>Seviye 2 (Kavrama)</option>
                    <option value={3}>Seviye 3 (LGS Standart)</option>
                    <option value={4}>Seviye 4 (Zor Beceri)</option>
                    <option value={5}>Seviye 5 (Üst Düzey)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Son Teslim Tarihi:
                  </label>
                  <input
                    type="date"
                    required
                    value={hwDueDate}
                    onChange={(e) => setHwDueDate(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="shareParent"
                  checked={hwShareParent}
                  onChange={(e) => setHwShareParent(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="shareParent" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Veli paneline ve WhatsApp bildirimine otomatik yansıt
                </label>
              </div>

              {hwMsg && (
                <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                  hwMsg.type === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {hwMsg.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowHwModal(false)}
                  className="btn-secondary text-xs"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={hwSubmitting}
                  className="btn-primary text-xs"
                >
                  {hwSubmitting ? 'Kaydediliyor…' : 'Ödevi Kaydet ve Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: WHATSAPP VELİ KARNESİ */}
      {showWaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="h-5 w-5 text-emerald-600" />
                💬 Veliye Hazır WhatsApp Gelişim Karnesi
              </h3>
              <button
                onClick={() => setShowWaModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-500">
                Öğrencinin güncel deneme netleri, ödev durumu ve LGS konu analizi tek tıkla veliye iletilmeye hazır formatlandı:
              </p>

              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {generateWaMessage()}
                </pre>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={copyWaText}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? '✓ Kopyalandı!' : 'Metni Kopyala'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowWaModal(false)}
                    className="btn-secondary text-xs"
                  >
                    Kapat
                  </button>
                  <button
                    onClick={openWaWeb}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <Send className="h-4 w-4" />
                    WhatsApp ile Gönder
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: SINAV SORU & YANLIŞ ANALİZİ MODALI */}
      {inspectingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            
            {/* Modal Üst Başlık & Özet Barı */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-900 dark:to-slate-900/80 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                      Öğrenci Sınav Analizi
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {student.full_name} ({student.grade_level}. Sınıf LGS)
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {inspectingExam.title || 'LGS Deneme Sınavı'}
                  </h3>
                </div>
                <button
                  onClick={() => setInspectingExam(null)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Hızlı İstatistik Kartları */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl bg-white dark:bg-slate-800 p-2.5 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Skor</div>
                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                      {inspectingExam.net_score !== null && inspectingExam.net_score !== undefined ? `${inspectingExam.net_score} Net` : '—'}
                    </div>
                  </div>
                  <Award className="h-6 w-6 text-indigo-500/30" />
                </div>

                <div className="rounded-xl bg-white dark:bg-slate-800 p-2.5 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Doğru Sayısı</div>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {inspectingExam.correct_count ?? inspectingQuestions.filter(q => q.isCorrect).length} Doğru
                    </div>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-emerald-500/30" />
                </div>

                <div className="rounded-xl bg-white dark:bg-slate-800 p-2.5 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Yanlış Sayısı</div>
                    <div className="text-lg font-black text-rose-600 dark:text-rose-400">
                      {inspectingExam.wrong_count ?? inspectingQuestions.filter(q => !q.isCorrect && !q.isBlank).length} Yanlış
                    </div>
                  </div>
                  <XCircle className="h-6 w-6 text-rose-500/30" />
                </div>

                <div className="rounded-xl bg-white dark:bg-slate-800 p-2.5 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Boş Sayısı</div>
                    <div className="text-lg font-black text-slate-600 dark:text-slate-300">
                      {inspectingExam.blank_count ?? inspectingQuestions.filter(q => q.isBlank).length} Boş
                    </div>
                  </div>
                  <HelpCircle className="h-6 w-6 text-slate-400/30" />
                </div>
              </div>

              {/* Filtre Butonları */}
              <div className="mt-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5" /> Filtrele:
                </span>
                <button
                  type="button"
                  onClick={() => setInspectingFilter('wrong')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    inspectingFilter === 'wrong'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50'
                  }`}
                >
                  🔴 Sadece Yanlışlar ({inspectingQuestions.filter(q => !q.isCorrect && !q.isBlank).length})
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingFilter('blank')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    inspectingFilter === 'blank'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  ⚪ Boş Bırakılanlar ({inspectingQuestions.filter(q => q.isBlank).length})
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingFilter('correct')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    inspectingFilter === 'correct'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50'
                  }`}
                >
                  🟢 Doğrular ({inspectingQuestions.filter(q => q.isCorrect).length})
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingFilter('all')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    inspectingFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Tüm Sorular ({inspectingQuestions.length})
                </button>
              </div>
            </div>

            {/* Modal Gövdesi: Soru Listesi */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50 dark:bg-slate-950/40">
              {inspectingLoading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Soru ve cevap analizi yükleniyor…</p>
                </div>
              ) : inspectingQuestions.length === 0 ? (
                <div className="py-16 text-center space-y-2 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
                  <AlertCircle className="h-10 w-10 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Detaylı Soru Kaydı Bulunamadı</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Bu deneme henüz öğrenci tarafından çözülmemiş ya da soru dökümleri işlenmemiş olabilir.
                  </p>
                </div>
              ) : (
                (() => {
                  const filtered = inspectingQuestions.filter(q => {
                    if (inspectingFilter === 'wrong') return !q.isCorrect && !q.isBlank;
                    if (inspectingFilter === 'blank') return q.isBlank;
                    if (inspectingFilter === 'correct') return q.isCorrect;
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center space-y-2 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {inspectingFilter === 'wrong' ? 'Tebrikler! Yanlış Yapılan Soru Yok.' : 'Bu filtreye ait soru bulunamadı.'}
                        </h4>
                        <p className="text-xs text-slate-400">
                          Diğer filtreleri seçerek öğrencinin diğer sorularını inceleyebilirsiniz.
                        </p>
                      </div>
                    );
                  }

                  return filtered.map((q) => {
                    const isAiLoading = Boolean(inspectingAiLoading[q.questionNo]);
                    const aiData = inspectingAiAnalysis[q.questionNo] || q.aiAnalysis;
                    const isMistakeSaved = Boolean(inspectingMistakeSaved[q.questionNo]);

                    return (
                      <div
                        key={q.questionNo}
                        className={`rounded-2xl border bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs transition-all space-y-4 ${
                          q.isCorrect
                            ? 'border-emerald-200/80 dark:border-emerald-950'
                            : q.isBlank
                            ? 'border-slate-200 dark:border-slate-800'
                            : 'border-rose-300/90 dark:border-rose-950 ring-1 ring-rose-200 dark:ring-rose-950'
                        }`}
                      >
                        {/* Soru Başlık & Durum Rozeti */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold">
                              {q.questionNo}
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {q.topicName || 'LGS Matematik'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {q.isCorrect ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Doğru Yapıldı
                              </span>
                            ) : q.isBlank ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                                <HelpCircle className="h-3.5 w-3.5" /> Boş Bırakıldı
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                                <XCircle className="h-3.5 w-3.5" /> Yanlış Cevaplandı
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Soru Metni */}
                        <div className="text-sm text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
                          {q.questionText}
                        </div>

                        {/* Şıklar */}
                        {q.options && typeof q.options === 'object' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {Object.entries(q.options).map(([optKey, optVal]: [string, any]) => {
                              const keyUpper = optKey.trim().toUpperCase();
                              const isStudentPick = (q.studentAnswer || '').trim().toUpperCase() === keyUpper;
                              const isCorrectAnswer = (q.correctAnswer || '').trim().toUpperCase() === keyUpper;

                              let optClass = 'border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300';
                              let badge = null;

                              if (isStudentPick && isCorrectAnswer) {
                                optClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-300 dark:ring-emerald-800 font-bold';
                                badge = (
                                  <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-200/70 dark:bg-emerald-900 px-2 py-0.5 rounded-full">
                                    ✓ Öğrencinin Doğru Tercihi
                                  </span>
                                );
                              } else if (isStudentPick && !isCorrectAnswer) {
                                optClass = 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 ring-2 ring-rose-300 dark:ring-rose-800 font-bold';
                                badge = (
                                  <span className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-300 bg-rose-200/70 dark:bg-rose-900 px-2 py-0.5 rounded-full">
                                    ✗ Öğrencinin Hatalı Seçimi
                                  </span>
                                );
                              } else if (isCorrectAnswer) {
                                optClass = 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-200 dark:ring-emerald-900 font-bold';
                                badge = (
                                  <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded-full">
                                    ★ Doğru Cevap
                                  </span>
                                );
                              }

                              return (
                                <div
                                  key={optKey}
                                  className={`rounded-xl border p-3 text-xs flex items-center justify-between gap-2 transition-all ${optClass}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white dark:bg-slate-700 font-bold border border-slate-300 dark:border-slate-600">
                                      {keyUpper}
                                    </span>
                                    <span>{String(optVal)}</span>
                                  </div>
                                  {badge}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Detaylı Çözüm ve Açıklama Kutusu */}
                        {q.solutionExplanation && (
                          <div className="rounded-xl border border-indigo-100 dark:border-indigo-950/80 bg-indigo-50/40 dark:bg-indigo-950/30 p-3.5 space-y-1">
                            <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                              <Lightbulb className="h-4 w-4 text-amber-500" />
                              Adım Adım Çözüm & Çözüm Mantığı:
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {q.solutionExplanation}
                            </p>
                          </div>
                        )}

                        {/* AI Teşhis ve Pedagojik Yanlış Analizi */}
                        {aiData && (
                          <div className="rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30 p-3.5 space-y-2 animate-in fade-in">
                            <div className="flex items-center gap-2 text-xs font-bold text-purple-800 dark:text-purple-300">
                              <Bot className="h-4 w-4 text-purple-600" />
                              🤖 Yapay Zekâ Pedagojik Hata Teşhisi ({aiData.provider || 'AI Analizi'}):
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                              {aiData.explanation || aiData.analysis || aiData.feedback}
                            </p>
                            {aiData.recommendedAction && (
                              <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 pt-1 border-t border-purple-100 dark:border-purple-900/60">
                                📌 Öğretmen Önerisi: {aiData.recommendedAction}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Aksiyon Butonları */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRequestQuestionAiAnalysis(q)}
                              disabled={isAiLoading}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-colors"
                            >
                              <Bot className="h-3.5 w-3.5" />
                              {isAiLoading ? 'AI İnceliyor…' : 'AI Hata Teşhisi İste'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePushToMistakePool(q)}
                              disabled={isMistakeSaved}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                                isMistakeSaved
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
                              }`}
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              {isMistakeSaved ? '✓ Havuzda Kayıtlı' : 'Yanlış Havuzuna Ekle'}
                            </button>
                          </div>

                          <div className="text-[11px] text-slate-400">
                            Doğru Cevap: <span className="font-bold text-slate-700 dark:text-slate-300">{q.correctAnswer}</span>
                            {' · '}
                            Öğrenci: <span className={`font-bold ${q.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>{q.studentAnswer || 'Boş'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>

            {/* Modal Alt Barı */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <Link
                href={`/ogrenci/deneme/${inspectingExam.exam_id}?studentId=${student.id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Öğrencinin Çözüm Ekranını Yeni Sekmede Aç
              </Link>

              <button
                type="button"
                onClick={() => setInspectingExam(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
              >
                İncelemeyi Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
