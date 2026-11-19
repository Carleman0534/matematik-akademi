'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Edit2, Trash2, CheckCircle2, ChevronRight, 
  ChevronDown, Layers, Award, Sparkles, Filter 
} from 'lucide-react';
import { SubTabBar } from '@/components/SubTabBar';

interface TopicNode {
  id: string;
  code: string;
  name: string;
  parent_id: string | null;
  grade_level: number;
  sort_order: number;
  is_active: number;
  subtopics: TopicNode[];
}

export default function LgsMufredatPage() {
  const [tree, setTree] = useState<TopicNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedTopic, setSelectedTopic] = useState<TopicNode | null>(null);

  // Yeni konu modalı
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalParentId, setModalParentId] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicCode, setNewTopicCode] = useState('');

  const fetchCurriculum = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/lgs/curriculum');
      const data = await res.json();
      if (data.success) {
        setTree(data.tree);
        // Varsayılan olarak ilk 3 üniteyi aç
        const exp: Record<string, boolean> = {};
        data.tree.slice(0, 4).forEach((t: TopicNode) => { exp[t.id] = true; });
        setExpanded(exp);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurriculum();
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;

    try {
      const res = await fetch('/api/lgs/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTopicName,
          code: newTopicCode || undefined,
          parentId: modalParentId,
          gradeLevel: 8
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setNewTopicName('');
        setNewTopicCode('');
        fetchCurriculum();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleActive = async (id: string, current: number) => {
    try {
      await fetch('/api/lgs/curriculum', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: current === 1 ? 0 : 1 })
      });
      fetchCurriculum();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu konuyu ve alt kazanımlarını silmek istediğinizden emin misiniz?')) return;
    try {
      await fetch(`/api/lgs/curriculum?id=${id}`, { method: 'DELETE' });
      fetchCurriculum();
    } catch (e) {
      console.error(e);
    }
  };

  const PDF_TABS = [
    { href: '/ogretmen/pdf-arsivi', label: 'PDF Arşivi & Yükleme', icon: '📁' },
    { href: '/ogretmen/pdf-analiz', label: 'LGS PDF Analiz & Soru Çıkarıcı', icon: '🔍', badge: 'AI Destekli' },
    { href: '/ogretmen/lgs-mufredat', label: 'LGS Müfredat Haritası', icon: '📚' },
    { href: '/ogretmen/denemeler/toplu-ata', label: 'Toplu Deneme Ata', icon: '🚀' },
  ];

  return (
    <div className="space-y-6">
      {/* Üst Alt-Sekme Şeridi */}
      <SubTabBar
        title="PDF & Doküman Arşivi"
        description="Deneme sınavları, soru bankaları, cevap anahtarları ve AI analiz merkezi"
        tabs={PDF_TABS}
      />

      {/* Üst Bilgi Kartı */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="h-4 w-4" /> MEB LGS Matematik Öğretim Programı
          </div>
          <h1 className="text-2xl font-black">LGS Matematik Müfredatı ve Konu Hiyerarşisi</h1>
          <p className="text-sm text-indigo-100 mt-1 max-w-2xl">
            Sistemdeki tüm PDF analizleri, yapay zekâ soru üretimleri ve öğrenci eksiklik analizleri bu merkezi konu ağacına göre yapılandırılır. İhtiyacınıza göre ünite ve alt konu ekleyip düzenleyebilirsiniz.
          </p>
        </div>
        <button
          onClick={() => { setModalParentId(null); setIsModalOpen(true); }}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-md transition hover:bg-indigo-50"
        >
          <Plus className="h-4 w-4" /> Yeni Ana Konu Ekle
        </button>
      </div>

      {/* Konu Ağacı Listesi */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
            <Layers className="h-4 w-4 text-indigo-600" />
            <span>Müfredat Konu Ağacı (8. Sınıf LGS)</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {tree.length} Ana Ünite
            </span>
          </div>
          <span className="text-xs text-slate-400">Tıklayarak alt konuları ve kazanımları görüntüleyin</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Müfredat konuları yükleniyor...</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tree.map(topic => (
              <div key={topic.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleExpand(topic.id)}>
                    <button className="text-slate-400 hover:text-indigo-600">
                      {expanded[topic.id] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </button>
                    <div className="flex items-center gap-2.5">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-mono font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {topic.code || 'LGS'}
                      </span>
                      <span className={`text-base font-bold ${topic.is_active ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'}`}>
                        {topic.name}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800">
                        {topic.subtopics?.length || 0} alt konu
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setModalParentId(topic.id); setIsModalOpen(true); }}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      + Alt Konu
                    </button>
                    <button
                      onClick={() => handleToggleActive(topic.id, topic.is_active)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        topic.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {topic.is_active ? 'Aktif' : 'Pasif'}
                    </button>
                  </div>
                </div>

                {/* Alt Konular */}
                {expanded[topic.id] && topic.subtopics && topic.subtopics.length > 0 && (
                  <div className="bg-slate-50/60 pb-3 pl-14 pr-6 pt-1 dark:bg-slate-900/50 divide-y divide-slate-100 dark:divide-slate-800/60 border-t border-slate-100 dark:border-slate-800">
                    {topic.subtopics.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-indigo-500">{sub.code || '•'}</span>
                          <span className={`text-sm ${sub.is_active ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 line-through'}`}>
                            {sub.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(sub.id, sub.is_active)}
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            {sub.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                          </button>
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="text-slate-300 hover:text-rose-500 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Yeni Konu Ekleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {modalParentId ? 'Yeni Alt Konu Ekle' : 'Yeni Ana Konu Ekle'}
            </h3>
            <form onSubmit={handleAddTopic} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Konu Adı</label>
                <input
                  type="text"
                  required
                  value={newTopicName}
                  onChange={e => setNewTopicName(e.target.value)}
                  placeholder="Örn: EBOB-EKOK Problemleri"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Müfredat Kodu (İsteğe Bağlı)</label>
                <input
                  type="text"
                  value={newTopicCode}
                  onChange={e => setNewTopicCode(e.target.value)}
                  placeholder="Örn: LGS_01_06"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
