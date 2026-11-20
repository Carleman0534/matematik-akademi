// LGS Matematik Vektörel (SVG) Görsel Üretim Motoru
// Geometrik şekiller, koordinat düzlemi, daire grafiği, sütun grafiği, sayı doğrusu, kare modelleri ve silindir açınımları

export type SvgVisualType = 
  | 'triangle' 
  | 'coordinate_system' 
  | 'bar_chart' 
  | 'pie_chart' 
  | 'number_line' 
  | 'cylinder_net'
  | 'square_area'
  | 'probability_spinner'
  | 'algebraic_tiles'
  | 'scale_balance';

export interface SvgGeneratorOptions {
  type: SvgVisualType;
  title?: string;
  labels?: string[];
  values?: number[];
  params?: Record<string, any>;
}

export function generateMathematicalSvg(opts: SvgGeneratorOptions): string {
  const width = 460;
  const height = 260;

  switch (opts.type) {
    case 'triangle': {
      // Dik Üçgen veya Özel Üçgen (Pisagor / Kenar-Açı)
      const a = opts.params?.a ?? '6 cm';
      const b = opts.params?.b ?? '8 cm';
      const c = opts.params?.c ?? '10 cm';
      const angle = opts.params?.isRightAngle ?? true;

      return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="mx-auto my-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
    </marker>
  </defs>
  <polygon points="100,210 340,210 100,60" fill="rgba(99, 102, 241, 0.08)" stroke="#4f46e5" stroke-width="3" stroke-linejoin="round" />
  ${angle ? '<rect x="100" y="190" width="20" height="20" fill="none" stroke="#ef4444" stroke-width="2" /><circle cx="110" cy="200" r="2.5" fill="#ef4444" />' : ''}
  <text x="85" y="55" font-family="sans-serif" font-size="14" font-weight="bold" fill="#1e293b" class="dark:fill-slate-100">A</text>
  <text x="80" y="225" font-family="sans-serif" font-size="14" font-weight="bold" fill="#1e293b" class="dark:fill-slate-100">B</text>
  <text x="350" y="225" font-family="sans-serif" font-size="14" font-weight="bold" fill="#1e293b" class="dark:fill-slate-100">C</text>
  <text x="60" y="140" font-family="sans-serif" font-size="13" font-weight="600" fill="#4f46e5">${a}</text>
  <text x="210" y="235" font-family="sans-serif" font-size="13" font-weight="600" fill="#4f46e5">${b}</text>
  <text x="235" y="125" font-family="sans-serif" font-size="13" font-weight="600" fill="#059669">${c}</text>
  <text x="${width / 2}" y="25" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="500" fill="#64748b">${opts.title || 'ABC Dik Üçgeni'}</text>
</svg>`.trim();
    }

    case 'coordinate_system': {
      // 2 Boyutlu Kartezyen Koordinat Düzlemi ve Doğru
      const m = opts.params?.slope ?? 1.5;
      const b = opts.params?.intercept ?? 2;
      return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="mx-auto my-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
  <!-- Izgara çizgileri -->
  <g stroke="#e2e8f0" stroke-width="1" class="dark:stroke-slate-800">
    ${[60, 110, 160, 210, 260, 310, 360, 410].map(x => `<line x1="${x}" y1="20" x2="${x}" y2="240" />`).join('')}
    ${[40, 80, 120, 160, 200].map(y => `<line x1="40" y1="${y}" x2="420" y2="${y}" />`).join('')}
  </g>
  <!-- Eksenler -->
  <line x1="40" y1="130" x2="420" y2="130" stroke="#334155" stroke-width="2.5" />
  <line x1="230" y1="20" x2="230" y2="240" stroke="#334155" stroke-width="2.5" />
  <text x="415" y="122" font-family="sans-serif" font-size="12" font-weight="bold" fill="#334155">x</text>
  <text x="238" y="32" font-family="sans-serif" font-size="12" font-weight="bold" fill="#334155">y</text>
  <text x="220" y="145" font-family="sans-serif" font-size="11" fill="#64748b">O(0,0)</text>
  <!-- Doğru grafiği -->
  <line x1="90" y1="220" x2="370" y2="40" stroke="#dc2626" stroke-width="3" stroke-linecap="round" />
  <circle cx="230" cy="130" r="4" fill="#3b82f6" />
  <text x="310" y="60" font-family="sans-serif" font-size="12" font-weight="bold" fill="#dc2626">d: y = ${m}x + ${b}</text>
  <text x="${width / 2}" y="18" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="500" fill="#64748b">${opts.title || 'Koordinat Sistemi ve Doğrunun Eğimi'}</text>
</svg>`.trim();
    }

    case 'pie_chart': {
      // Daire Grafiği (LGS Veri Analizi)
      const labels = opts.labels || ['A Kategorisi (120°)', 'B Kategorisi (90°)', 'C Kategorisi (150°)'];
      return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="mx-auto my-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
  <g transform="translate(140, 130)">
    <!-- 120 derece -->
    <path d="M 0 0 L 80 0 A 80 80 0 0 1 -40 69.28 Z" fill="#6366f1" />
    <!-- 90 derece -->
    <path d="M 0 0 L -40 69.28 A 80 80 0 0 1 -69.28 -40 Z" fill="#10b981" />
    <!-- 150 derece -->
    <path d="M 0 0 L -69.28 -40 A 80 80 0 0 1 80 0 Z" fill="#f59e0b" />
    <circle cx="0" cy="0" r="3" fill="#ffffff" />
  </g>
  <!-- Açıklama Legend -->
  <g transform="translate(260, 75)">
    <rect x="0" y="0" width="16" height="16" rx="4" fill="#6366f1" />
    <text x="24" y="13" font-family="sans-serif" font-size="12" font-weight="600" fill="#1e293b" class="dark:fill-slate-100">${labels[0]}</text>
    <rect x="0" y="32" width="16" height="16" rx="4" fill="#10b981" />
    <text x="24" y="45" font-family="sans-serif" font-size="12" font-weight="600" fill="#1e293b" class="dark:fill-slate-100">${labels[1]}</text>
    <rect x="0" y="64" width="16" height="16" rx="4" fill="#f59e0b" />
    <text x="24" y="77" font-family="sans-serif" font-size="12" font-weight="600" fill="#1e293b" class="dark:fill-slate-100">${labels[2]}</text>
  </g>
  <text x="${width / 2}" y="25" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="500" fill="#64748b">${opts.title || 'Veri Dağılımı Daire Grafiği'}</text>
</svg>`.trim();
    }

    case 'bar_chart': {
      // Sütun Grafiği
      const labels = opts.labels || ['1. Grup', '2. Grup', '3. Grup', '4. Grup'];
      const vals = opts.values || [45, 60, 30, 80];
      const maxVal = Math.max(...vals, 100);
      return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="mx-auto my-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
  <line x1="50" y1="200" x2="420" y2="200" stroke="#64748b" stroke-width="2" />
  <line x1="50" y1="40" x2="50" y2="200" stroke="#64748b" stroke-width="2" />
  ${vals.map((v, i) => {
    const barHeight = (v / maxVal) * 140;
    const x = 75 + i * 85;
    const y = 200 - barHeight;
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    return `
      <rect x="${x}" y="${y}" width="48" height="${barHeight}" rx="5" fill="${colors[i % colors.length]}" />
      <text x="${x + 24}" y="${y - 6}" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1e293b" class="dark:fill-slate-100">${v}</text>
      <text x="${x + 24}" y="218" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#64748b">${labels[i] || ''}</text>
    `;
  }).join('')}
  <text x="${width / 2}" y="25" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="500" fill="#64748b">${opts.title || 'Soru Dağılımı ve Sütun Grafiği'}</text>
</svg>`.trim();
    }

    case 'number_line': {
      // Sayı Doğrusu ve Eşitsizlik
      const aVal = opts.params?.aVal ?? 3;
      const bVal = opts.params?.bVal ?? 7;
      return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="mx-auto my-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
  <defs>
    <marker id="arrowLine" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
    </marker>
  </defs>
  <line x1="40" y1="130" x2="420" y2="130" stroke="#334155" stroke-width="3" marker-start="url(#arrowLine)" marker-end="url(#arrowLine)" />
  ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n, i) => {
    const x = 70 + i * 40;
    return `
      <line x1="${x}" y1="122" x2="${x}" y2="138" stroke="#334155" stroke-width="2" />
      <text x="${x}" y="156" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="600" fill="#334155">${n}</text>
    `;
  }).join('')}
  <!-- Vurgulanan Bölge -->
  <line x1="${70 + aVal * 40}" y1="130" x2="${70 + bVal * 40}" y2="130" stroke="#10b981" stroke-width="6" stroke-linecap="round" />
  <circle cx="${70 + aVal * 40}" cy="130" r="5" fill="#10b981" />
  <circle cx="${70 + bVal * 40}" cy="130" r="5" fill="#ffffff" stroke="#10b981" stroke-width="2.5" />
  <text x="${70 + ((aVal + bVal) / 2) * 40}" y="105" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#047857">${opts.params?.rangeLabel || `${aVal} ≤ x < ${bVal}`}</text>
  <text x="${width / 2}" y="35" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="500" fill="#64748b">${opts.title || 'Sayı Doğrusu Modeli'}</text>
