'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, Eye, Bell, Send, CheckCircle2, 
  X, Phone, Mail, Clock, Edit2, Trash2, ShieldCheck, Filter 
} from 'lucide-react';

export default function VelilerPage() {
  const [guardians, setGuardians] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Yeni Veli Modalı
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [relationshipType, setRelationshipType] = useState('anne');

  // İzin Modalı
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [currentGuardian, setCurrentGuardian] = useState<any>(null);
  const [permissions, setPermissions] = useState({
    showExamResults: true,
    showQuestionDetails: true,
    showTopicAnalytics: true,
    showAssignments: true,
    showTeacherNotes: true,
    showProgressReports: true
  });

  // Not Gönder Modalı
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [msgSuccess, setMsgSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [gRes, sRes] = await Promise.all([
        fetch('/api/guardians'),
        fetch('/api/students')
      ]);
      const gData = await gRes.json();
      const sData = await sRes.json();

      if (gData.success) setGuardians(gData.guardians);
      if (sData.success) setStudents(sData.students);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentIds.length) {
      alert('Lütfen en az bir öğrenci seçin.');
      return;
    }

    try {
      const res = await fetch('/api/guardians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          studentIds: selectedStudentIds,
          relationshipType
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setFullName('');
        setEmail('');
        setPhone('');
        setSelectedStudentIds([]);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleStatus = async (linkId: string, currentStatus: string) => {
    try {
      await fetch('/api/guardians', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId,
          status: currentStatus === 'active' ? 'passive' : 'active'
        })
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const openPermissionsModal = (g: any) => {
    setCurrentGuardian(g);
    setPermissions({
      showExamResults: g.show_exam_results === 1,
      showQuestionDetails: g.show_question_details === 1,
      showTopicAnalytics: g.show_topic_analytics === 1,
      showAssignments: g.show_assignments === 1,
      showTeacherNotes: g.show_teacher_notes === 1,
      showProgressReports: g.show_progress_reports === 1
    });
    setIsPermModalOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!currentGuardian) return;
    try {
      await fetch('/api/guardians', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId: currentGuardian.link_id,
          guardianUserId: currentGuardian.guardian_user_id,
          studentId: currentGuardian.student_id,
          permissions
        })
      });
      setIsPermModalOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGuardian || !msgText.trim()) return;

    try {
      const res = await fetch('/api/guardians/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: currentGuardian.student_id,
          guardianUserId: currentGuardian.guardian_user_id,
          message: msgText
        })
      });
      const data = await res.json();
      if (data.success) {
        setMsgSuccess('Değerlendirme notu veliye başarıyla iletildi.');
        setTimeout(() => {
          setIsMsgModalOpen(false);
          setMsgText('');
          setMsgSuccess('');
        }, 1500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="h-4 w-4" /> Öğrenci–Veli İlişkilendirmesi & Portalı
          </div>
          <h1 className="text-2xl font-black">Veliler ve Veli İzin Yönetimi</h1>
          <p className="text-sm text-indigo-100 mt-1 max-w-2xl">
            Öğrenci velilerine özel hesap tanımlayın, çocuklarıyla güvenle ilişkilendirin ve velilerin hangi deneme, konu analizi ve ödev raporlarını görebileceğini yönetin.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-md transition hover:bg-indigo-50"
        >
          <UserPlus className="h-4 w-4" /> Yeni Veli Kaydı Oluştur
        </button>
      </div>

      {/* Veliler Tablosu */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Kayıtlı Veliler ve Öğrenci Bağlantıları ({guardians.length})</h2>
          <span className="text-xs text-slate-500">Çoktan-çoğa ilişki destekli</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Veli kayıtları yükleniyor...</div>
        ) : guardians.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">Henüz kayıtlı veli bulunmuyor.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-6 py-3.5">Veli Adı Soyadı</th>
                  <th className="px-6 py-3.5">İletişim</th>
                  <th className="px-6 py-3.5">Öğrenci</th>
                  <th className="px-6 py-3.5">Yakınlık</th>
                  <th className="px-6 py-3.5 text-center">Durum</th>
                  <th className="px-6 py-3.5 text-center">Son Giriş</th>
                  <th className="px-6 py-3.5 text-right">Eylemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {guardians.map((g) => (
                  <tr key={g.link_id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      {g.guardian_name}
                    </td>
                    <td className="px-6 py-4 text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Mail className="h-3 w-3 text-slate-400" /> {g.guardian_email}
                      </div>
                      {g.guardian_phone && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Phone className="h-3 w-3 text-slate-400" /> {g.guardian_phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                      <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                        {g.student_name} ({g.student_grade}. Sınıf)
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {g.relationship_type === 'anne' ? 'Anne' : g.relationship_type === 'baba' ? 'Baba' : 'Yasal Vasi'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(g.link_id, g.link_status)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold transition ${
                          g.link_status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800'
                        }`}
                      >
                        {g.link_status === 'active' ? 'Aktif' : 'Pasif'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-slate-500">
                      {g.last_login_at ? new Date(g.last_login_at).toLocaleDateString('tr-TR') : 'Henüz girmedi'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openPermissionsModal(g)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                      >
                        <Shield className="h-3.5 w-3.5" /> İzinler
                      </button>
                      <button
                        onClick={() => { setCurrentGuardian(g); setIsMsgModalOpen(true); }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        <Send className="h-3.5 w-3.5" /> Not İlet
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Yeni Veli Modalı */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Yeni Veli Hesabı ve Öğrenci Bağlantısı</h3>
            <form onSubmit={handleCreateGuardian} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Veli Adı Soyadı</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Örn: Ayşe Yılmaz"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">E-posta Adresi</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="veli@ornek.com"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Telefon Numarası</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0555 123 4567"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Yakınlık Türü</label>
                <select
                  value={relationshipType}
                  onChange={e => setRelationshipType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
                >
                  <option value="anne">Anne</option>
                  <option value="baba">Baba</option>
                  <option value="vasi">Yasal Vasi</option>
                  <option value="diger">Diğer Yetkili Veli</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Takip Edeceği Öğrenci(ler)</label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 dark:border-slate-700">
                  {students.map(s => (
                    <label key={s.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={() => {
                          setSelectedStudentIds(prev =>
                            prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                          );
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{s.name} ({s.grade}. Sınıf)</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
                >
                  Veli Hesabını Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Görünürlük İzinleri Modalı (Section 20.10) */}
      {isPermModalOpen && currentGuardian && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" /> Veli Görünürlük İzinleri
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentGuardian.guardian_name} adlı velinin, {currentGuardian.student_name} için görebileceği raporları yönetin:
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Deneme Sınavı Sonuçları ve Netleri</span>
                <input
                  type="checkbox"
                  checked={permissions.showExamResults}
                  onChange={e => setPermissions(p => ({ ...p, showExamResults: e.target.checked }))}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Soru Bazlı Analiz ve Çözüm Detayları</span>
                <input
                  type="checkbox"
                  checked={permissions.showQuestionDetails}
                  onChange={e => setPermissions(p => ({ ...p, showQuestionDetails: e.target.checked }))}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Konu ve Alt Konu Ustalık Karnesi</span>
                <input
                  type="checkbox"
                  checked={permissions.showTopicAnalytics}
                  onChange={e => setPermissions(p => ({ ...p, showTopicAnalytics: e.target.checked }))}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Atanmış Çalışma ve Ödev Listesi</span>
                <input
                  type="checkbox"
                  checked={permissions.showAssignments}
                  onChange={e => setPermissions(p => ({ ...p, showAssignments: e.target.checked }))}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Öğretmen Değerlendirme ve İlerleme Notları</span>
                <input
                  type="checkbox"
                  checked={permissions.showTeacherNotes}
                  onChange={e => setPermissions(p => ({ ...p, showTeacherNotes: e.target.checked }))}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsPermModalOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
              >
                İzinleri Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Veliye Not İlet Modalı (Section 20.8) */}
      {isMsgModalOpen && currentGuardian && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="h-5 w-5 text-indigo-600" /> Veliye Özel Değerlendirme Notu
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Alıcı: {currentGuardian.guardian_name} ({currentGuardian.student_name} velisi)
              </p>
            </div>

            {msgSuccess ? (
              <div className="rounded-xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 border border-emerald-200">
                {msgSuccess}
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Gelişim Notunuz & Önerileriniz</label>
                  <textarea
                    rows={4}
                    required
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    placeholder="Örn: Bu hafta üslü ifadelerde çok başarılıydı. EBOB-EKOK problemleri için evde günlük 15 soru çözmesini destekleyebilirsiniz..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsMsgModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300"
                  >
                    Kapat
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
                  >
                    Notu Gönder
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
