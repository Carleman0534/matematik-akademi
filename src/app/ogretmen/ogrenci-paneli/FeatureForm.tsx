'use client';

import { useActionState } from 'react';
import { STUDENT_FEATURES, DEFAULT_VISIBLE_FEATURES } from '@/lib/studentFeatures';
import { saveStudentFeatures, type FeatureState } from './actions';

export function FeatureForm({ visible }: { visible: string[] }) {
  const [state, action, pending] = useActionState<FeatureState, FormData>(saveStudentFeatures, {});

  return (
    <form action={action} className="space-y-4">
      <div className="divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {STUDENT_FEATURES.map(f => (
          <label key={f.key} className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
            <input
              type="checkbox"
              name="feature"
              value={f.key}
              defaultChecked={visible.includes(f.key)}
              className="h-4 w-4 accent-indigo-600"
            />
            <span className="text-lg">{f.icon}</span>
            <span className="min-w-0 flex-1">
              <b className="block text-sm text-slate-900 dark:text-white">
                {f.label}
                {DEFAULT_VISIBLE_FEATURES.includes(f.key) && (
                  <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">varsayılan açık</span>
                )}
              </b>
              <span className="block text-xs text-slate-500">{f.description}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          disabled={pending}
          className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {state.ok && <span className="text-xs font-semibold text-emerald-600">{state.ok}</span>}
        {state.error && <span className="text-xs font-semibold text-rose-600">{state.error}</span>}
      </div>
    </form>
  );
}
