'use client';

import type { PdfDocument } from './pdfDocs';

const STORAGE_KEY = 'matematik_akademi_uploaded_pdfs';
const DB_NAME = 'matematik_akademi_pdf_db';
const STORE_NAME = 'pdf_blobs';
const DB_VERSION = 1;

// IndexedDB bağlantısı
function openPdfDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (err) => {
        console.warn('IndexedDB açılamadı, localStorage yedeklenecek:', err);
        resolve(null);
      };
    } catch (e) {
      console.warn('IndexedDB başlatma hatası:', e);
      resolve(null);
    }
  });
}

// LocalStorage'dan yüklenmiş PDF listesini al
export function getClientPdfDocs(): PdfDocument[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not read client PDF docs:', e);
    return [];
  }
}

// Yeni bir PDF dokümanını hem LocalStorage'a hem IndexedDB'ye kaydet
export async function saveClientPdfDoc(doc: PdfDocument, blob?: Blob | File): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. LocalStorage metaveri kaydı
  try {
    const current = getClientPdfDocs();
    const updated = [doc, ...current.filter((d) => d.id !== doc.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('LocalStorage PDF metaveri kaydı hatası:', e);
  }

  // 2. IndexedDB ikili (Binary Blob) kaydı
  if (blob) {
    try {
      const db = await openPdfDatabase();
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ id: doc.id, blob, fileName: doc.file_name, updatedAt: Date.now() });
      }
    } catch (e) {
      console.warn('IndexedDB PDF blob kaydı hatası:', e);
    }
  }
}

// Belirtilen PDF'in ikili Blob'unu IndexedDB'den al
export async function getClientPdfBlob(id: string): Promise<Blob | null> {
  if (typeof window === 'undefined') return null;

  try {
    const db = await openPdfDatabase();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Dokümanı sil
export async function removeClientPdfDoc(id: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const current = getClientPdfDocs();
    const updated = current.filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  try {
    const db = await openPdfDatabase();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
    }
  } catch {}
}

// Sunucudan gelen dokümanlar ile tarayıcıdaki dokümanları akıllıca birleştir
export function mergeClientAndServerDocs(serverDocs: PdfDocument[]): PdfDocument[] {
  const localDocs = getClientPdfDocs();
  const serverMap = new Map<string, PdfDocument>();

  serverDocs.forEach((d) => serverMap.set(d.id, d));

  // Yerel dokümanlar öncelikli olarak başa gelir, sonra sunucu dokümanları eklenir
  const result: PdfDocument[] = [];
  const addedIds = new Set<string>();

  for (const d of localDocs) {
    if (!addedIds.has(d.id)) {
      result.push(d);
      addedIds.add(d.id);
    }
  }

  for (const d of serverDocs) {
    if (!addedIds.has(d.id)) {
      result.push(d);
      addedIds.add(d.id);
    }
  }

  return result;
}
