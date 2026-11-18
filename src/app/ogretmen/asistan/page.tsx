'use client';

import { useState } from 'react';
import { Sparkles, Send, Bot, User, CheckCircle, ArrowRight, ShieldCheck, Database, Lightbulb } from 'lucide-react';

interface ProposedAction {
  actionType: 'create_study_plan' | 'assign_homework' | 'schedule_lesson' | 'send_parent_note';
  title: string;
  studentId?: string;
  topicId?: string;
  payload: any;
}

interface AssistantResponse {
  query: string;
  directAnswer: string;
  supportingData: any[];
  proposedActions?: ProposedAction[];
}

export default function AsistanPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AssistantResponse[]>([
    {
      query: 'Merhaba, bana bu haftaki kritik öğrenci ihtiyaçlarını özetler misin?',
      directAnswer: 'Merhaba Öğretmenim! Veritabanındaki son deneme sonuçları, aralıklı tekrar sıklıkları ve ödev teslimlerine dayanarak yaptığım analizler hazır. Özellikle Çarpanlar ve Katlar EBOB-EKOK konusunda 2 öğrencimizin acil desteğe ihtiyacı bulunmaktadır. Aşağıdaki hızlı sorulardan birini seçebilir veya dilediğiniz soruyu sorabilirsiniz.',
      supportingData: [
        { metric: 'Aktif Öğrenci', value: '3' },
        { metric: 'Kritik Konu', value: 'Çarpanlar ve Katlar' },
        { metric: 'Geciken Tekrar', value: '3 Soru' }
      ]
    }
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [approvingIndex, setApprovingIndex] = useState<number | null>(null);

  const quickPrompts = [
    'Bu hafta hangi öğrencilerimle özellikle Çarpanlar ve Katlar çalışmalıyım?',
    'Son denemelerde matematik neti düşen öğrenciler kimler?',
    'Hangi öğrenciler aralıklı tekrar çalışması yapmamış?',
    'Ödevlerini tamamlamayan veya aksatan öğrenciler hangileri?'
  ];

  const handleAsk = async (textToSend?: string) => {
    const text = textToSend || query;
    if (!text.trim() || loading) return;

    setLoading(true);
    setQuery('');

    try {
      const res = await fetch('/api/teacher/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text })
      });

      if (res.ok) {
        const data = await res.json();
        setHistory(prev => [...prev, data.insight]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAction = async (action: ProposedAction, index: number) => {
    setApprovingIndex(index);
    try {
      const res = await fetch('/api/teacher/assistant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action)
      });

      if (res.ok) {
        const data = await res.json();
        setToastMessage(`✓ ${data.message || 'İşlem öğretmen onayınızla başarıyla gerçekleştirildi!'}`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setApprovingIndex(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-indigo-600" />
            Matematik Akademi Asistanı
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Yetkili olduğunuz gerçek öğrenci verilerine dayalı yapay zekâ destekli analiz ve öneri sistemi.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Öğretmen Onaylı Güvenli Yetkilendirme</span>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-sm font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* Hızlı Soru Çipleri */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          Örnek Analiz Soruları:
        </span>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(p)}
              disabled={loading}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-200 transition-all text-left shadow-2xs"
            >
              💬 {p}
            </button>
          ))}
        </div>
      </div>

      {/* Mesaj ve Yanıt Akışı */}
      <div className="space-y-4">
        {history.map((item, idx) => (
          <div key={idx} className="space-y-3">
            {/* Kullanıcı Sorusu */}
            <div className="flex items-start gap-3 justify-end">
              <div className="card bg-indigo-600 text-white max-w-lg p-3.5 rounded-2xl rounded-tr-none text-sm font-semibold shadow-sm">
                {item.query}
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
            </div>

            {/* Asistan Yanıtı */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>

              <div className="card max-w-2xl p-4 rounded-2xl rounded-tl-none border-l-4 border-l-indigo-600 space-y-3 shadow-sm bg-white dark:bg-slate-900">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  <Database className="w-3.5 h-3.5" />
                  Gerçek Veri Analizi
                </div>

                <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-medium">
                  {item.directAnswer}
                </p>

                {/* Destekleyici Kanıt Verileri */}
                {item.supportingData && item.supportingData.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border text-xs space-y-1.5">
                    <span className="font-bold text-slate-500 uppercase block mb-1">Veritabanı Kanıtları:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {item.supportingData.map((d: any, dIdx: number) => (
                        <div key={dIdx} className="p-2 rounded bg-white dark:bg-slate-900 border text-slate-700 dark:text-slate-300">
                          {d.student_name && <div>Öğrenci: <strong>{d.student_name}</strong></div>}
                          {d.mastery_score !== undefined && <div>Konu Başarısı: <strong>%{d.mastery_score}</strong></div>}
                          {d.net_score !== undefined && <div>Net: <strong>{d.net_score}</strong> ({d.exam_title || 'Deneme'})</div>}
                          {d.pending_review_count !== undefined && <div>Bekleyen Tekrar: <strong>{d.pending_review_count} soru</strong></div>}
                          {d.metric && <div>{d.metric}: <strong>{d.value}</strong></div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Önerilen Eylemler (Açık Öğretmen Onayı Gerektiren) */}
                {item.proposedActions && item.proposedActions.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block">
                      ⚡ Asistanın Önerdiği Eylemler (Uygulamak için onaylayın):
                    </span>

                    <div className="space-y-2">
                      {item.proposedActions.map((action, aIdx) => (
                        <div key={aIdx} className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">{action.title}</h4>
                            <p className="text-[11px] text-slate-500">
                              Bu eylem öğrencinin çalışma planına eklenecektir; onayınız olmadan yayınlanmaz.
                            </p>
                          </div>

                          <button
                            onClick={() => handleApproveAction(action, aIdx)}
                            disabled={approvingIndex === aIdx}
                            className="btn-primary text-xs py-1.5 px-3 self-end sm:self-auto flex items-center gap-1 flex-shrink-0"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            {approvingIndex === aIdx ? 'Onaylanıyor...' : 'Onayla ve Ata ➔'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="card p-4 rounded-2xl rounded-tl-none text-xs text-slate-500 font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
              Veritabanı kayıtları taranıyor ve analiz oluşturuluyor...
            </div>
          </div>
        )}
      </div>

      {/* Soru Giriş Alanı */}
      <div className="sticky bottom-4 pt-2">
        <form
          onSubmit={(e) => { e.preventDefault(); handleAsk(); }}
          className="card p-2 shadow-xl flex items-center gap-2 border-2 border-indigo-200 dark:border-indigo-900 bg-white/95 dark:bg-slate-900/95 backdrop-blur"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Asistana bir soru sorun (ör. 'Son denemede neti düşenler kimler?')..."
            className="input border-none focus:ring-0 text-sm flex-1"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="btn-primary p-2.5 rounded-xl flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
