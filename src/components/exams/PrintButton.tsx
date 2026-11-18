'use client';
export function PrintButton({ label = '🖨️ Yazdır' }: { label?: string }) {
  return <button type="button" className="btn-primary" onClick={() => window.print()}>{label}</button>;
}
