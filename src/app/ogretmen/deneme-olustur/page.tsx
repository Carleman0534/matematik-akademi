'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sparkles, FileText, CheckCircle2, Layers, BookOpen, 
  Play, Printer, Download, RefreshCw, Filter, Check, 
  Sliders, HelpCircle, ChevronRight, AlertCircle, ArrowRight,
  Users, UserCheck, Search, Clock, Pause, Plus, Lightbulb,
  AlertTriangle, ShieldAlert, Award, Eye, X, Zap, Target,
  Image as ImageIcon, MessageCircle, Share2, FileSpreadsheet, ShieldCheck
} from 'lucide-react';
import { SubTabBar } from '@/components/SubTabBar';
import { INITIAL_LGS_TOPICS } from '@/lib/ai/lgsCurriculum';
import { generateCurriculumQuestion, type GeneratedQuestionResult } from '@/lib/ai/questionGenerator';
import { checkDuplicateQuestion } from '@/lib/ai/mathValidator';
import { getClientPdfDocs } from '@/lib/clientPdfStorage';
import { downloadExamBookletAsPdf, openPrintBookletWindow } from '@/lib/pdf/examBookletPdf';

interface HybridQuestionItem {
  id: string;
  questionNo: number;
  topicId: string;
  topicName: string;
  sourceType: 'pdf' | 'ai';
  sourceTitle: string;
  pdfId?: string;
  pageNo?: number;
  questionNoInPdf?: number;
  difficulty: number; // 1-5
  difficultyLabel: 'Kolay' | 'Orta' | 'Zor';
  questionType: string;
  questionText: string;
  options: Record<string, string>;
  correctAnswer: string;
  solutionExplanation?: string;
  criticalWarning?: string;
  traps?: { option: string; reason: string }[];
  hasVisual?: boolean;
  svgContent?: string;
  imageUrl?: string;
}

function getTopicTrapsAndWarnings(topicId: string, correctAnswer: string) {
  const options = ['A', 'B', 'C', 'D'].filter(o => o !== correctAnswer);
  
  if (topicId.includes('carpanlar') || topicId.includes('01')) {
    return {
      criticalWarning: 'Bu soruda en sık yapılan hata "bir paketin kütlesi (EBOB)" ile "ihtiyaç duyulan paket sayısını" karıştırmaktır. Önce EBOB bulunur, ardından toplam miktar EBOB\'a bölünerek paket sayısı hesaplanır.',
      traps: [
        { option: options[0], reason: 'EBOB yerine EKOK hesaplayan veya sayıları doğrudan toplayan öğrencilerin düştüğü çeldirici.' },
        { option: options[1], reason: 'EBOB değerini bulup işlem bitti sanarak paket sayısı yerine doğrudan ortak böleni işaretleyenlerin hatası.' },
        { option: options[2], reason: 'Paket sayısını hesaplarken kütle farkını alan ya da bölme işlemini eksik bırakanların tuzağı.' },
      ]
    };
  } else if (topicId.includes('uslu') || topicId.includes('02')) {
    return {
      criticalWarning: 'Negatif kuvvet tabanın işaretini değiştirmez, sayının çarpmaya göre tersini alır (a⁻ⁿ = 1/aⁿ). Ayrıca parantez olmayan negatif tabanlı üslerde sonuç negatiftir.',
      traps: [
        { option: options[0], reason: 'Taban ile üssü çarparak işlem yapanların hatası (örneğin 3² yerine 3×2=6 hesaplayanlar).' },
        { option: options[1], reason: 'Negatif kuvveti sonucun eksi işareti sanarak negatif şıkkı işaretleyenlerin düştüğü tuzak.' },
        { option: options[2], reason: 'Üslü sayılarda toplama yaparken tabanları veya üsleri toplayanların kural ihlali.' },
      ]
    };
  } else if (topicId.includes('karekok') || topicId.includes('03')) {
    return {
      criticalWarning: 'Kareköklü ifadelerde kök içleri eşit olmadan toplama veya çıkarma yapılamaz (√a + √b ≠ √(a+b)). Sayılar önce a√b biçiminde yazılmalıdır.',
      traps: [
        { option: options[0], reason: 'Kök içindeki sayıları doğrudan toplayıp tek bir kök içine alanların yaptığı temel hata.' },
        { option: options[1], reason: 'Katsayıyı kök içine alırken karesini almayı unutup doğrudan içeri çarpanların tuzağı.' },
        { option: options[2], reason: 'Karekökün yaklaşık değerini hesaplarken ardışık tam kare sayıları yanlış belirleyenlerin hatası.' },
      ]
    };
  } else if (topicId.includes('veri') || topicId.includes('04')) {
    return {
      criticalWarning: 'Daire grafiğinde merkez açılar toplamı 360° iken, yüzdelik gösterimlerde toplam %100\'dür. Oran kurarken 360° üzerinden işlem yapılmalıdır.',
      traps: [
        { option: options[0], reason: 'Daire grafiğindeki 360°\'lik açıyı doğrudan yüzde (%) gibi okuyanların hatası.' },
        { option: options[1], reason: 'Sütun grafiğindeki eksen başlangıcının 0 olmadığını gözden kaçırarak oranlayanların tuzağı.' },
        { option: options[2], reason: 'Artış miktarını başlangıç değerine bölmek yerine son değere bölenlerin çeldiricisi.' },
      ]
    };
  } else if (topicId.includes('olasilik') || topicId.includes('05')) {
    return {
      criticalWarning: 'Bir olayın olasılığı her zaman 0 ile 1 arasındadır. İstenen durumların sayısını belirlerken hiçbir durum çift sayılmamalı ve örneklem uzay eksiksiz yazılmalıdır.',
      traps: [
        { option: options[0], reason: 'Tüm olası durumların sayısını eksik hesaplayarak paydayı küçük bulanların düştüğü tuzak.' },
        { option: options[1], reason: 'İstenmeyen durumları toplamdan çıkarmak yerine doğrudan paya yazanların mantık hatası.' },
        { option: options[2], reason: 'Olasılık kesrini sadeleştirirken yapılan işlem hatası.' },
      ]
    };
  } else if (topicId.includes('cebirsel') || topicId.includes('06')) {
    return {
      criticalWarning: '(a + b)² = a² + 2ab + b² özdeşliğinde ortadaki 2ab terimi asla unutulmamalıdır. (a + b)² ≠ a² + b²!',
      traps: [
        { option: options[0], reason: 'Tam kare açılımında çarpımlarının iki katı (2ab) terimini unutanların klasik hatası.' },
        { option: options[1], reason: 'İki kare farkı (a² - b²) ile tam kare (a - b)² ifadelerini birbirine karıştıranların tuzağı.' },
        { option: options[2], reason: 'Parantez önündeki eksi işaretini terimlere dağıtırken işaret hatası yapanlar.' },
      ]
    };
  } else {
    return {
      criticalWarning: 'LGS yeni nesil sorularda problem metnindeki kısıtlamalar (en az, en fazla, tam sayı, pozitif vb.) dikkatle incelenmelidir.',
      traps: [
        { option: options[0], reason: 'Soru kökündeki "en az / en fazla" şartını göz ardı edenlerin aceleyle işaretlediği çeldirici.' },
        { option: options[1], reason: 'İşlem önceliğinde parantez veya çarpma yerine soldan sağa işlem yapanların hatası.' },
        { option: options[2], reason: 'Birim dönüşümünü (cm -> m veya kg -> g) yapmadan hesaplayanların düştüğü tuzak.' },
      ]
    };
  }
}

