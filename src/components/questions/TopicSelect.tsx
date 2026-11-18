'use client';
import { GRADES, gradeLabel } from '@/lib/labels';
import { useMemo, useState } from 'react';

export interface TopicOption { id: string; label: string; depth: number; grade: number | null; rootGrade: number | null }

// Önce sınıf, sonra o sınıfın ünite ve konuları (uzun listede kaybolmamak için)
export function TopicSelect({ options, value, onChange, name, id, defaultGrade }: { options: TopicOption[]; value: string; onChange?: (v: string) => void; name?: string; id?: string; defaultGrade?: number | null }) {
  const current = options.find(o => o.id === value);
  const [grade, setGrade] = useState<string>(String(current?.rootGrade ?? defaultGrade ?? ''));
  const shown = useMemo(() => options.filter(o => !grade || String(o.rootGrade) === grade), [options, grade]);
  return (
    <div className="flex gap-2">
      <select aria-label="Sınıf" value={grade} onChange={e => setGrade(e.target.value)} className="input w-28 shrink-0">
        <option value="">Tümü</option>{GRADES.map(g => <option key={g} value={g}>{gradeLabel(g)}</option>)}
      </select>
      <select id={id} name={name} value={value} onChange={e => onChange?.(e.target.value)} className="input min-w-0">
        <option value="">Konu seçilmedi</option>
        {shown.map(o => <option key={o.id} value={o.id}>{' '.repeat(o.depth * 3)}{o.label}</option>)}
      </select>
    </div>
  );
}
