// Öğrenci panelindeki bölümler ve görünürlük kuralları (saf; sunucu/istemci ikisinde de kullanılır).
//
// Bölümler sistemde durur; yönetici hangilerinin öğrenciye görüneceğini seçer.
// Varsayılan: yalnızca öğretmenin atadığı denemeler (PDF denemeleri + hibrit denemeler) ve
// bu denemelerdeki doğru/yanlış sonuçları açık; diğer her şey gizli.

export interface StudentFeature {
  key: string;
  href: string;
  label: string;
  icon: string;
  mobile?: boolean;
  description: string;
}

export const STUDENT_FEATURES: StudentFeature[] = [
  { key: 'denemeler', href: '/ogrenci/denemeler', label: 'Denemelerim', icon: '📝', mobile: true, description: 'Atanan PDF denemeleri, optik form ve sonuçlardaki doğru/yanlışlar' },
  { key: 'ozel-calismam', href: '/ogrenci/ozel-calismam', label: 'Bana Özel Çalışmam', icon: '🎯', mobile: true, description: 'Atanan hibrit denemeler ve sonuç değerlendirmesi' },
  { key: 'home', href: '/ogrenci', label: 'Ana Sayfa', icon: '🏠', mobile: true, description: 'Özet panel' },
  { key: 'mini-dersler', href: '/ogrenci/mini-dersler', label: 'Mini Dersler', icon: '📖', mobile: true, description: 'Kısa konu anlatımları' },
  { key: 'soru-coz', href: '/ogrenci/soru-coz', label: 'İpucuyla Soru Çöz', icon: '💡', mobile: true, description: 'İpuçlu etkileşimli soru çözümü' },
  { key: 'gunluk-hedef', href: '/ogrenci/gunluk-hedef', label: 'Günlük Matematik Planım', icon: '🔥', mobile: true, description: 'Günlük görevler' },
  { key: 'aralikli-tekrar', href: '/ogrenci/aralikli-tekrar', label: 'Aralıklı Tekrar & Hafıza', icon: '🔁', mobile: true, description: 'Aralıklı tekrar programı' },
  { key: 'rozetlerim', href: '/ogrenci/rozetlerim', label: 'Başarı Rozetlerim', icon: '🏆', mobile: true, description: 'Rozetler' },
  { key: 'tekrar-calismalarim', href: '/ogrenci/tekrar-calismalarim', label: 'Tekrar Çalışmalarım', icon: '🔁', description: 'Tekrar çalışmaları' },
  { key: 'konu-basarim', href: '/ogrenci/konu-basarim', label: 'Konu Başarım', icon: '📊', description: 'Konu bazlı başarı' },
  { key: 'gelisim-raporum', href: '/ogrenci/gelisim-raporum', label: 'Gelişim Raporum', icon: '📈', description: 'Gelişim raporu' },
  { key: 'soru-bankam', href: '/ogrenci/soru-bankam', label: 'Soru Bankam', icon: '🗂️', description: 'Kişisel soru bankası' },
  { key: 'soru-ekle', href: '/ogrenci/soru-ekle', label: 'Soru Ekle', icon: '📷', description: 'Fotoğrafla soru ekleme' },
  { key: 'tekrar', href: '/ogrenci/tekrar', label: 'Tekrar Et', icon: '💡', description: 'Günlük tekrar' },
  { key: 'pdf-denemeler', href: '/ogrenci/pdf-denemeler', label: 'PDF Kaynakları', icon: '📄', description: 'PDF kaynak listesi' },
];

export const DEFAULT_VISIBLE_FEATURES = ['denemeler', 'ozel-calismam'];

const KNOWN = new Set(STUDENT_FEATURES.map(f => f.key));

// Kayıtlı ayarı (JSON dizi) güvenle çözer; okunamazsa varsayılan
export function parseVisibleFeatures(raw: string | null | undefined): string[] {
  if (!raw) return [...DEFAULT_VISIBLE_FEATURES];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.filter((k): k is string => typeof k === 'string' && KNOWN.has(k));
  } catch {}
  return [...DEFAULT_VISIBLE_FEATURES];
}

// Bir öğrenci adresinin hangi bölüme ait olduğu (bölüme ait değilse null: ör. deneme çözme odası)
export function featureForPath(path: string): StudentFeature | null {
  const clean = path.replace(/[?#].*$/, '').replace(/\/+$/, '') || '/';
  if (clean === '/ogrenci') return STUDENT_FEATURES.find(f => f.key === 'home') || null;
  const m = clean.match(/^\/ogrenci\/([^/]+)/);
  if (!m) return null;
  return STUDENT_FEATURES.find(f => f.href === `/ogrenci/${m[1]}`) || null;
}

// Öğrenci bu adresi görebilir mi? Bölüme ait olmayan adresler (deneme odaları) her zaman açıktır.
export function isStudentPathAllowed(path: string, visible: string[]): boolean {
  const f = featureForPath(path);
  return !f || visible.includes(f.key);
}

export function firstVisibleHref(visible: string[]): string {
  const f = STUDENT_FEATURES.find(x => visible.includes(x.key));
  return f ? f.href : '/ogrenci/denemeler';
}