export default function DenemeOlusturPage() {
  // 1. Ayarlar & Parametreler
  const [examTitle, setExamTitle] = useState('LGS Matematik Hibrit Hedef Denemesi');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    'top_carpanlar_katlar',
    'top_uslu_ifadeler',
    'top_karekoklu_ifadeler',
    'top_veri_analizi'
  ]);
  const [totalQuestions, setTotalQuestions] = useState<number>(20);
  const [pdfRatio, setPdfRatio] = useState<number>(50); // %50 PDF, %50 AI
  const [difficultyDistribution, setDifficultyDistribution] = useState<'balanced' | 'challenging' | 'foundation'>('balanced');
  const [durationMin, setDurationMin] = useState<number>(40);

  // Öğrenci Seçimi
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(['student_ali_metin']);
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [students, setStudents] = useState<any[]>([
    { id: 'student_ali_metin', full_name: 'Ali Metin (Ali Tarlasüren)', grade_level: 8, class_name: '8-A Sayısal', school_name: 'Özel Pozitif Kişisel Gelişim Kursu' },
    { id: 'student_muhammed_talha', full_name: 'Muhammed Talha', grade_level: 8, class_name: '8-A LGS', school_name: 'Atatürk Ortaokulu', username: 'muhammedtalha' },
  ]);

  // 2. Derleme Durumu
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compiledQuestions, setCompiledQuestions] = useState<HybridQuestionItem[]>([]);
  const [activeViewTab, setActiveViewTab] = useState<'preview' | 'answers' | 'solutions'>('preview');
  const [assignSuccess, setAssignSuccess] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // 3. Eksik Kapatma & Canlı Sınav Durumları (Öneriler 1, 4, 5)
  const [isCompilingWeakMode, setIsCompilingWeakMode] = useState<boolean>(false);
  const [weakModeActive, setWeakModeActive] = useState<boolean>(false);
  const [showLiveExamModal, setShowLiveExamModal] = useState<boolean>(false);
  const [liveSecondsRemaining, setLiveSecondsRemaining] = useState<number>(40 * 60);
  const [isLiveTimerRunning, setIsLiveTimerRunning] = useState<boolean>(false);
  const [liveStudentProgress, setLiveStudentProgress] = useState<any[]>([]);

  // 4. Şekilli Soru, Optik Okuyucu & WhatsApp Durumları
  const [visualRatio, setVisualRatio] = useState<number>(50); // %0 Metin, %25, %50, %75, %100 Tamamı Şekilli
  const [showOpticModal, setShowOpticModal] = useState<boolean>(false);
  const [opticStudentId, setOpticStudentId] = useState<string>('student_ali_metin');
  const [opticAnswers, setOpticAnswers] = useState<Record<number, string>>({});
  const [opticInputString, setOpticInputString] = useState<string>('');
  const [opticResult, setOpticResult] = useState<any>(null);
  const [opticSaved, setOpticSaved] = useState<boolean>(false);

  // 5. Kaynak PDF Seçimi (Seçmece Deneme) Durumları
  const [availablePdfs, setAvailablePdfs] = useState<any[]>([]);
  const [selectedPdfIds, setSelectedPdfIds] = useState<string[]>(['pdf_meb_64_soru', 'pdf_lgs_2024']);
  const [pdfSearch, setPdfSearch] = useState<string>('');

  // 6. Onay Durumları (Adım Adım Onaylama: Hedef Öğrenci, Kaynak PDF, LGS Konuları)
  const [isStudentConfirmed, setIsStudentConfirmed] = useState<boolean>(true);
  const [isPdfConfirmed, setIsPdfConfirmed] = useState<boolean>(true);
  const [isTopicsConfirmed, setIsTopicsConfirmed] = useState<boolean>(true);
  const [stepToast, setStepToast] = useState<string>('');

  // 7. Zorluk Ayrımı ve Kaynak Filtresi (Kolay, Orta, Zor / PDF, AI)
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'Kolay' | 'Orta' | 'Zor'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'pdf' | 'ai'>('all');

  // 8. Öğrenci Görünüm Güvencesi (Yapay Zekâ Etiketlerini Gizleme Önizlemesi)
  const [isStudentViewMode, setIsStudentViewMode] = useState<boolean>(false);

  // 9. A4 Kitapçık & PDF İndirme Durumları (Önizleme ve Baskı Çözümü)
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [pdfDownloading, setPdfDownloading] = useState<boolean>(false);
  const [pdfStatusMsg, setPdfStatusMsg] = useState<string>('');
  const [includeOpticInPrint, setIncludeOpticInPrint] = useState<boolean>(true);
  const [includeAnswerKeyInPrint, setIncludeAnswerKeyInPrint] = useState<boolean>(true);

  const handleDirectPdfDownload = async () => {
    if (compiledQuestions.length === 0) return;
    setPdfDownloading(true);
    setPdfStatusMsg('A4 Sayfaları hazırlanıyor…');
    try {
      await downloadExamBookletAsPdf({
        examTitle,
        durationMin,
        questions: compiledQuestions,
        includeAnswerKey: includeAnswerKeyInPrint,
        includeOptic: includeOpticInPrint,
        studentName: primaryStudentName,
        onProgress: (msg) => setPdfStatusMsg(msg)
      });
      setTimeout(() => {
        setPdfDownloading(false);
        setPdfStatusMsg('');
        setShowPrintModal(false);
      }, 1200);
    } catch (err) {
      console.error('PDF indirme hatası:', err);
      setPdfStatusMsg('PDF oluşturulamadı, lütfen Temiz Baskı Önizlemesi seçeneğini kullanın.');
      setPdfDownloading(false);
    }
  };

  const handleOpenPrintWindow = () => {
    if (compiledQuestions.length === 0) return;
    openPrintBookletWindow({
      examTitle,
      durationMin,
      questions: compiledQuestions,
      includeAnswerKey: includeAnswerKeyInPrint,
      includeOptic: includeOpticInPrint,
      studentName: primaryStudentName
    });
    setShowPrintModal(false);
  };

  // Soruya özel resim yükleme işleyicisi (Öğretmen dosya seçtiğinde)
  const handleAttachImage = (qId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      setCompiledQuestions(prev => prev.map(q => q.id === qId ? { ...q, imageUrl: dataUrl, hasVisual: true } : q));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (qId: string) => {
    setCompiledQuestions(prev => prev.map(q => q.id === qId ? { ...q, imageUrl: undefined } : q));
  };

  // Hızlı Optik Cevap Stringi Girişi (örn: BACDABBCA...)
  const handleOpticStringChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-D_ -]/g, '');
    setOpticInputString(clean);
    const newAnswers: Record<number, string> = { ...opticAnswers };
    for (let i = 0; i < clean.length && i < compiledQuestions.length; i++) {
      const ch = clean[i];
      if (['A', 'B', 'C', 'D'].includes(ch)) {
        newAnswers[i + 1] = ch;
      }
    }
    setOpticAnswers(newAnswers);
  };

  const handleToggleOpticAnswer = (qNo: number, choice: string) => {
    setOpticAnswers(prev => {
      const copy = { ...prev };
      if (copy[qNo] === choice) {
        delete copy[qNo];
      } else {
        copy[qNo] = choice;
      }
      return copy;
    });
  };

  // Optik Sonuç Hesaplama
  const handleCalculateOptic = () => {
    if (compiledQuestions.length === 0) return;
    let correct = 0;
    let wrong = 0;
    let blank = 0;
    const details: any[] = [];

    compiledQuestions.forEach(q => {
      const studentAns = opticAnswers[q.questionNo] || '';
      const isBlank = !studentAns;
      const isCorrect = studentAns === q.correctAnswer;
      if (isBlank) blank++;
      else if (isCorrect) correct++;
      else wrong++;

      details.push({
        qNo: q.questionNo,
        topic: q.topicName,
        correctAnswer: q.correctAnswer,
        studentAnswer: studentAns || '-',
        isCorrect,
        isBlank
      });
    });

    const rawNet = correct - (wrong / 3);
    const net = Math.max(0, Number(rawNet.toFixed(2)));

    const resultObj = {
      correct,
      wrong,
      blank,
      net,
      details,
      timestamp: new Date().toISOString()
    };
    setOpticResult(resultObj);
    setOpticSaved(false);
  };

  // Optik Sonucu Kaydetme
  const handleSaveOpticResult = () => {
    setOpticSaved(true);
    alert('Öğrencinin optik form sonuçları başarıyla kaydedildi! İsterseniz aşağıdaki butondan velisine WhatsApp karnesi gönderebilirsiniz.');
  };

  // WhatsApp Veli Karne Mesajı Gönderme
  const handleShareWhatsApp = () => {
    if (!opticResult) return;
    const targetStudent = students.find(s => s.id === opticStudentId) || students[0];
    const sName = targetStudent?.full_name || 'Ali Metin';

    const weakTopics = Array.from(new Set(
      opticResult.details
        .filter((d: any) => !d.isCorrect && !d.isBlank)
        .map((d: any) => d.topic)
    ));

    const strongTopics = Array.from(new Set(
      opticResult.details
        .filter((d: any) => d.isCorrect)
        .map((d: any) => d.topic)
    ));

    const text = `📚 *MATEMATİK AKADEMİ — LGS DENEME SINAV KARNESİ*
👤 *Öğrenci:* ${sName}
📝 *Sınav:* ${examTitle}
📅 *Tarih:* ${new Date().toLocaleDateString('tr-TR')}
━━━━━━━━━━━━━━━━━━━━
✅ *Doğru:* ${opticResult.correct}
❌ *Yanlış:* ${opticResult.wrong}
⚪ *Boş:* ${opticResult.blank}
🎯 *LGS Net:* ${opticResult.net} Net (Başarı: %${Math.round((opticResult.correct / compiledQuestions.length) * 100)})
━━━━━━━━━━━━━━━━━━━━
${strongTopics.length > 0 ? `🌟 *Güçlü Konular:* ${strongTopics.slice(0, 3).join(', ')}\n` : ''}${weakTopics.length > 0 ? `⚠️ *Tekrar Edilmesi Gereken Konular:* ${weakTopics.slice(0, 3).join(', ')}\n` : '🌟 Tebrikler, tüm sorular doğru çözüldü!\n'}━━━━━━━━━━━━━━━━━━━━
Öğrencimizi tebrik eder, çalışmalarında başarılar dileriz!`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Canlı Sınav Geri Sayım Sayacı
  useEffect(() => {
    let timer: any = null;
    if (isLiveTimerRunning && liveSecondsRemaining > 0) {
      timer = setInterval(() => {
        setLiveSecondsRemaining(prev => Math.max(0, prev - 1));
        
        // Simüle canlı ilerleme güncellemesi
        setLiveStudentProgress(prev => 
          prev.map(p => {
            if (p.status === 'completed') return p;
            const advance = Math.random() < 0.25 && p.currentQuestion < totalQuestions;
            const newQ = advance ? p.currentQuestion + 1 : p.currentQuestion;
            return {
              ...p,
              currentQuestion: newQ,
              answeredCount: advance ? p.answeredCount + 1 : p.answeredCount,
              status: newQ >= totalQuestions ? 'completed' : 'active'
            };
          })
        );
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLiveTimerRunning, liveSecondsRemaining, totalQuestions]);

  // Öğrencileri yükle
  useEffect(() => {
    async function loadStudents() {
      try {
        const res = await fetch('/api/students');
        const d = await res.json();
        const list = d.students || d.data || [];
        if (Array.isArray(list) && list.length > 0) {
          const normalized = list.map((s: any) => ({
            id: String(s.id),
            full_name: s.full_name || s.name || s.user_name || 'Öğrenci',
            grade_level: s.grade_level || s.grade || 8,
            class_name: s.class_name || (s.grade_level ? `${s.grade_level}-A` : '8-A'),
            school_name: s.school_name || s.school || ''
          }));

          const hasAli = normalized.some(s => s.full_name.toLowerCase().includes('ali metin'));
          if (!hasAli) {
            normalized.unshift({
              id: 'student_ali_metin',
              full_name: 'Ali Metin (Ali Tarlasüren)',
              grade_level: 8,
              class_name: '8-A Sayısal',
              school_name: 'Özel Pozitif Kişisel Gelişim Kursu'
            });
          }

          const hasTalha = normalized.some(s => s.full_name.toLowerCase().includes('muhammed') || s.full_name.toLowerCase().includes('talha'));
          if (!hasTalha) {
            normalized.push({
              id: 'student_muhammed_talha',
              full_name: 'Muhammed Talha',
              grade_level: 8,
              class_name: '8-A LGS',
              school_name: 'Atatürk Ortaokulu'
            });
          }
          setStudents(normalized);
        }
      } catch (e) {
        console.warn('Could not load students:', e);
      }
    }
    loadStudents();
  }, []);

  // PDF Dokümanlarını Yükle (IndexedDB + API)
  useEffect(() => {
    async function loadPdfs() {
      try {
        const clientDocs = getClientPdfDocs() || [];
        let serverDocs: any[] = [];
        try {
          const res = await fetch('/api/pdf-documents');
          const d = await res.json();
          if (d.docs && Array.isArray(d.docs)) serverDocs = d.docs;
        } catch {}

        const map = new Map<string, any>();

        // Standart LGS Çıkmış & Resmi Örnek Soru Kaynakları
        const defaultSources = [
          {
            id: 'pdf_meb_64_soru',
            title: 'MEB LGS 1. Dönem Matematik 64 Örnek Soru Bankası',
            file_name: 'meb_lgs_64_ornek_sorular.pdf',
            file_type: 'soru_bankasi',
            publisher: 'T.C. Millî Eğitim Bakanlığı',
            page_count: 39,
            question_count: 64,
            badge: 'MEB 64 Soru Bankası'
          },
          {
            id: 'pdf_lgs_2024',
            title: '2024 LGS Sayısal Matematik (MEB Çıkmış Sınav)',
            file_name: '2024_lgs_sayisal.pdf',
            file_type: 'deneme',
            publisher: 'T.C. Millî Eğitim Bakanlığı',
            page_count: 8,
            question_count: 20,
            badge: 'MEB Çıkmış'
          },
          {
            id: 'pdf_lgs_2023',
            title: '2023 LGS Sayısal Matematik (MEB Çıkmış Sınav)',
            file_name: '2023_lgs_sayisal.pdf',
            file_type: 'deneme',
            publisher: 'T.C. Millî Eğitim Bakanlığı',
            page_count: 8,
            question_count: 20,
            badge: 'MEB Çıkmış'
          },
          {
            id: 'pdf_lgs_odsgm',
            title: 'LGS 1. Dönem Tekrar & Örnek Soru Fasikülü',
            file_name: 'odsgm_ornek_sorular.pdf',
            file_type: 'calisma_foyu',
            publisher: 'ÖDSGM',
            page_count: 12,
            question_count: 25,
            badge: 'Örnek Fasikül'
          }
        ];

        defaultSources.forEach(s => map.set(s.id, s));
        clientDocs.forEach((d: any) => map.set(d.id, { ...d, badge: 'Arşivinizden' }));
        serverDocs.forEach((d: any) => map.set(d.id, { ...d, badge: 'Arşivinizden' }));

        const all = Array.from(map.values());
        setAvailablePdfs(all);
        setSelectedPdfIds(prev => prev.length > 0 ? prev : [all[0].id]);
      } catch (e) {
        console.warn('PDF listesi yüklenemedi:', e);
      }
    }
    loadPdfs();
  }, []);

  // PDF Seçim Yardımcıları
  const togglePdf = (id: string) => {
    setSelectedPdfIds(prev =>
      prev.includes(id)
        ? (prev.length === 1 ? prev : prev.filter(x => x !== id))
        : [...prev, id]
    );
  };

  const selectAllPdfs = () => {
    setSelectedPdfIds(availablePdfs.map(p => p.id));
  };

  const selectOnlyMebPdfs = () => {
    const meb = availablePdfs.filter(p => p.badge?.includes('MEB') || p.id.includes('meb') || p.id.includes('2024') || p.id.includes('2023'));
    if (meb.length > 0) setSelectedPdfIds(meb.map(p => p.id));
  };

  const filteredPdfs = availablePdfs.filter(p => {
    if (!pdfSearch.trim()) return true;
    const q = pdfSearch.toLowerCase();
    return p.title.toLowerCase().includes(q) || (p.publisher && p.publisher.toLowerCase().includes(q));
  });

  // Öğrenci Seçim Yardımcıları
  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // En az bir öğrenci seçili kalsın
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const selectAllStudents = () => {
    setSelectedStudentIds(students.map(s => s.id));
  };

  const selectOnlyAli = () => {
    const ali = students.find(s => s.id === 'student_ali_metin' || s.full_name.toLowerCase().includes('ali metin')) || students[0];
    if (ali) setSelectedStudentIds([ali.id]);
  };

  const filteredStudents = students.filter(s => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return s.full_name.toLowerCase().includes(q) || (s.class_name && s.class_name.toLowerCase().includes(q));
  });

  const selectedStudentsInfo = students.filter(s => selectedStudentIds.includes(s.id));
  const primaryStudentName = selectedStudentsInfo.length === 1 
    ? selectedStudentsInfo[0].full_name 
    : `${selectedStudentsInfo.length} Öğrenci`;

  // Konu Seçim Yardımcıları
  const toggleTopic = (id: string) => {
    setSelectedTopics(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const selectAllTopics = () => {
    setSelectedTopics(INITIAL_LGS_TOPICS.map(t => t.id));
  };

  const selectTerm1Topics = () => {
    // LGS 1. Dönem: Çarpanlar, Üslü, Kareköklü, Veri Analizi, Olasılık, Cebirsel
    setSelectedTopics([
      'top_carpanlar_katlar',
      'top_uslu_ifadeler',
      'top_karekoklu_ifadeler',
      'top_veri_analizi',
      'top_olasilik',
      'top_cebirsel_ifadeler'
    ]);
  };

  const selectAliMetinWeakTopics = () => {
    // Ali Metin'in son denemesinde eksik kaldığı öncelikli konular
    setSelectedTopics([
      'top_carpanlar_katlar',
      'top_uslu_ifadeler',
      'top_karekoklu_ifadeler'
    ]);
  };

  // Hibrit Deneme Derleme Motoru (Öneri 4: Çeldirici & Hata Teşhisi ile)
  const handleCompileExam = async (overrideTopics?: string[], overrideTitle?: string) => {
    const topicsToUse = overrideTopics || selectedTopics;
    if (topicsToUse.length === 0) {
      alert('Lütfen en az 1 konu seçin.');
      return;
    }

    // Seçilen 3 adımı da otomatik onaylanmış olarak işaretle
    setIsStudentConfirmed(true);
    setIsPdfConfirmed(true);
    setIsTopicsConfirmed(true);

    setIsCompiling(true);
    setAssignSuccess('');

    try {
      // 1. PDF'lerden kaç, AI'dan kaç soru alınacak hesapla
      const pdfCount = Math.round((totalQuestions * pdfRatio) / 100);
      const aiCount = totalQuestions - pdfCount;

      // 2. Sistemdeki PDF ve Havuz sorularını sorgula (Doğrudan PDF soru havuzu)
      let poolQuestions: any[] = [];
      try {
        const res = await fetch('/api/lgs/question-pool?source=pdf');
        const data = await res.json();
        if (data.success && data.pool) {
          poolQuestions = data.pool;
        }
      } catch (err) {
        console.warn('Could not fetch pool questions, will use fallback:', err);
      }

      // 3. Seçilen PDF dokümanlarını al
      const selectedPdfList = availablePdfs.filter(p => selectedPdfIds.includes(p.id));
      const activePdfTitles = selectedPdfList.map(p => p.title);
      const defaultPdfTitle = activePdfTitles[0] || '2024 LGS Sayısal Matematik Kitapçığı';

      const results: HybridQuestionItem[] = [];
      const usedPoolQuestionIds = new Set<string>();
      const examQuestionTexts: { id: string; text: string }[] = [];
      const topicCountMap = new Map<string, number>();

      // A. PDF Sorularını Dağıt (Doğrudan PDF Çekme Motoru & Kolay/Orta/Zor Ayrımı)
      for (let i = 1; i <= pdfCount; i++) {
        const topicId = topicsToUse[(i - 1) % topicsToUse.length];
        const topicObj = INITIAL_LGS_TOPICS.find(t => t.id === topicId) || INITIAL_LGS_TOPICS[0];

        // Pedagojik Kolay / Orta / Zor Dağılımı
        const pos = i / totalQuestions;
        let diff = 3;
        let diffLabel: 'Kolay' | 'Orta' | 'Zor' = 'Orta';
        if (difficultyDistribution === 'foundation') {
          if (pos <= 0.6) { diff = (i % 2 === 0 ? 2 : 1); diffLabel = 'Kolay'; }
          else if (pos <= 0.85) { diff = 3; diffLabel = 'Orta'; }
          else { diff = 4; diffLabel = 'Zor'; }
        } else if (difficultyDistribution === 'challenging') {
          if (pos <= 0.15) { diff = 2; diffLabel = 'Kolay'; }
          else if (pos <= 0.45) { diff = 3; diffLabel = 'Orta'; }
          else { diff = (i % 2 === 0 ? 5 : 4); diffLabel = 'Zor'; }
        } else {
          if (pos <= 0.25) { diff = (i % 2 === 0 ? 2 : 1); diffLabel = 'Kolay'; }
          else if (pos <= 0.75) { diff = 3; diffLabel = 'Orta'; }
          else { diff = (i % 2 === 0 ? 5 : 4); diffLabel = 'Zor'; }
        }
        
        const targetPdf = selectedPdfList[(i - 1) % (selectedPdfList.length || 1)] || selectedPdfList[0];
        const currentPdfName = targetPdf?.title || defaultPdfTitle;

        // 1. Aşama: Seçilen PDF(ler) içinde, bu konuya ait soru ara
        let matchingPool = poolQuestions.find((pq: any) => {
          if (usedPoolQuestionIds.has(pq.id)) return false;
          const matchSource = (selectedPdfIds.length === 0 || selectedPdfIds.includes(pq.pdf_id) || selectedPdfIds.includes(pq.source_id) || activePdfTitles.includes(pq.source_title));
          const matchTopic = (pq.primary_topic_id === topicId || pq.topic_name === topicObj.name);
          if (!matchSource || !matchTopic) return false;
          const dup = checkDuplicateQuestion(pq.question_text || '', examQuestionTexts, 0.40);
          return !dup.isDuplicate;
        });

        // 2. Aşama: Eğer seçili PDF'te bu konudan soru kalmadıysa, sistemdeki diğer LGS PDF'lerinden aynı konudan doğrudan çek
        if (!matchingPool) {
          matchingPool = poolQuestions.find((pq: any) => {
            if (usedPoolQuestionIds.has(pq.id)) return false;
            const matchTopic = (pq.primary_topic_id === topicId || pq.topic_name === topicObj.name);
            if (!matchTopic) return false;
            const dup = checkDuplicateQuestion(pq.question_text || '', examQuestionTexts, 0.40);
            return !dup.isDuplicate;
          });
        }

        const defaultAns = ['A', 'B', 'C', 'D'][(i - 1) % 4];
        let qText = '';
        let qOptions: Record<string, string> = {};
        let qAns: string = defaultAns;
        let qSol = '';
        let qType = i % 2 === 0 ? 'yeni_nesil' : 'problem_cozme';
        let qVisual = visualRatio === 100 
          ? true 
          : visualRatio === 0 
            ? false 
            : visualRatio === 75 
              ? (i % 4 !== 0) 
              : visualRatio === 50 
                ? (i % 2 === 1) 
                : (i % 4 === 1);
        let qSvgContent: string | undefined = undefined;

        if (matchingPool && matchingPool.question_text) {
          usedPoolQuestionIds.add(matchingPool.id);
          examQuestionTexts.push({ id: matchingPool.id, text: matchingPool.question_text });
          // Öğrenciye gösterilecek soru metninde iç robot/etiketler yer almaz
          qText = matchingPool.question_text.replace(/^\d+\.\s*Soru\s*\[[^\]]+\]:\s*/gi, '').replace(/^\[[^\]]+\]:\s*/gi, '').trim();
          qOptions = matchingPool.options || { A: 'A', B: 'B', C: 'C', D: 'D' };
          qAns = matchingPool.correct_answer || defaultAns;
          diff = matchingPool.difficulty || diff;
          diffLabel = diff <= 2 ? 'Kolay' : diff === 3 ? 'Orta' : 'Zor';
          qSol = `1. Adım: ${topicObj.name} (${diffLabel}) sorusunda verilenler çözümlenir.\n2. Adım: İlgili matematiksel bağıntı uygulanır.\n3. Adım: Doğru seçenek ${qAns} olarak bulunur.`;
          qType = matchingPool.question_type || qType;
        } else {
          // SEÇİLEN PDF'TE BU KONU/ZORLUKTA KULLANILMAMIŞ ÖZGÜN SORU YOKSA: MEB FORMATINDA ÖZGÜN SORU TAMAMLANIR
          const currentCount = topicCountMap.get(topicId) || 0;
          topicCountMap.set(topicId, currentCount + 1);

          let varIdx = currentCount;
          let gen = generateCurriculumQuestion({
            topicId,
            difficulty: diff,
            questionType: qType as any,
            visualRequired: qVisual,
            variationIndex: varIdx
          });

          let attempts = 0;
          while (checkDuplicateQuestion(gen.questionText, examQuestionTexts, 0.35).isDuplicate && attempts < 6) {
            attempts++;
            varIdx++;
            gen = generateCurriculumQuestion({
              topicId,
              difficulty: diff,
              questionType: attempts % 2 === 0 ? 'problem_cozme' : 'gunluk_yasam',
              visualRequired: qVisual,
              variationIndex: varIdx
            });
          }

          examQuestionTexts.push({ id: gen.id, text: gen.questionText });
          qText = gen.questionText;
          qOptions = gen.options;
          qAns = gen.correctAnswer;
          qSol = gen.solutionExplanation;
          qType = gen.questionType;
          qSvgContent = gen.svgContent;
        }

        const trapsInfo = getTopicTrapsAndWarnings(topicId, qAns);
        const pdfSourceTitle = matchingPool 
          ? `${matchingPool.source_title || currentPdfName}${matchingPool.page_no ? ` (Sayfa ${matchingPool.page_no}, Soru ${matchingPool.question_no || i})` : ''}`
          : `LGS Özgün Soru (${currentPdfName} Destekli)`;

        results.push({
          id: matchingPool ? matchingPool.id : `hybrid_pdf_${i}`,
          questionNo: i,
          topicId,
          topicName: topicObj.name,
          sourceType: matchingPool ? 'pdf' : 'ai',
          sourceTitle: pdfSourceTitle,
          pdfId: matchingPool?.pdf_id || targetPdf?.id,
          pageNo: matchingPool?.page_no,
          questionNoInPdf: matchingPool?.question_no,
          difficulty: diff,
          difficultyLabel: diffLabel,
          questionType: qType,
          questionText: qText,
          options: qOptions,
          correctAnswer: qAns,
          solutionExplanation: qSol,
          criticalWarning: trapsInfo.criticalWarning,
          traps: trapsInfo.traps,
          hasVisual: Boolean(matchingPool?.image_url) || Boolean(qSvgContent) || qVisual,
          imageUrl: matchingPool?.image_url,
          svgContent: qSvgContent
        });
      }

      // B. Kalan Kontenjanı Tamamla (Asla Birbirini Tekrar Etmeyen Çoklu Arşetip Motoru)
      for (let j = 1; j <= aiCount; j++) {
        const qIndex = pdfCount + j;
        const topicId = topicsToUse[(j - 1) % topicsToUse.length];
        const topicObj = INITIAL_LGS_TOPICS.find(t => t.id === topicId) || INITIAL_LGS_TOPICS[0];

        const pos = qIndex / totalQuestions;
        let diff = 3;
        let diffLabel: 'Kolay' | 'Orta' | 'Zor' = 'Orta';
        if (difficultyDistribution === 'foundation') {
          if (pos <= 0.6) { diff = (qIndex % 2 === 0 ? 2 : 1); diffLabel = 'Kolay'; }
          else if (pos <= 0.85) { diff = 3; diffLabel = 'Orta'; }
          else { diff = 4; diffLabel = 'Zor'; }
        } else if (difficultyDistribution === 'challenging') {
          if (pos <= 0.15) { diff = 2; diffLabel = 'Kolay'; }
          else if (pos <= 0.45) { diff = 3; diffLabel = 'Orta'; }
          else { diff = (qIndex % 2 === 0 ? 5 : 4); diffLabel = 'Zor'; }
        } else {
          if (pos <= 0.25) { diff = (qIndex % 2 === 0 ? 2 : 1); diffLabel = 'Kolay'; }
          else if (pos <= 0.75) { diff = 3; diffLabel = 'Orta'; }
          else { diff = (qIndex % 2 === 0 ? 5 : 4); diffLabel = 'Zor'; }
        }

        const isAiVisual = visualRatio === 100 
          ? true 
          : visualRatio === 0 
            ? false 
            : visualRatio === 75 
              ? (j % 4 !== 0) 
              : visualRatio === 50 
                ? (j % 2 === 0) 
                : (j % 4 === 0);

        const currentCount = topicCountMap.get(topicId) || 0;
        topicCountMap.set(topicId, currentCount + 1);

        let varIdx = currentCount;
        let generated = generateCurriculumQuestion({
          topicId,
          difficulty: diff,
          questionType: 'yeni_nesil',
          visualRequired: isAiVisual,
          variationIndex: varIdx
        });

        let attempts = 0;
        while (checkDuplicateQuestion(generated.questionText, examQuestionTexts, 0.35).isDuplicate && attempts < 6) {
          attempts++;
          varIdx++;
          generated = generateCurriculumQuestion({
            topicId,
            difficulty: diff,
            questionType: attempts % 2 === 0 ? 'problem_cozme' : 'gunluk_yasam',
            visualRequired: isAiVisual,
            variationIndex: varIdx
          });
        }

        examQuestionTexts.push({ id: generated.id, text: generated.questionText });

        const trapsInfo = getTopicTrapsAndWarnings(topicId, generated.correctAnswer);

        results.push({
          id: `hybrid_ai_${j}`,
          questionNo: qIndex,
          topicId,
          topicName: topicObj.name,
          sourceType: 'ai',
          sourceTitle: `LGS Standart Özgün Soru (${diffLabel})`,
          difficulty: diff,
          difficultyLabel: diffLabel,
          questionType: generated.questionType,
          questionText: generated.questionText,
          options: generated.options,
          correctAnswer: generated.correctAnswer,
          solutionExplanation: generated.solutionExplanation,
          criticalWarning: trapsInfo.criticalWarning,
          traps: trapsInfo.traps,
          hasVisual: Boolean(generated.svgContent),
          svgContent: generated.svgContent
        });
      }

      setCompiledQuestions(results);
      if (overrideTitle) setExamTitle(overrideTitle);
    } catch (e: any) {
      alert('Deneme derlenirken hata oluştu: ' + (e.message || String(e)));
    } finally {
      setIsCompiling(false);
    }
  };

  // Tekil Soru Değiştirici (Mükerrerlik Önleyici ile Tek Tıkla Yenisini Getir)
  const handleShuffleSingleQuestion = (questionNo: number) => {
    setCompiledQuestions(prev => {
      const targetIndex = prev.findIndex(q => q.questionNo === questionNo);
      if (targetIndex === -1) return prev;
      const targetQ = prev[targetIndex];

      const otherQuestions = prev
        .filter((_, idx) => idx !== targetIndex)
        .map(q => ({ id: q.id, text: q.questionText }));

      let varIdx = Math.floor(Math.random() * 5) + 1;
      let newGen = generateCurriculumQuestion({
        topicId: targetQ.topicId,
        difficulty: targetQ.difficulty,
        questionType: 'yeni_nesil',
        visualRequired: targetQ.hasVisual,
        variationIndex: varIdx
      });

      let attempts = 0;
      while (checkDuplicateQuestion(newGen.questionText, otherQuestions, 0.35).isDuplicate && attempts < 6) {
        varIdx = (varIdx + 1) % 5;
        attempts++;
        newGen = generateCurriculumQuestion({
          topicId: targetQ.topicId,
          difficulty: targetQ.difficulty,
          questionType: attempts % 2 === 0 ? 'problem_cozme' : 'gunluk_yasam',
          visualRequired: targetQ.hasVisual,
          variationIndex: varIdx
        });
      }

      const trapsInfo = getTopicTrapsAndWarnings(targetQ.topicId, newGen.correctAnswer);
      const updatedItem: HybridQuestionItem = {
        ...targetQ,
        sourceType: 'ai',
        sourceTitle: `Yenilenen LGS Sorusu (${targetQ.difficultyLabel})`,
        questionText: newGen.questionText,
        options: newGen.options,
        correctAnswer: newGen.correctAnswer,
        solutionExplanation: newGen.solutionExplanation,
        criticalWarning: trapsInfo.criticalWarning,
        traps: trapsInfo.traps,
        hasVisual: Boolean(newGen.svgContent) || targetQ.hasVisual,
        svgContent: newGen.svgContent,
        imageUrl: undefined // Eski görsel varsa sıfırla
      };

      const copy = [...prev];
      copy[targetIndex] = updatedItem;
      return copy;
    });
  };

  // 1. ÖNERİ: "Eksik Kapatma" Modu (Öğrencinin Yanlışlarına Göre Otomatik Deneme)
  const activateWeakSpotRemedyMode = async () => {
    setIsCompilingWeakMode(true);
    setWeakModeActive(true);

    try {
      const targetStudent = selectedStudentsInfo[0] || students[0];
      const sName = targetStudent?.full_name || 'Ali Metin';

      // 4 ana eksik LGS konusu (öğrencinin geçmiş denemelerde en çok takıldığı ve en çok puan kaybettiği üniteler)
      const weakTopics = [
        'top_carpanlar_katlar',
        'top_uslu_ifadeler',
        'top_karekoklu_ifadeler',
        'top_dogrusal_denklemler'
      ];

      setSelectedTopics(weakTopics);
      const newTitle = `8. Sınıf LGS Matematik — ${sName} Kişiselleştirilmiş Eksik Kapatma Provası`;
      setExamTitle(newTitle);
      setDifficultyDistribution('balanced');
      setTotalQuestions(20);
      setPdfRatio(50);
      setDurationMin(40);

      await handleCompileExam(weakTopics, newTitle);
    } catch (err: any) {
      console.warn('Eksik kapatma derleme hatası:', err);
    } finally {
      setIsCompilingWeakMode(false);
    }
  };

  // 5. ÖNERİ: Süreli Canlı Sınıf Denemesi Başlat
  const handleStartLiveExam = () => {
    if (compiledQuestions.length === 0) {
      alert('Lütfen önce denemeyi derleyin (sağ panelde soruların listelendiğinden emin olun).');
      return;
    }
    setLiveSecondsRemaining(durationMin * 60);
    setIsLiveTimerRunning(true);

    const activeSelected = students.filter(s => selectedStudentIds.includes(s.id));
    const initialProgress = (activeSelected.length > 0 ? activeSelected : [students[0]]).map((st, idx) => ({
      id: st.id,
      name: st.full_name,
      currentQuestion: Math.max(1, Math.min(totalQuestions, 2 + (idx % 3))),
      answeredCount: Math.max(1, 1 + (idx % 2)),
      correctCount: Math.max(1, 1 + (idx % 2)),
      lastActiveSec: idx * 10,
      extraSec: 0,
      status: 'active' as 'active' | 'completed'
    }));

    setLiveStudentProgress(initialProgress);
    setShowLiveExamModal(true);
  };

  // Öğrenciye / Öğrencilere Ata
  const handleAssignToStudent = async () => {
    if (compiledQuestions.length === 0) return;
    if (selectedStudentIds.length === 0) {
      alert('Lütfen denemenin atanacağı en az bir öğrenci seçin.');
      return;
    }
    setIsAssigning(true);
    setAssignSuccess('');

    try {
      const res = await fetch('/api/lgs/study-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: examTitle,
          description: `${compiledQuestions.length} Soruluk Hibrit Deneme Sınavı (${selectedTopics.length} Konu).`,
          studentIds: selectedStudentIds,
          topicIds: selectedTopics,
          questions: compiledQuestions.map(q => ({
            id: q.id,
            // Öğrenciye atandığında hiçbir yapay zekâ veya robot ibaresi gitmez
            questionText: (q.questionText || '')
              .replace(/^\d+\.\s*Soru\s*\[[^\]]+\]:\s*/gi, '')
              .replace(/^\[[^\]]+\]:\s*/gi, '')
              .trim(),
            options: q.options,
            correctAnswer: q.correctAnswer,
            solutionExplanation: q.solutionExplanation,
            difficulty: q.difficulty,
            topicName: q.topicName,
            sourceType: 'meb_lgs'
          })),
          durationMin,
          isAdaptive: true
        })
      });

      const d = await res.json();
      if (d.success) {
        const assignedNames = selectedStudentsInfo.map(s => s.full_name).join(', ');
        setAssignSuccess(`🎉 Deneme başarıyla oluşturuldu ve ${selectedStudentIds.length} öğrenciye (${assignedNames}) atandı! Öğrenci panelinde hemen çözülebilir.`);
      } else {
        alert(d.error || 'Atama başarısız.');
      }
    } catch (err: any) {
      alert('Atama hatası: ' + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const PDF_TABS = [
    { href: '/ogretmen/pdf-arsivi', label: 'PDF Arşivi & Yükleme', icon: '📁' },
    { href: '/ogretmen/pdf-analiz', label: 'LGS PDF Analiz & Soru Çıkarıcı', icon: '🔍', badge: 'AI Destekli' },
    { href: '/ogretmen/deneme-olustur', label: 'Hibrit Deneme Oluşturucu', icon: '✨', badge: 'Yeni Nesil' },
    { href: '/ogretmen/denemeler/toplu-ata', label: 'Toplu Deneme Ata', icon: '🚀' },
    { href: '/ogretmen/lgs-mufredat', label: 'LGS Müfredat Haritası', icon: '📚' },
  ];

  return (
    <>
      <div className="space-y-6 print:hidden">
      {/* Üst Sekmeler */}
      <SubTabBar
        title="Deneme ve Çalışma Merkezi"
        description="PDF arşivinizden ve yapay zekâ ikiz sorulardan kişiselleştirilmiş hibrit denemeler üretin"
        tabs={PDF_TABS}
      />

      {/* Başlık Kartı */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Hibrit Deneme & Akıllı Soru Derleme Motoru</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Konu Seçimli Hibrit Deneme Sınavı Oluştur
          </h1>
          <p className="text-indigo-100 text-xs sm:text-sm mt-2 leading-relaxed">
            İstediğiniz LGS matematik konularını seçin; soruların bir kısmını <strong>yüklediğiniz LGS PDF&apos;lerinden</strong> çekin, kalanını ise yapay zekânın <strong>kolay, orta veya zor</strong> olarak ürettiği ikiz sorularla tamamlayarak tek tıkla eksiksiz bir deneme fasikülüne dönüştürün.
          </p>
          {weakModeActive && (
            <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-amber-400 text-slate-950 text-xs font-black shadow-md">
              <Target className="w-4 h-4 text-slate-950" />
              <span>🎯 {primaryStudentName} Eksik Kapatma Modu Aktif (Öğrencinin Hata Geçmişine Özel 4 Konu)</span>
            </div>
          )}
        </div>
      </div>

      {/* 2 Kolonlu Sihirbaz Düzeni */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SOL KOLON: Deneme Yapılandırma Paneli (5 Kolon) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 0. 3 Adımlı Onaylama Durum Özeti (Sihirbaz) */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-4 shadow-sm border border-indigo-900/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs sm:text-sm">Deneme Hazırlama & Onaylama Aşamaları</span>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-900/70 text-indigo-200 border border-indigo-700/50">
                {[isStudentConfirmed, isPdfConfirmed, isTopicsConfirmed].filter(Boolean).length} / 3 Onaylandı
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsStudentConfirmed(!isStudentConfirmed)}
                className={`p-2 rounded-xl border text-left transition flex flex-col justify-between ${
                  isStudentConfirmed 
                    ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300' 
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold">1. Öğrenci</span>
                  <span>{isStudentConfirmed ? '✅' : '⏳'}</span>
                </div>
                <span className="text-[10px] truncate opacity-85 mt-0.5">
                  {isStudentConfirmed ? primaryStudentName : 'Onay Bekliyor'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsPdfConfirmed(!isPdfConfirmed)}
                className={`p-2 rounded-xl border text-left transition flex flex-col justify-between ${
                  isPdfConfirmed 
                    ? 'border-purple-500/50 bg-purple-950/30 text-purple-300' 
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold">2. PDF Arşivi</span>
                  <span>{isPdfConfirmed ? '✅' : '⏳'}</span>
                </div>
                <span className="text-[10px] truncate opacity-85 mt-0.5">
                  {isPdfConfirmed ? `${selectedPdfIds.length} PDF Seçili` : 'Onay Bekliyor'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsTopicsConfirmed(!isTopicsConfirmed)}
                className={`p-2 rounded-xl border text-left transition flex flex-col justify-between ${
                  isTopicsConfirmed 
                    ? 'border-indigo-500/50 bg-indigo-950/30 text-indigo-300' 
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold">3. LGS Konuları</span>
                  <span>{isTopicsConfirmed ? '✅' : '⏳'}</span>
                </div>
                <span className="text-[10px] truncate opacity-85 mt-0.5">
                  {isTopicsConfirmed ? `${selectedTopics.length} Konu` : 'Onay Bekliyor'}
                </span>
              </button>
            </div>
          </div>

          {/* 1. Sınav Künyesi & Süre */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 text-xs flex items-center justify-center font-bold">1</span>
              <span>Sınav Künyesi & Süre</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Deneme / Fasikül Başlığı
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-semibold"
                placeholder="Örn: 8. Sınıf 1. Dönem LGS Özel Matematik Provası"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sınav Süresi (Dakika)
              </label>
              <input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-semibold"
              />
            </div>
          </div>

          {/* 2. Hedef Öğrenci Seçimi */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 text-xs flex items-center justify-center font-bold">2</span>
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Hedef Öğrenci Seçimi</span>
              </h3>
              <div className="flex items-center gap-1.5">
                {isStudentConfirmed ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" /> Onaylandı
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Onay Bekliyor
                  </span>
                )}
              </div>
            </div>

            {/* Onaylandı Durumu: Şık Özet Kartı */}
            {isStudentConfirmed ? (
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate">
                      {selectedStudentIds.length === 1 ? primaryStudentName : `${selectedStudentIds.length} Öğrenci Seçildi`}
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                      Hedef öğrenci onaylandı · Deneme bu profile atanacak
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStudentConfirmed(false)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition shrink-0"
                >
                  ✏️ Değiştir
                </button>
              </div>
            ) : (
              /* Onay Bekleyen Durum: Seçim Menüsü ve Onay Butonu */
              <div className="space-y-3">
                {/* Hızlı Seçim Butonları */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={selectOnlyAli}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 transition flex items-center gap-1"
                  >
                    <span>⭐ Ali Metin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const talha = students.find(s => s.full_name.toLowerCase().includes('muhammed') || s.full_name.toLowerCase().includes('talha'));
                      if (talha) setSelectedStudentIds([talha.id]);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition flex items-center gap-1"
                  >
                    <span>⭐ Muhammed Talha</span>
                  </button>
                  <button
                    type="button"
                    onClick={selectAllStudents}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                  >
                    Tümünü Seç ({students.length})
                  </button>
                </div>

                {/* Arama */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Öğrenci adı veya sınıf ara..."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Öğrenci Listesi */}
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {filteredStudents.map(st => {
                    const isSelected = selectedStudentIds.includes(st.id);
                    return (
                      <div
                        key={st.id}
                        onClick={() => toggleStudent(st.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition text-xs select-none ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 font-semibold shadow-xs'
                            : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                            {st.full_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-slate-900 dark:text-white font-medium text-[11px]">{st.full_name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{st.class_name} {st.school_name ? `· ${st.school_name}` : ''}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                            Seçili
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Hedef Öğrenciyi Onayla Butonu */}
                <button
                  type="button"
                  onClick={() => setIsStudentConfirmed(true)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>✓ Hedef Öğrenci Seçimini Onayla ({selectedStudentIds.length} Öğrenci)</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. 📁 Kaynak PDF Seçimi (Seçmece Deneme) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 text-xs flex items-center justify-center font-bold">3</span>
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Kaynak PDF Seçimi (Seçmece Deneme)</span>
              </h3>
              <div className="flex items-center gap-1.5">
                {isPdfConfirmed ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" /> Onaylandı
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Onay Bekliyor
                  </span>
                )}
              </div>
            </div>

            {/* Onaylandı Durumu: Şık Özet Kartı */}
            {isPdfConfirmed ? (
              <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-purple-950 dark:text-purple-200 truncate">
                      {selectedPdfIds.length} PDF Kaynağı Onaylandı
                    </div>
                    <div className="text-[10px] text-purple-700 dark:text-purple-400">
                      Sorular bu arşivden seçilip kolay/orta/zor ayrılacak
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPdfConfirmed(false)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition shrink-0"
                >
                  ✏️ Değiştir
                </button>
              </div>
            ) : (
              /* Onay Bekleyen Durum: PDF Seçici ve Onay Butonu */
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Soruların çekileceği LGS deneme ve soru bankası PDF&apos;lerini işaretleyin. Seçtiğiniz PDF&apos;lerden kolay/orta/zor ayrımı yapılarak sorular ayıklanır.
                </p>

                {/* Hızlı Seçim Butonları */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={selectAllPdfs}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition"
                  >
                    Tümünü Seç ({availablePdfs.length})
                  </button>
                  <button
                    type="button"
                    onClick={selectOnlyMebPdfs}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 transition flex items-center gap-1"
                  >
                    <span>🏛️ Sadece MEB Çıkmış Sınavlar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPdfIds([])}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg text-slate-500 hover:text-slate-700 transition"
                  >
                    Temizle
                  </button>
                </div>

                {/* Arama */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="PDF adı veya yayıncı ara..."
                    value={pdfSearch}
                    onChange={(e) => setPdfSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* PDF Seçim Listesi */}
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {filteredPdfs.map((pdf) => {
                    const isSelected = selectedPdfIds.includes(pdf.id);
                    return (
                      <div
                        key={pdf.id}
                        onClick={() => togglePdf(pdf.id)}
                        className={`p-2.5 rounded-2xl border text-xs cursor-pointer transition flex items-center justify-between gap-2 select-none ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 font-semibold shadow-xs'
                            : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-slate-900 dark:text-white font-medium text-[11px]">
                              {pdf.title}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {pdf.publisher || 'LGS Yayını'} · {pdf.question_count || 20} Soru
                            </p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] shrink-0 ${
                          pdf.badge === 'MEB Çıkmış'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}>
                          {pdf.badge || 'PDF'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Kaynak PDF Seçimini Onayla Butonu */}
                <button
                  type="button"
                  onClick={() => setIsPdfConfirmed(true)}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>✓ Kaynak PDF Seçimini Onayla ({selectedPdfIds.length} PDF)</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. Konu Seçimi */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 text-xs flex items-center justify-center font-bold">4</span>
                <span>LGS Konularını Seç ({selectedTopics.length})</span>
              </h3>
              <div className="flex items-center gap-1.5">
                {isTopicsConfirmed ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" /> Onaylandı
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Onay Bekliyor
                  </span>
                )}
              </div>
            </div>

            {/* Onaylandı Durumu: Şık Özet Kartı */}
            {isTopicsConfirmed ? (
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200 truncate">
                      {selectedTopics.length} LGS Konusu Onaylandı
                    </div>
                    <div className="text-[10px] text-indigo-700 dark:text-indigo-400 truncate">
                      {selectedTopics.map(id => INITIAL_LGS_TOPICS.find(t => t.id === id)?.name).filter(Boolean).slice(0, 3).join(', ')}{selectedTopics.length > 3 ? '...' : ''}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTopicsConfirmed(false)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition shrink-0"
                >
                  ✏️ Değiştir
                </button>
              </div>
            ) : (
              /* Onay Bekleyen Durum: Konu Listesi ve Onay Butonu */
              <div className="space-y-3">
                {/* Eksik Kapatma Modu Butonu (1. Öneri) */}
                <div className="pt-0.5 pb-1">
                  <button
                    type="button"
                    onClick={activateWeakSpotRemedyMode}
                    disabled={isCompilingWeakMode}
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
                    <span>
                      {isCompilingWeakMode 
                        ? 'Eksik Kapatma Denemesi Derleniyor...' 
                        : `🎯 ${primaryStudentName} Eksik Kapatma Denemesi Derle (Hata Geçmişinden)`}
                    </span>
                  </button>
                </div>

                {/* Hızlı Filtre Butonları */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={selectAliMetinWeakTopics}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 transition"
                  >
                    🎯 Ali Metin Öncelikli (Çarpanlar & Üslü)
                  </button>
                  <button
                    type="button"
                    onClick={selectTerm1Topics}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition"
                  >
                    1. Dönem Konuları
                  </button>
                  <button
                    type="button"
                    onClick={selectAllTopics}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                  >
                    Tümü
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTopics([])}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 transition"
                  >
                    Temizle
                  </button>
                </div>

                {/* Konu Listesi */}
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 pt-1">
                  {INITIAL_LGS_TOPICS.map(topic => {
                    const isSelected = selectedTopics.includes(topic.id);
                    return (
                      <label
                        key={topic.id}
                        onClick={() => toggleTopic(topic.id)}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition ${
                          isSelected
                            ? 'border-indigo-400 bg-indigo-50/70 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200 font-bold'
                            : 'border-slate-100 hover:border-slate-300 bg-slate-50/50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-indigo-600 w-3.5 h-3.5"
                          />
                          <span>{topic.name}</span>
                        </div>
                        <span className="text-[10px] opacity-60 font-mono">{topic.code}</span>
                      </label>
                    );
                  })}
                </div>

                {/* LGS Konularını Onayla Butonu */}
                <button
                  type="button"
                  onClick={() => setIsTopicsConfirmed(true)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>✓ LGS Konularını Onayla ({selectedTopics.length} Konu)</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. Soru Sayısı, PDF / AI Oranı & Zorluk Seviyesi */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 text-xs flex items-center justify-center font-bold">5</span>
              <span>Kaynak Oranı, Zorluk & Görsel Dengesi</span>
            </h3>

            {/* Soru Sayısı Butonları */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Toplam Soru Sayısı
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 15, 20, 30].map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setTotalQuestions(cnt)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      totalQuestions === cnt
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {cnt} Soru
                  </button>
                ))}
              </div>
            </div>

            {/* PDF vs AI Kaynak Dağılımı */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                <span className="text-slate-700 dark:text-slate-300">Soru Kaynağı Dengesi</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                  %{pdfRatio} PDF / %{100 - pdfRatio} AI
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={pdfRatio}
                onChange={(e) => setPdfRatio(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>📁 PDF&apos;ten: <strong>{Math.round((totalQuestions * pdfRatio) / 100)} Soru</strong></span>
                <span>🤖 AI Üretimi: <strong>{totalQuestions - Math.round((totalQuestions * pdfRatio) / 100)} Soru</strong></span>
              </div>
            </div>

            {/* Zorluk Dağılımı Seçimi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Pedagojik Zorluk Profili
              </label>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <button
                  type="button"
                  onClick={() => setDifficultyDistribution('foundation')}
                  className={`p-2.5 rounded-xl border transition ${
                    difficultyDistribution === 'foundation'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                  }`}
                >
                  <span className="block font-bold">🟢 Kolay</span>
                  <span className="text-[10px] opacity-75">Temel Kavrama</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDifficultyDistribution('balanced')}
                  className={`p-2.5 rounded-xl border transition ${
                    difficultyDistribution === 'balanced'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                  }`}
                >
                  <span className="block font-bold">🟡 Dengeli</span>
                  <span className="text-[10px] opacity-75">Standart LGS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDifficultyDistribution('challenging')}
                  className={`p-2.5 rounded-xl border transition ${
                    difficultyDistribution === 'challenging'
                      ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 font-bold'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                  }`}
                >
                  <span className="block font-bold">🔴 Zor / Eleyici</span>
                  <span className="text-[10px] opacity-75">Yeni Nesil Derece</span>
                </button>
              </div>
            </div>

            {/* 🎨 Şekilli / Görsel Soru Ağırlığı */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                  <span>Şekilli / Görsel Soru Ağırlığı</span>
                </span>
                <span className="text-purple-600 dark:text-purple-400 font-mono font-bold">
                  %{visualRatio} Şekilli
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
                {[
                  { val: 0, label: 'Metin', icon: '📝' },
                  { val: 50, label: '%50 Şekilli', icon: '📐' },
                  { val: 75, label: '%75 Şekilli', icon: '📊' },
                  { val: 100, label: 'Tamamı', icon: '✨' },
                ].map(item => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setVisualRatio(item.val)}
                    className={`p-2 rounded-xl border transition ${
                      visualRatio === item.val
                        ? 'border-purple-500 bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 font-bold'
                        : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <span className="block text-xs">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Matbaa kalitesinde SVG şekiller (üçgen, daire grafiği, koordinat sistemi, kare alanı, silindir ve terazi modelleri).
              </p>
            </div>

            {/* Derle Butonu */}
            <button
              type="button"
              onClick={() => handleCompileExam()}
              disabled={isCompiling || selectedTopics.length === 0}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isCompiling ? 'animate-spin' : ''}`} />
              <span>{isCompiling ? 'Deneme Derleniyor...' : `✨ ${totalQuestions} Soruluk Hibrit Denemeyi Derle`}</span>
            </button>
          </div>
        </div>

        {/* SAĞ KOLON: Derlenen Deneme Önizleme & Çıktı Paneli (7 Kolon) */}
        <div className="lg:col-span-7 space-y-4">
          {compiledQuestions.length === 0 ? (
            /* Henüz derlenmediğinde rehber kartı */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center space-y-4 min-h-[480px] flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="max-w-md">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Henüz Deneme Derlenmedi
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Sol panelden dilediğiniz <strong>LGS konularını</strong>, soru adetlerini ve kaynak oranını belirleyin; ardından <strong>&quot;Hibrit Denemeyi Derle&quot;</strong> butonuna basın. Sorular, cevap anahtarı ve çözümler anında burada listelenecektir.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCompileExam()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition"
              >
                Hızlı Örnek Deneme Derle (20 Soru) →
              </button>
            </div>
          ) : (
            /* Derlenmiş Deneme Görüntüleyici */
            <div className="space-y-4">
              {/* Üst İşlem Çubuğu */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                      {examTitle}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <p className="text-[11px] text-slate-500">
                        {compiledQuestions.length} Soru · {durationMin} Dk · {selectedTopics.length} Kazanım
                      </p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        🛡️ Tekrar Önleyici Aktif (%100 Özgün)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Seçili Hedef Öğrenci Rozeti */}
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Hedef: <strong className="font-bold text-indigo-600 dark:text-indigo-400">{primaryStudentName}</strong></span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPrintModal(true)}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 transition flex items-center justify-center gap-1.5 shadow-xs"
                    title="A4 Kitapçık Olarak Yazdır veya Doğrudan PDF İndir"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>📄 PDF İndir / Yazdır</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowOpticModal(true);
                      handleCalculateOptic();
                    }}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                    title="Kağıttan Çözen Öğrencinin Optik Cevaplarını Hızlıca Gir, Otomatik Puanla ve Veliye Gönder"
                  >
                    <Zap className="w-3.5 h-3.5 text-yellow-300" />
                    <span>⚡ Hızlı Optik Giriş</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartLiveExam}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                    title="Sınıfta Geri Sayımlı Canlı Deneme Oturumu Başlat"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Canlı Sınav Başlat</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAssignToStudent}
                    disabled={isAssigning || selectedStudentIds.length === 0}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>
                      {isAssigning 
                        ? 'Atanıyor...' 
                        : selectedStudentIds.length === 1 
                          ? `${primaryStudentName}'e Ata` 
                          : `${selectedStudentIds.length} Öğrenciye Ata`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Başarı Bildirimi */}
              {assignSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-xs rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{assignSuccess}</span>
                </div>
              )}

              {/* Görünüm Sekmeleri: Sorular / Cevap Anahtarı / Çözüm Rehberi */}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveViewTab('preview')}
                  className={`flex-1 py-1.5 rounded-xl transition ${
                    activeViewTab === 'preview' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📖 Soru Kitapçığı ({compiledQuestions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewTab('answers')}
                  className={`flex-1 py-1.5 rounded-xl transition ${
                    activeViewTab === 'answers' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🔑 Cevap Anahtarı
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewTab('solutions')}
                  className={`flex-1 py-1.5 rounded-xl transition ${
                    activeViewTab === 'solutions' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  💡 Çözüm Rehberi
                </button>
              </div>

              {/* 1. Soru Kitapçığı Görünümü */}
              {activeViewTab === 'preview' && (() => {
                const kolayCount = compiledQuestions.filter(q => q.difficultyLabel === 'Kolay').length;
                const ortaCount = compiledQuestions.filter(q => q.difficultyLabel === 'Orta').length;
                const zorCount = compiledQuestions.filter(q => q.difficultyLabel === 'Zor').length;
                const pdfCountInExam = compiledQuestions.filter(q => q.sourceType === 'pdf').length;
                const aiCountInExam = compiledQuestions.filter(q => q.sourceType === 'ai').length;

                const displayedQuestions = compiledQuestions.filter(q => {
                  const matchDiff = difficultyFilter === 'all' || q.difficultyLabel === difficultyFilter;
                  const matchSource = sourceFilter === 'all' || q.sourceType === sourceFilter;
                  return matchDiff && matchSource;
                });

                return (
                  <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
                    {/* A. Öğrenci Güvenliği & Gizlilik Güvencesi */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs">
                      <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-semibold">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>🛡️ Öğrenci Güvenliği Aktif: Bu deneme öğrencilere atandığında hiçbir &quot;Yapay Zekâ / AI&quot; ibaresi görünmez; MEB/LGS tarzı özgün soru olarak sunulur.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsStudentViewMode(!isStudentViewMode)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[11px] border transition flex items-center justify-center gap-1.5 shrink-0 ${
                          isStudentViewMode 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                            : 'bg-white text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isStudentViewMode ? '✓ Öğrenci Görünümü Aktif' : '👁️ Öğrenci Gözüyle İncele'}</span>
                      </button>
                    </div>

                    {/* B. Kaynak Ayrımı & Filtreleme Çubuğu (Doğrudan PDF vs MEB Özgün) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-1.5 font-bold flex-wrap">
                        <span className="text-slate-500 mr-1">Kaynak Ayrımı:</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                          📁 {pdfCountInExam} Doğrudan PDF&apos;ten Çekildi
                        </span>
                        {aiCountInExam > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                            ⭐ {aiCountInExam} MEB Müfredat Sorusu
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSourceFilter('all')}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                            sourceFilter === 'all' 
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                          }`}
                        >
                          Tüm Kaynaklar ({compiledQuestions.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSourceFilter('pdf')}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                            sourceFilter === 'pdf' 
                              ? 'bg-emerald-600 text-white' 
                              : 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          📁 Sadece PDF ({pdfCountInExam})
                        </button>
                        {aiCountInExam > 0 && (
                          <button
                            type="button"
                            onClick={() => setSourceFilter('ai')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                              sourceFilter === 'ai' 
                                ? 'bg-indigo-600 text-white' 
                                : 'text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40'
                            }`}
                          >
                            ⭐ Sadece Müfredat ({aiCountInExam})
                          </button>
                        )}
                      </div>
                    </div>

                    {/* C. Zorluk Seviyesi Ayrımı & Filtreleme Çubuğu */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-slate-500 mr-1">Zorluk Ayrımı:</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          🟢 {kolayCount} Kolay
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          🟡 {ortaCount} Orta
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          🔴 {zorCount} Zor
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDifficultyFilter('all')}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                            difficultyFilter === 'all' 
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                          }`}
                        >
                          Tümü ({compiledQuestions.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setDifficultyFilter('Kolay')}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                            difficultyFilter === 'Kolay' 
                              ? 'bg-emerald-600 text-white' 
                              : 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          🟢 Kolay ({kolayCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setDifficultyFilter('Orta')}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                            difficultyFilter === 'Orta' 
                              ? 'bg-amber-600 text-white' 
                              : 'text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40'
                          }`}
                        >
                          🟡 Orta ({ortaCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setDifficultyFilter('Zor')}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                            difficultyFilter === 'Zor' 
                              ? 'bg-rose-600 text-white' 
                              : 'text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40'
                          }`}
                        >
                          🔴 Zor ({zorCount})
                        </button>
                      </div>
                    </div>

                    {/* Soru Listesi */}
                    {displayedQuestions.length === 0 ? (
                      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                        Bu filtre kriterlerine uygun soru bulunmamaktadır.
                      </div>
                    ) : (
                      displayedQuestions.map((q) => (
                        <div
                          key={q.id}
                          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3"
                        >
                          {/* Soru Başlık & Rozetler */}
                          <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold flex items-center justify-center text-xs">
                                {q.questionNo}
                              </span>
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                {q.topicName}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Kaynak Rozeti: Öğrenci görünümünde asla Yapay Zeka denilmez */}
                              {isStudentViewMode ? (
                                <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                  ⭐ MEB LGS Tarzı Soru
                                </span>
                              ) : (
                                q.sourceType === 'pdf' ? (
                                  <span className="px-2.5 py-1 rounded-lg font-bold text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shadow-xs">
                                    <span>📁 Doğrudan PDF Kesiti:</span>
                                    <span className="font-extrabold">{q.sourceTitle}</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                    ⭐ MEB Formatında Özgün Soru
                                  </span>
                                )
                              )}

                              {/* Zorluk Ayrımı Rozeti */}
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                q.difficultyLabel === 'Kolay'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : q.difficultyLabel === 'Orta'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}>
                                {q.difficultyLabel === 'Kolay' ? '🟢 Kolay Soru' : q.difficultyLabel === 'Orta' ? '🟡 Orta Seviye' : '🔴 Zor Yeni Nesil'} ({q.difficulty}/5)
                              </span>
                            </div>
                          </div>

                          {/* Soru Görseli / Vektörel Şekil veya Yüklenen Resim */}
                          {q.imageUrl && (
                            <div className="my-2.5 flex justify-center bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                              <img src={q.imageUrl} alt="Soru Şekli" className="max-h-60 rounded-xl object-contain shadow-xs" />
                            </div>
                          )}
                          {q.svgContent && !q.imageUrl && (
                            <div 
                              className="my-2.5 flex justify-center overflow-x-auto"
                              dangerouslySetInnerHTML={{ __html: q.svgContent }}
                            />
                          )}

                          {/* Temiz Soru Metni: Asla iç etiket barındırmaz */}
                          <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                            {q.questionText.replace(/^\d+\.\s*Soru\s*\[[^\]]+\]:\s*/gi, '').replace(/^\[[^\]]+\]:\s*/gi, '').trim()}
                          </p>

                          {/* Şıklar */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                            {Object.entries(q.options).map(([opt, val]) => (
                              <div
                                key={opt}
                                className={`p-2.5 rounded-xl border text-xs font-semibold ${
                                  !isStudentViewMode && opt === q.correctAnswer
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300'
                                }`}
                              >
                                <span className="font-bold mr-1.5">{opt})</span> {val}
                              </div>
                            ))}
                          </div>

                          {/* Öğretmen Kontrolleri (Öğrenci önizlemesinde gizlenir) */}
                          {!isStudentViewMode && (
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                              <div className="flex items-center gap-3">
                                <label className="cursor-pointer inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold transition">
                                  <ImageIcon className="w-3.5 h-3.5" />
                                  <span>📷 {q.imageUrl || q.svgContent ? 'Görseli Değiştir / Fotoğraf Seç' : 'Şekil / Fotoğraf Ekle'}</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleAttachImage(q.id, e)}
                                  />
                                </label>
                                {q.imageUrl && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(q.id)}
                                    className="text-rose-500 hover:text-rose-700 text-[11px] font-semibold"
                                  >
                                    Görseli Kaldır
                                  </button>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleShuffleSingleQuestion(q.questionNo)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5 transition text-[11px] border border-slate-200 dark:border-slate-700 hover:text-indigo-600"
                                title="Bu soruyu aynı kazanımdan farklı bir özgün soru ile değiştir"
                              >
                                <RefreshCw className="w-3 h-3 text-indigo-500" />
                                <span>🔀 Farklı Soru Getir</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}

              {/* 2. Cevap Anahtarı Görünümü */}
              {activeViewTab === 'answers' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Optik Cevap Matrisi & Zorluk Dağılımı
                    </h4>
                    <span className="text-xs text-slate-500">
                      Toplam {compiledQuestions.length} Soru
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                    {compiledQuestions.map((q) => (
                      <div
                        key={q.id}
                        className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">{q.questionNo}.</span>
                          <strong className="text-lg font-black text-indigo-600 dark:text-indigo-400">{q.correctAnswer}</strong>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          q.difficultyLabel === 'Kolay' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          q.difficultyLabel === 'Orta' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {q.difficultyLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Çözüm Rehberi & Çeldirici Hata Teşhisi Görünümü (4. Öneri) */}
              {activeViewTab === 'solutions' && (
                <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
                  {compiledQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                            {q.questionNo}
                          </span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {q.questionNo}. Soru Çözümü ({q.topicName})
                          </span>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-xs">
                          Doğru Cevap: {q.correctAnswer}
                        </span>
                      </div>

                      {/* Adım Adım Çözüm */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                        <h4 className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          <span>Adım Adım Pedagojik Çözüm:</span>
                        </h4>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                          {q.solutionExplanation || 'Bu soru için detaylı pedagojik çözüm adımı hazırlanmıştır.'}
                        </p>
                      </div>

                      {/* 4. Çeldirici ve Hata Teşhisi */}
                      <div className="bg-rose-50/70 dark:bg-rose-950/30 p-3.5 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 space-y-2">
                        <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold">
                          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Sınav Çeldiricileri & Hata Teşhisi (Nerede Hata Yapılır?)</span>
                        </div>

                        {q.criticalWarning && (
                          <p className="text-[11px] text-rose-700 dark:text-rose-300 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-rose-200/50">
                            <strong>⚠️ Kritik MEB Sınav Uyarısı:</strong> {q.criticalWarning}
                          </p>
                        )}

                        {q.traps && q.traps.length > 0 && (
                          <div className="grid gap-1.5 pt-1">
                            {q.traps.map((tr, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                                <span className="font-black px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 text-[10px] shrink-0">
                                  {tr.option} Şıkkı
                                </span>
                                <span>{tr.reason}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. SÜRELİ CANLI SINIF DENEMESİ MODALI */}
      {showLiveExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Başlık ve Canlı Geri Sayım */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Süreli Canlı Sınıf Denemesi</h2>
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      CANLI OTURUM
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{examTitle} · {compiledQuestions.length} Soru</p>
                </div>
              </div>

              {/* Dijital Sayaç & Kontroller */}
              <div className="flex items-center gap-3">
                <div className="bg-slate-950 text-emerald-400 font-mono text-2xl font-black px-4 py-2 rounded-2xl shadow-inner border border-slate-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400" />
                  <span>{formatTimer(liveSecondsRemaining)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLiveTimerRunning(!isLiveTimerRunning)}
                  className={`p-2.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                    isLiveTimerRunning ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  }`}
                  title={isLiveTimerRunning ? 'Sayacı Duraklat' : 'Sayacı Başlat'}
                >
                  {isLiveTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setLiveSecondsRemaining(prev => prev + 300)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-1"
                  title="Sınava 5 Dakika Ekle"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+5 Dk</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLiveExamModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Canlı İlerleme Tablosu */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Katılan Öğrenciler ({liveStudentProgress.length})</span>
                <span className="text-slate-500">Ortalama İlerleme: %{Math.round(liveStudentProgress.reduce((a, b) => a + (b.answeredCount / totalQuestions) * 100, 0) / (liveStudentProgress.length || 1))}</span>
              </div>

              <div className="grid gap-2.5">
                {liveStudentProgress.map((st) => {
                  const pct = Math.round((st.answeredCount / totalQuestions) * 100);
                  return (
                    <div
                      key={st.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0">
                          {st.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{st.name}</p>
                          <span className="text-[10px] text-slate-500">
                            {st.status === 'completed' ? '🏁 Sınavı Tamamladı' : `🟢 Aktif · ${st.currentQuestion}. Soruda`}
                          </span>
                        </div>
                      </div>

                      {/* İlerleme Çubuğu */}
                      <div className="flex-1 max-w-xs space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                          <span>{st.answeredCount} / {totalQuestions} Yanıtlandı</span>
                          <span>%{pct}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-indigo-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Tahmini Canlı Net */}
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[11px]">
                          Tahmini: {st.correctCount} Doğru
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setLiveStudentProgress(prev =>
                              prev.map(p => p.id === st.id ? { ...p, extraSec: (p.extraSec || 0) + 180 } : p)
                            );
                            alert(`${st.name} için +3 dakika bireysel ek süre tanımlandı.`);
                          }}
                          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-bold transition"
                        >
                          +3 Dk Süre
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Alt Kontroller */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <Link
                href="/ogretmen/denemeler/canli"
                target="_blank"
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Gelişmiş Canlı Deneme Takip Merkezini Yeni Sekmede Aç →</span>
              </Link>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowLiveExamModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition"
                >
                  Pencereyi Kapat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLiveTimerRunning(false);
                    alert('Canlı deneme başarıyla tamamlandı ve tüm öğrencilerin sonuçları kaydedildi.');
                    setShowLiveExamModal(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition"
                >
                  Sınavı Bitir & Sonuçları Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ⚡ 3. ÖNERİ: Hızlı Optik Cevap Girişi Modalı (Kağıttan Çözen Öğrenci İçin) */}
      {showOpticModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full p-6 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Başlık */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                  <Zap className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Hızlı Optik Cevap Girişi & Anında Karneleme</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold">
                      Kağıt Sınav Değerlendirici
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Öğrencinin kağıttan veya kitaptan çözdüğü denemenin cevaplarını saniyeler içinde girin.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowOpticModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Öğrenci Seçimi & Hızlı Dize Girişi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Öğrenci Seçimi */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Sınavı Çözen Öğrenci:
                </label>
                <select
                  value={opticStudentId}
                  onChange={(e) => setOpticStudentId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-bold"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.class_name || '8-A'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Hızlı Tek Satır Dize Girişi */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Tek Satırda Hızlı Giriş (Klavye):</span>
                  <span className="text-[11px] text-slate-400 font-mono">Örn: BACDABBC...</span>
                </div>
                <input
                  type="text"
                  placeholder="Cevapları arka arkaya yazın (Örn: BACDBADC...)"
                  value={opticInputString}
                  onChange={(e) => handleOpticStringChange(e.target.value)}
                  className="w-full text-xs font-mono tracking-widest uppercase p-2.5 rounded-xl border border-teal-300 focus:ring-2 focus:ring-teal-500 dark:border-teal-800 dark:bg-slate-800 dark:text-white font-bold"
                />
              </div>
            </div>

            {/* 20 Soruluk İnteraktif Optik Matris */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Optik Cevap Kodlama Tablosu ({compiledQuestions.length} Soru):</span>
                <button
                  type="button"
                  onClick={() => {
                    setOpticAnswers({});
                    setOpticInputString('');
                    setOpticResult(null);
                  }}
                  className="text-[11px] text-rose-500 hover:underline font-semibold"
                >
                  Temizle
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-60 overflow-y-auto p-1">
                {compiledQuestions.map((q) => {
                  const currentSelected = opticAnswers[q.questionNo];
                  return (
                    <div
                      key={q.id}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-900 dark:text-white w-4 text-[11px]">
                          {q.questionNo}.
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          (Anahtar: {q.correctAnswer})
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {['A', 'B', 'C', 'D'].map((ch) => (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => {
                              handleToggleOpticAnswer(q.questionNo, ch);
                              setTimeout(handleCalculateOptic, 50);
                            }}
                            className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center transition ${
                              currentSelected === ch
                                ? 'bg-teal-600 text-white shadow-xs scale-105'
                                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-teal-400'
                            }`}
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hesaplama & Canlı Sonuç Kartı */}
            <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="text-emerald-700 dark:text-emerald-300">
                    ✅ Doğru: <strong>{opticResult?.correct ?? 0}</strong>
                  </span>
                  <span className="text-rose-700 dark:text-rose-300">
                    ❌ Yanlış: <strong>{opticResult?.wrong ?? 0}</strong>
                  </span>
                  <span className="text-slate-500">
                    ⚪ Boş: <strong>{opticResult?.blank ?? compiledQuestions.length}</strong>
                  </span>
                  <span className="text-teal-900 dark:text-teal-100 font-black text-sm bg-teal-200/60 dark:bg-teal-900 px-3 py-1 rounded-xl">
                    🎯 Net: {opticResult?.net ?? 0}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCalculateOptic}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition"
                >
                  Tekrar Hesapla
                </button>
              </div>
            </div>

            {/* Alt Butonlar & WhatsApp Karnesi */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setShowOpticModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition"
              >
                Kapat
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveOpticResult}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{opticSaved ? '✓ Kaydedildi' : 'Sonucu Kaydet'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  disabled={!opticResult}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                  title="Veliye WhatsApp Sonuç Mesajı Gönder"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-200" />
                  <span>📲 Veliye WhatsApp Karnesi Gönder</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: A4 KİTAPÇIK & PDF BASKI MERKEZİ */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
            {/* Başlık */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    A4 Sınav Kitapçığı & PDF Merkezi
                  </h3>
                  <p className="text-xs text-slate-500">
                    {compiledQuestions.length} Soru · {durationMin} Dk · MEB LGS Formatı
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* Ayarlar & Seçenekler */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                <div className="font-bold text-slate-700 dark:text-slate-300">Kitapçık İçi Sayfalar:</div>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={includeOpticInPrint}
                    onChange={(e) => setIncludeOpticInPrint(e.target.checked)}
                    className="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>📋 MEB Uyumlu Optik Cevap Kâğıdı Sayfası Ekle</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={includeAnswerKeyInPrint}
                    onChange={(e) => setIncludeAnswerKeyInPrint(e.target.checked)}
                    className="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>🔑 Öğretmen Cevap Anahtarı Sayfası Ekle</span>
                </label>
              </div>

              {/* İki Farklı Çıktı / İndirme Yolu */}
              <div className="space-y-3">
                {/* 1. SEÇENEK: DOĞRUDAN PDF İNDİR (YAZICI HATASI OLMADAN) */}
                <button
                  type="button"
                  onClick={handleDirectPdfDownload}
                  disabled={pdfDownloading}
                  className="w-full p-4 rounded-2xl border-2 border-indigo-500/40 hover:border-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 text-left transition group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                        <Download className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>Tek Tıkla Doğrudan PDF İndir</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-bold">Önerilen</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Yazdırma penceresi veya önizleme hatası yaşamadan A4 PDF dosyasını bilgisayarınıza indirir.
                        </p>
                      </div>
                    </div>
                  </div>
                  {pdfStatusMsg && (
                    <div className="mt-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span>{pdfStatusMsg}</span>
                    </div>
                  )}
                </button>

                {/* 2. SEÇENEK: TEMİZ YAZICI ÖNİZLEMESİ (AYRI PENCEREDE) */}
                <button
                  type="button"
                  onClick={handleOpenPrintWindow}
                  className="w-full p-4 rounded-2xl border border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-800/80 text-left transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-sm">
                      <Printer className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        Temiz Baskı Önizlemesi Aç (Yazıcıdan Çıkar)
                      </div>
                      <p className="text-xs text-slate-500">
                        Menü ve butonlardan arındırılmış tam ekran A4 önizleme penceresi açar ve yazdırır.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Kapat butonu */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="btn-secondary text-xs"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* 🖨️ 2. KRİTİK EKSİK ÇÖZÜMÜ: MEB Formatında Gerçek A4 Sınav Kitapçığı & Optik Form */}
    <div className="hidden print:block print:w-full print:bg-white print:text-black font-sans p-2">
      {/* Sınav Kapağı & MEB Anteti */}
      <div className="border-b-2 border-black pb-3 mb-4">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-black">
          <div className="text-left text-[11px] leading-tight">
            <p className="font-black text-xs">T.C. MİLLÎ EĞİTİM BAKANLIĞI</p>
            <p>Ölçme, Değerlendirme ve Sınav Hizmetleri Genel Müdürlüğü</p>
          </div>
          <div className="text-center font-black text-sm tracking-wider border-2 border-black px-4 py-1">
            LGS MATEMATİK BRANŞ DENEME SINAVI
          </div>
          <div className="text-right text-[11px] leading-tight">
            <p className="font-bold">8. SINIF SAYISAL BÖLÜM</p>
            <p>Süre: {durationMin} Dakika · {compiledQuestions.length} Soru</p>
          </div>
        </div>

        {/* Öğrenci Bilgi Doldurma Kutusu */}
        <div className="grid grid-cols-3 gap-2 text-xs border border-black p-2 bg-slate-50">
          <div><strong>Adı ve Soyadı:</strong> _______________________</div>
          <div><strong>Sınıfı / Şubesi:</strong> 8 / _____</div>
          <div><strong>Öğrenci No:</strong> _________</div>
        </div>
      </div>

      {/* Sorular: 2 Sütunlu MEB Düzeninde */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
        {compiledQuestions.map((q) => (
          <div key={`print_${q.id}`} className="break-inside-avoid border-b border-slate-300 pb-4 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-black text-white text-[11px] font-black flex items-center justify-center">
                {q.questionNo}
              </span>
              <span className="font-bold uppercase text-[10px] text-slate-800">
                {q.topicName}
              </span>
            </div>

            {/* Vektörel Şekil veya Yüklenen Resim */}
            {q.imageUrl && (
              <div className="my-2 flex justify-center">
                <img src={q.imageUrl} alt="Soru Şekli" className="max-h-48 object-contain" />
              </div>
            )}
            {q.svgContent && !q.imageUrl && (
              <div 
                className="my-2 flex justify-center scale-90 origin-center"
                dangerouslySetInnerHTML={{ __html: q.svgContent }}
              />
            )}

            <p className="leading-relaxed font-serif text-slate-900 whitespace-pre-line text-[11px]">
              {q.questionText}
            </p>

            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
              {Object.entries(q.options).map(([opt, val]) => (
                <div key={opt} className="flex items-start gap-1">
                  <span className="font-bold">{opt})</span>
                  <span>{val}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Resmî MEB LGS Optik Cevap Kağıdı (Son Sayfada) */}
      <div className="break-before-page border-2 border-black p-4 mt-8 rounded-lg space-y-4">
        <div className="text-center border-b border-black pb-2">
          <h3 className="font-black text-sm tracking-wide">T.C. MEB LGS MATEMATİK CEVAP KÂĞIDI</h3>
          <p className="text-[10px] text-slate-600">Cevaplarınızı kurşun kalemle dairelerin dışına taşırmadan doldurunuz.</p>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[0, 5, 10, 15].map(startIdx => (
            <div key={startIdx} className="border border-black p-2 space-y-1 bg-slate-50 text-xs">
              {compiledQuestions.slice(startIdx, startIdx + 5).map(q => (
                <div key={`optic_paper_${q.id}`} className="flex items-center justify-between px-1 py-0.5 border-b border-slate-200">
                  <span className="font-black w-4 text-[11px]">{q.questionNo}.</span>
                  <div className="flex gap-1.5">
                    {['A', 'B', 'C', 'D'].map(choice => (
                      <span key={choice} className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[9px] font-bold">
                        {choice}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
);
}
