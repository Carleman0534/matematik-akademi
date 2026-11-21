'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ExamPdfQuestion {
  questionNo: number;
  topicName?: string;
  questionText: string;
  options: Record<string, string> | any;
  correctAnswer?: string;
  solutionExplanation?: string;
  imageUrl?: string;
  svgContent?: string;
  difficultyLabel?: string;
}

interface ExportOptions {
  examTitle: string;
  durationMin: number;
  questions: ExamPdfQuestion[];
  includeAnswerKey?: boolean;
  includeOptic?: boolean;
  studentName?: string;
}

/**
 * Tarayıcıda açılan ve doğrudan yazdırılabilen temiz A4 Sınav Kitapçığı Penceresi
 */
export function openPrintBookletWindow({
  examTitle,
  durationMin,
  questions,
  includeAnswerKey = true,
  includeOptic = true,
  studentName = ''
}: ExportOptions) {
  const printWindow = window.open('', '_blank', 'width=960,height=1000');
  if (!printWindow) {
    alert('Yazdırma penceresi açılamadı. Lütfen tarayıcınızın açılır pencere (popup) engelleyicisini kapatın.');
    return;
  }

  const optKeyPairs = questions.map(q => ({
    no: q.questionNo,
    ans: q.correctAnswer || '-'
  }));

  const opticRows = [];
  for (let i = 0; i < questions.length; i += 5) {
    opticRows.push(questions.slice(i, i + 5));
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${examTitle} - A4 Sınav Kitapçığı</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: white;
      font-size: 10.5pt;
      line-height: 1.45;
      padding: 16px;
    }
    .print-bar {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: white;
      padding: 12px 20px;
      margin: -16px -16px 20px -16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
    }
    .print-bar h2 { font-size: 13px; font-weight: 700; }
    .print-actions { display: flex; gap: 8px; }
    .btn-print {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 7px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-print:hover { background: #4338ca; }
    .btn-close {
      background: #334155;
      color: white;
      border: none;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
    }

    /* MEB Anteti ve Sınav Başlığı */
    .exam-header {
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #000;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .header-left {
      font-size: 8.5pt;
      line-height: 1.25;
      font-weight: 700;
    }
    .header-badge {
      font-weight: 900;
      font-size: 11pt;
      border: 2px solid #000;
      padding: 4px 14px;
      text-align: center;
      letter-spacing: 0.5px;
    }
    .header-right {
      text-align: right;
      font-size: 8.5pt;
      line-height: 1.25;
      font-weight: 700;
    }
    .student-info-bar {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 12px;
      font-size: 9pt;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      padding: 6px 12px;
      border-radius: 4px;
      font-weight: 600;
    }
    .fill-blank {
      border-bottom: 1px dashed #64748b;
      display: inline-block;
      min-width: 120px;
      margin-left: 4px;
    }

    /* 2 Sütunlu MEB Soru Düzeni */
    .questions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 24px;
      row-gap: 18px;
    }
    .question-block {
      break-inside: avoid;
      page-break-inside: avoid;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 14px;
    }
    .q-head {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }
    .q-badge {
      background: #0f172a;
      color: white;
      font-weight: 900;
      font-size: 9.5pt;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .q-topic {
      font-size: 8.5pt;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
    }
    .q-text {
      font-size: 9.5pt;
      line-height: 1.45;
      margin-bottom: 8px;
      white-space: pre-line;
      color: #1e293b;
    }
    .options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px;
      font-size: 9pt;
    }
    .option-row {
      display: flex;
      align-items: flex-start;
      gap: 5px;
    }
    .opt-char {
      font-weight: 800;
      color: #0f172a;
    }

    /* Optik Cevap Kağıdı Bölümü */
    .page-break {
      break-before: page;
      page-break-before: always;
    }
    .optic-section {
      border: 2px solid #000;
      border-radius: 8px;
      padding: 16px;
      margin-top: 24px;
    }
    .optic-title {
      text-align: center;
      border-bottom: 1.5px solid #000;
      padding-bottom: 6px;
      margin-bottom: 12px;
      font-size: 11pt;
      font-weight: 900;
    }
    .optic-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .optic-group {
      border: 1px solid #000;
      padding: 6px 8px;
      background: #f8fafc;
    }
    .optic-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 3px 0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 9pt;
    }
    .bubble {
      width: 17px;
      height: 17px;
      border-radius: 50%;
      border: 1px solid #000;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      font-weight: 700;
      background: white;
    }

    /* Cevap Anahtarı Sayfası */
    .answer-key-section {
      border: 2px solid #000;
      border-radius: 8px;
      padding: 16px;
      margin-top: 24px;
    }
    .key-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-top: 10px;
    }
    .key-item {
      display: flex;
      justify-content: space-between;
      border: 1px solid #cbd5e1;
      padding: 4px 8px;
      background: #f8fafc;
      font-size: 9pt;
      border-radius: 4px;
      font-weight: 700;
    }

    @media print {
      .print-bar { display: none !important; }
      body { padding: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <h2>🖨️ ${examTitle} (A4 Soru Kitapçığı)</h2>
    <div class="print-actions">
      <button class="btn-print" onclick="window.print()">Yazdır / PDF Olarak Kaydet</button>
      <button class="btn-close" onclick="window.close()">Kapat</button>
    </div>
  </div>

  <div class="exam-header">
    <div class="header-top">
      <div class="header-left">
        <p>T.C. MİLLÎ EĞİTİM BAKANLIĞI</p>
        <p>Ölçme, Değerlendirme ve Sınav Hizmetleri</p>
      </div>
      <div class="header-badge">
        LGS MATEMATİK DENEME SINAVI
      </div>
      <div class="header-right">
        <p>8. SINIF SAYISAL BÖLÜM</p>
        <p>Süre: ${durationMin} Dk · ${questions.length} Soru</p>
      </div>
    </div>

    <div class="student-info-bar">
      <div>Öğrenci: <span class="fill-blank">${studentName || '_______________________'}</span></div>
      <div>Sınıf / Şube: <span class="fill-blank" style="min-width:60px;">8 / _____</span></div>
      <div>Numara: <span class="fill-blank" style="min-width:60px;">_________</span></div>
    </div>
  </div>

  <div class="questions-grid">
    ${questions.map(q => {
      let optionsHtml = '';
      if (q.options && typeof q.options === 'object') {
        optionsHtml = Object.entries(q.options).map(([opt, val]) => `
          <div class="option-row">
            <span class="opt-char">${opt})</span>
            <span>${val}</span>
          </div>
        `).join('');
      }

      return `
        <div class="question-block">
          <div class="q-head">
            <span class="q-badge">${q.questionNo}</span>
            <span class="q-topic">${q.topicName || 'LGS Matematik'}</span>
          </div>
          ${q.imageUrl ? `<div style="text-align:center;margin:6px 0;"><img src="${q.imageUrl}" style="max-height:160px;object-fit:contain;" /></div>` : ''}
          ${q.svgContent && !q.imageUrl ? `<div style="text-align:center;margin:6px 0;">${q.svgContent}</div>` : ''}
          <div class="q-text">${q.questionText}</div>
          <div class="options-grid">
            ${optionsHtml}
          </div>
        </div>
      `;
    }).join('')}
  </div>

  ${includeOptic ? `
    <div class="page-break"></div>
    <div class="optic-section">
      <div class="optic-title">T.C. MEB LGS MATEMATİK OPTİK CEVAP KÂĞIDI</div>
      <p style="text-align:center;font-size:8.5pt;color:#64748b;margin-bottom:12px;">
        Cevaplarınızı koyu kurşun kalemle kutucukların dışına taşırmadan doldurunuz.
      </p>
      <div class="optic-grid">
        ${opticRows.map((grp, gIdx) => `
          <div class="optic-group">
            ${grp.map(q => `
              <div class="optic-row">
                <strong>${q.questionNo}.</strong>
                <div style="display:flex;gap:4px;">
                  <span class="bubble">A</span>
                  <span class="bubble">B</span>
                  <span class="bubble">C</span>
                  <span class="bubble">D</span>
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    </div>
  ` : ''}

  ${includeAnswerKey ? `
    <div class="page-break"></div>
    <div class="answer-key-section">
      <div class="optic-title">ÖĞRETMEN CEVAP ANAHTARI & ÇÖZÜM DÖKÜMÜ</div>
      <div class="key-grid">
        ${optKeyPairs.map(k => `
          <div class="key-item">
            <span>Soru ${k.no}:</span>
            <span style="color:#4f46e5;">${k.ans}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : ''}

  <script>
    // Sayfa tamamen yüklendiğinde otomatik yazdırma iletişim kutusunu tetikle
    window.addEventListener('load', () => {
      setTimeout(() => {
        try { window.print(); } catch (e) {}
      }, 400);
    });
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * html2canvas + jsPDF kullanarak Doğrudan A4 PDF Dosyası İndirir (Hiçbir Yazdırma Penceresi Açmadan)
 */
export async function downloadExamBookletAsPdf({
  examTitle,
  durationMin,
  questions,
  includeAnswerKey = true,
  includeOptic = true,
  studentName = '',
  onProgress
}: ExportOptions & { onProgress?: (msg: string) => void }) {
  try {
    if (onProgress) onProgress('A4 Sayfaları hazırlanıyor…');

    // 1. Geçici gizli A4 kapsayıcısı oluştur
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '794px'; // 210mm at 96 DPI
    tempContainer.style.background = '#ffffff';
    tempContainer.style.color = '#0f172a';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    tempContainer.style.padding = '36px 40px';
    tempContainer.style.boxSizing = 'border-box';
    tempContainer.style.zIndex = '-999';

    const opticRows = [];
    for (let i = 0; i < questions.length; i += 5) {
      opticRows.push(questions.slice(i, i + 5));
    }

    const optKeyPairs = questions.map(q => ({
      no: q.questionNo,
      ans: q.correctAnswer || '-'
    }));

    tempContainer.innerHTML = `
      <div style="border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #000; padding-bottom: 6px; margin-bottom: 8px;">
          <div style="font-size: 11px; line-height: 1.25; font-weight: bold;">
            <p>T.C. MİLLÎ EĞİTİM BAKANLIĞI</p>
            <p>Ölçme, Değerlendirme ve Sınav Hizmetleri</p>
          </div>
          <div style="font-weight: 900; font-size: 14px; border: 2px solid #000; padding: 4px 14px; text-align: center;">
            LGS MATEMATİK DENEME SINAVI
          </div>
          <div style="text-align: right; font-size: 11px; line-height: 1.25; font-weight: bold;">
            <p>8. SINIF SAYISAL BÖLÜM</p>
            <p>Süre: ${durationMin} Dk · ${questions.length} Soru</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; font-size: 12px; border: 1px solid #cbd5e1; background: #f8fafc; padding: 6px 12px; border-radius: 4px; font-weight: 600;">
          <div>Öğrenci: <span style="border-bottom: 1px dashed #64748b; display: inline-block; min-width: 120px; margin-left: 4px;">${studentName || '_______________________'}</span></div>
          <div>Sınıf: <span style="border-bottom: 1px dashed #64748b; display: inline-block; min-width: 40px;">8 / ___</span></div>
          <div>No: <span style="border-bottom: 1px dashed #64748b; display: inline-block; min-width: 40px;">_____</span></div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 24px; row-gap: 16px;">
        ${questions.map(q => {
          let optionsHtml = '';
          if (q.options && typeof q.options === 'object') {
            optionsHtml = Object.entries(q.options).map(([opt, val]) => `
              <div style="display: flex; align-items: flex-start; gap: 4px; font-size: 11px;">
                <strong style="color: #0f172a;">${opt})</strong>
                <span>${val}</span>
              </div>
            `).join('');
          }

          return `
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; font-size: 12px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <span style="background: #0f172a; color: #fff; font-weight: 900; font-size: 11px; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  ${q.questionNo}
                </span>
                <span style="font-size: 10px; font-weight: bold; color: #475569; text-transform: uppercase;">
                  ${q.topicName || 'LGS Matematik'}
                </span>
              </div>
              <p style="font-size: 11.5px; line-height: 1.4; margin-bottom: 8px; color: #1e293b; white-space: pre-line;">
                ${q.questionText}
              </p>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                ${optionsHtml}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      ${includeOptic ? `
        <div style="margin-top: 32px; border: 2px solid #000; border-radius: 8px; padding: 14px;">
          <div style="text-align: center; border-bottom: 1.5px solid #000; padding-bottom: 6px; margin-bottom: 10px; font-size: 13px; font-weight: 900;">
            T.C. MEB LGS MATEMATİK OPTİK CEVAP KÂĞIDI
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
            ${opticRows.map((grp) => `
              <div style="border: 1px solid #000; padding: 6px; background: #f8fafc;">
                ${grp.map(q => `
                  <div style="display: flex; align-items: center; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                    <strong>${q.questionNo}.</strong>
                    <div style="display: flex; gap: 4px;">
                      <span style="width: 15px; height: 15px; border-radius: 50%; border: 1px solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; background: #fff;">A</span>
                      <span style="width: 15px; height: 15px; border-radius: 50%; border: 1px solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; background: #fff;">B</span>
                      <span style="width: 15px; height: 15px; border-radius: 50%; border: 1px solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; background: #fff;">C</span>
                      <span style="width: 15px; height: 15px; border-radius: 50%; border: 1px solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; background: #fff;">D</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${includeAnswerKey ? `
        <div style="margin-top: 24px; border: 2px solid #000; border-radius: 8px; padding: 14px;">
          <div style="text-align: center; border-bottom: 1.5px solid #000; padding-bottom: 6px; margin-bottom: 8px; font-size: 13px; font-weight: 900;">
            ÖĞRETMEN CEVAP ANAHTARI
          </div>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;">
            ${optKeyPairs.map(k => `
              <div style="display: flex; justify-content: space-between; border: 1px solid #cbd5e1; padding: 4px 6px; background: #f8fafc; font-size: 11px; border-radius: 4px; font-weight: bold;">
                <span>Soru ${k.no}:</span>
                <span style="color: #4f46e5;">${k.ans}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;

    document.body.appendChild(tempContainer);

    if (onProgress) onProgress('PDF yüksek çözünürlükte işleniyor…');

    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    document.body.removeChild(tempContainer);

    if (onProgress) onProgress('PDF dosyası kaydediliyor…');

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // İlk sayfa
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Kalan sayfalar
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    const cleanTitle = (examTitle || 'LGS_Matematik_Denemesi')
      .replace(/[^a-zA-Z0-9_\u00C0-\u017F]/g, '_')
      .slice(0, 40);

    pdf.save(`${cleanTitle}.pdf`);

    if (onProgress) onProgress('Tamamlandı!');
    return true;
  } catch (err: any) {
    console.error('PDF generation error:', err);
    throw err;
  }
}