</svg>`.trim();
    }

    case 'square_area': {
      // Kareköklü İfadeler: Alan ve Kenar İlişkisi Modeli
      const area = opts.params?.area ?? 150;
      const side = opts.params?.side ?? '√150 cm';
      return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="mx-auto my-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
  <rect x="155" y="55" width="150" height="150" rx="8" fill="rgba(147, 51, 234, 0.08)" stroke="#9333ea" stroke-width="3" stroke-dasharray="0" />
  <line x1="155" y1="55" x2="155" y2="205" stroke="#9333ea" stroke-width="3" />
  <line x1="155" y1="205" x2="305" y2="205" stroke="#9333ea" stroke-width="3" />
  <!-- Alan Yazısı -->
  <text x="230" y="125" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="black" fill="#7e22ce">Alan = ${area} cm²</text>
  <text x="230" y="145" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="600" fill="#a855f7">(Kare Şeklinde Bahçe)</text>
  <!-- Kenar Etiketleri -->
  <text x="135" y="135" text-anchor="end" font-family="sans-serif" font-size="13" font-weight="bold" fill="#9333ea">a = ${side}</text>
  <text x="230" y="228" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#9333ea">a = ${side}</text>
  <text x="${width / 2}" y="28" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="500" fill="#64748b">${opts.title || 'Kareköklü Sayı Alan-Kenar Geometrik Modeli'}</text>
</svg>`.trim();
    }

    case 'probability_spinner': {
      // Olasılık: Renkli Şans Çarkı Modeli
      return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="mx-auto my-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
  <g transform="translate(160, 130)">
    <!-- 4 eşit çeyrek dilim (Kırmızı, Mavi, Sarı, Yeşil) -->
    <path d="M 0 0 L 80 0 A 80 80 0 0 1 0 80 Z" fill="#ef4444" />
    <path d="M 0 0 L 0 80 A 80 80 0 0 1 -80 0 Z" fill="#3b82f6" />
    <path d="M 0 0 L -80 0 A 80 80 0 0 1 0 -80 Z" fill="#10b981" />
    <path d="M 0 0 L 0 -80 A 80 80 0 0 1 80 0 Z" fill="#f59e0b" />
    <circle cx="0" cy="0" r="80" fill="none" stroke="#1e293b" stroke-width="2.5" />
    <circle cx="0" cy="0" r="10" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
    <!-- İbre Oku -->
    <polygon points="0,-8 45,0 0,8" fill="#1e293b" transform="rotate(-35)" />
    <!-- Dilim Yazıları -->
    <text x="35" y="45" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">Kırmızı</text>
    <text x="-55" y="45" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">Mavi</text>
    <text x="-55" y="-35" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">Yeşil</text>
    <text x="25" y="-35" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">Sarı</text>
  </g>
  <g transform="translate(280, 85)">
    <text x="0" y="15" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b" class="dark:fill-slate-100">Eş Dilimli Şans Çarkı</text>
    <text x="0" y="38" font-family="sans-serif" font-size="11" fill="#64748b">Toplam Dilim: 4 Eşit Parça</text>
    <text x="0" y="58" font-family="sans-serif" font-size="11" fill="#64748b">Her rengin olasılığı: 1/4 (%25)</text>
  </g>
  <text x="${width / 2}" y="25" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="500" fill="#64748b">${opts.title || 'LGS Olasılık Deneyi Çark Modeli'}</text>
</svg>`.trim();
    }

    case 'algebraic_tiles': {
      // Cebirsel İfadeler: Çarpanlara Ayırma ve Alan Modeli
      return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="mx-auto my-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
  <g transform="translate(130, 60)">
    <!-- x^2 karesi (80x80) -->
    <rect x="0" y="0" width="80" height="80" fill="#3b82f6" fill-opacity="0.2" stroke="#2563eb" stroke-width="2" />
    <text x="40" y="46" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#1d4ed8">x²</text>
    <!-- x dikdörtgeni (40x80) -->
    <rect x="85" y="0" width="40" height="80" fill="#10b981" fill-opacity="0.2" stroke="#059669" stroke-width="2" />
    <text x="105" y="46" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#047857">x</text>
    <!-- x dikdörtgeni yatay (80x30) -->
    <rect x="0" y="85" width="80" height="30" fill="#10b981" fill-opacity="0.2" stroke="#059669" stroke-width="2" />
    <text x="40" y="105" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#047857">x</text>
    <!-- 1 birim kare (40x30) -->
    <rect x="85" y="85" width="40" height="30" fill="#f59e0b" fill-opacity="0.2" stroke="#d97706" stroke-width="2" />
    <text x="105" y="105" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#b45309">1</text>
  </g>
  <text x="${width / 2}" y="215" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b" class="dark:fill-slate-100">Toplam Alan Modeli = (x + 1)·(x + 2) = x² + 3x + 2</text>
  <text x="${width / 2}" y="25" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="500" fill="#64748b">${opts.title || 'Cebir Karoları ile Özdeşlik Modellemesi'}</text>
</svg>`.trim();
    }

    case 'scale_balance': {
      // Terazi Denge Modeli (Doğrusal Denklemler)
      return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="mx-auto my-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
  <!-- Terazi Direği -->
  <polygon points="230,190 220,220 240,220" fill="#475569" />
  <line x1="230" y1="110" x2="230" y2="190" stroke="#334155" stroke-width="4" />
  <!-- Denge Çubuğu -->
  <line x1="100" y1="110" x2="360" y2="110" stroke="#0284c7" stroke-width="4" stroke-linecap="round" />
  <circle cx="230" cy="110" r="5" fill="#0284c7" />
  <!-- Sol Kefe -->
  <line x1="120" y1="110" x2="100" y2="150" stroke="#94a3b8" stroke-width="2" />
  <line x1="120" y1="110" x2="140" y2="150" stroke="#94a3b8" stroke-width="2" />
  <rect x="90" y="150" width="60" height="8" rx="2" fill="#0284c7" />
  <!-- Sol Ağırlıklar: 2 adet 'x' kutusu ve 4 kg -->
  <rect x="95" y="132" width="16" height="18" fill="#3b82f6" rx="2" />
  <text x="103" y="145" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="bold" fill="#ffffff">x</text>
  <rect x="113" y="132" width="16" height="18" fill="#3b82f6" rx="2" />
  <text x="121" y="145" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="bold" fill="#ffffff">x</text>
  <circle cx="137" cy="141" r="8" fill="#10b981" />
  <text x="137" y="145" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="bold" fill="#ffffff">4</text>
  <!-- Sağ Kefe -->
  <line x1="340" y1="110" x2="320" y2="150" stroke="#94a3b8" stroke-width="2" />
  <line x1="340" y1="110" x2="360" y2="150" stroke="#94a3b8" stroke-width="2" />
  <rect x="310" y="150" width="60" height="8" rx="2" fill="#0284c7" />
  <!-- Sağ Ağırlık: 16 kg -->
  <rect x="325" y="125" width="30" height="25" fill="#f59e0b" rx="3" />
  <text x="340" y="142" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="bold" fill="#ffffff">16 kg</text>
  <text x="${width / 2}" y="215" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0284c7">Dengede: 2x + 4 = 16 ➔ x = 6 kg</text>
  <text x="${width / 2}" y="25" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="500" fill="#64748b">${opts.title || 'Eşit Kollu Terazi Denklem Modeli'}</text>
</svg>`.trim();
    }

    case 'cylinder_net': {
      // Dik Dairesel Silindir Açınımı
      return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="mx-auto my-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
  <!-- Üst Daire -->
  <circle cx="230" cy="45" r="30" fill="rgba(99,102,241,0.15)" stroke="#4f46e5" stroke-width="2" />
  <line x1="230" y1="45" x2="260" y2="45" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="2 2" />
  <text x="245" y="40" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ef4444">r</text>
  <!-- Yan Yüz (Dikdörtgen) -->
  <rect x="110" y="75" width="240" height="90" rx="3" fill="rgba(16,185,129,0.1)" stroke="#059669" stroke-width="2" />
  <text x="230" y="125" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="600" fill="#059669">Yan Yüzey (Alan = 2·π·r·h)</text>
  <text x="90" y="125" font-family="sans-serif" font-size="12" font-weight="bold" fill="#334155">h</text>
  <text x="230" y="180" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="#334155">Çevre = 2·π·r</text>
  <!-- Alt Daire -->
  <circle cx="230" cy="205" r="30" fill="rgba(99,102,241,0.15)" stroke="#4f46e5" stroke-width="2" />
  <text x="${width / 2}" y="18" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="500" fill="#64748b">${opts.title || 'Dik Dairesel Silindirin Açınımı'}</text>
</svg>`.trim();
    }
  }
}
