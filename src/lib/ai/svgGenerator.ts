// LGS Matematik Vektörel (SVG) Görsel Üretim Motoru
// Geometrik şekiller, koordinat düzlemi, daire grafiği, sütun grafiği, sayı doğrusu ve silindir açınımları

export type SvgVisualType = 'triangle' | 'coordinate_system' | 'bar_chart' | 'pie_chart' | 'number_line' | 'cylinder_net';

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
      const labels = opts.labels || ['A Kitabı (120°)', 'B Kitabı (90°)', 'C Kitabı (150°)'];
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
      const labels = opts.labels || ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];
      const vals = opts.values || [45, 60, 30, 80, 55];
      const maxVal = Math.max(...vals, 100);
      return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="mx-auto my-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
  <line x1="50" y1="200" x2="420" y2="200" stroke="#64748b" stroke-width="2" />
  <line x1="50" y1="40" x2="50" y2="200" stroke="#64748b" stroke-width="2" />
  ${vals.map((v, i) => {
    const barHeight = (v / maxVal) * 140;
    const x = 80 + i * 65;
    const y = 200 - barHeight;
    return `
      <rect x="${x}" y="${y}" width="36" height="${barHeight}" rx="4" fill="#3b82f6" />
      <text x="${x + 18}" y="${y - 6}" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1e293b" class="dark:fill-slate-100">${v}</text>
      <text x="${x + 18}" y="218" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#64748b">${labels[i] || ''}</text>
    `;
  }).join('')}
  <text x="${width / 2}" y="25" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="500" fill="#64748b">${opts.title || 'Soru Çözüm Dağılımı (Sütun Grafiği)'}</text>
</svg>`.trim();
    }

    case 'number_line': {
      // Sayı Doğrusu ve Eşitsizlik
      const min = opts.params?.min ?? -2;
      const max = opts.params?.max ?? 6;
      return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="mx-auto my-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
  <defs>
    <marker id="arrowLine" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
    </marker>
  </defs>
  <line x1="40" y1="130" x2="420" y2="130" stroke="#334155" stroke-width="3" marker-start="url(#arrowLine)" marker-end="url(#arrowLine)" />
  ${[-2, -1, 0, 1, 2, 3, 4, 5, 6].map((n, i) => {
    const x = 70 + i * 40;
    return `
      <line x1="${x}" y1="122" x2="${x}" y2="138" stroke="#334155" stroke-width="2" />
      <text x="${x}" y="156" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="#334155">${n}</text>
    `;
  }).join('')}
  <!-- Eşitsizlik bölgesi (Ör: [1, 5)) -->
  <line x1="190" y1="130" x2="350" y2="130" stroke="#10b981" stroke-width="6" stroke-linecap="round" />
  <circle cx="190" cy="130" r="5" fill="#10b981" />
  <circle cx="350" cy="130" r="5" fill="#ffffff" stroke="#10b981" stroke-width="2" />
  <text x="270" y="105" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#047857">1 ≤ x &lt; 5</text>
  <text x="${width / 2}" y="35" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="500" fill="#64748b">${opts.title || 'Sayı Doğrusunda Eşitsizlik Çözüm Kümesi'}</text>
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
