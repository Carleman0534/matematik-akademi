'use client';

import React, { useRef, useState } from 'react';
import { Camera, Scissors, Check, X, Plus, Sparkles, Layers } from 'lucide-react';

interface CropBox {
  id: string;
  name: string;
  x: number; // percentage
  y: number; // percentage
  width: number;
  height: number;
}

interface PageScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCroppedQuestions: (croppedFiles: { file: File; name: string }[]) => void;
}

export function PageScannerModal({
  isOpen,
  onClose,
  onAddCroppedQuestions,
}: PageScannerModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crops, setCrops] = useState<CropBox[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      // Varsayılan olarak sayfayı 2 veya 3 soru kutusuna bölecek başlangıç kutuları tanımlayalım
      setCrops([
        { id: '1', name: 'Soru 1', x: 5, y: 5, width: 90, height: 28 },
        { id: '2', name: 'Soru 2', x: 5, y: 35, width: 90, height: 28 },
        { id: '3', name: 'Soru 3', x: 5, y: 65, width: 90, height: 28 },
      ]);
    }
  };

  const handleAddCropBox = () => {
    const nextIdx = crops.length + 1;
    setCrops([
      ...crops,
      {
        id: String(nextIdx),
        name: `Soru ${nextIdx}`,
        x: 10,
        y: Math.min(80, nextIdx * 20),
        width: 80,
        height: 22,
      },
    ]);
  };

  const handleRemoveBox = (id: string) => {
    setCrops(crops.filter((c) => c.id !== id));
  };

  const handleConfirmAndCrop = async () => {
    if (!imageSrc || !imgRef.current) return;
    setIsProcessing(true);

    try {
      const img = imgRef.current;
      const naturalWidth = img.naturalWidth || 800;
      const naturalHeight = img.naturalHeight || 1200;

      const results: { file: File; name: string }[] = [];

      for (const crop of crops) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        const cropX = (crop.x / 100) * naturalWidth;
        const cropY = (crop.y / 100) * naturalHeight;
        const cropW = (crop.width / 100) * naturalWidth;
        const cropH = (crop.height / 100) * naturalHeight;

        canvas.width = cropW;
        canvas.height = cropH;

        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
        );

        if (blob) {
          const file = new File([blob], `${crop.name.toLowerCase().replace(/\s+/g, '_')}_kirpildi.jpg`, {
            type: 'image/jpeg',
          });
          results.push({ file, name: crop.name });
        }
      }

      onAddCroppedQuestions(results);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Başlık */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600">
              <Scissors className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Toplu Soru Tarama & Sayfa Kırpıcı (MiaoMiaoJi Modeli)
              </h3>
              <p className="text-xs text-slate-400">
                Tek bir test sayfasından 3-5 soruyu ayrı ayrı kutucuklarla seçip bankaya ekleyin.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {!imageSrc ? (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  Deneme veya Test Sayfası Fotoğrafını Seçin
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Sayfada birden çok yanlış soru varsa tek fotoğrafta çekebilirsiniz.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-sm transition"
              >
                📸 Fotoğraf Çek veya Galeriden Yükle
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  {crops.length} Soru Alanı Belirlendi
                </span>
                <button
                  type="button"
                  onClick={handleAddCropBox}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Soru Alanı Ekle</span>
                </button>
              </div>

              {/* Görsel ve Kırpma Kutuları */}
              <div className="relative border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[50vh]">
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Test Sayfası"
                  className="max-h-[50vh] w-auto object-contain select-none"
                />

                {/* Bounding Box Overlays */}
                {crops.map((crop) => (
                  <div
                    key={crop.id}
                    style={{
                      left: `${crop.x}%`,
                      top: `${crop.y}%`,
                      width: `${crop.width}%`,
                      height: `${crop.height}%`,
                    }}
                    className="absolute border-2 border-amber-400 bg-amber-400/20 rounded-md flex items-start justify-between p-1 shadow-md pointer-events-auto"
                  >
                    <span className="bg-amber-500 text-slate-900 font-black text-[10px] px-1.5 py-0.5 rounded-sm shadow-xs">
                      {crop.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBox(crop.id)}
                      className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] hover:bg-rose-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Alt Eylemler */}
        {imageSrc && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setImageSrc(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Farklı Fotoğraf Seç
            </button>

            <button
              type="button"
              disabled={isProcessing || crops.length === 0}
              onClick={handleConfirmAndCrop}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-sm transition flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessing ? 'Kırpılıyor...' : `${crops.length} Soruyu Bankaya Aktar`}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
