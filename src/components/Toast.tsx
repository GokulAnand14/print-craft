import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-12 right-6 flex flex-col gap-1.5 z-50 pointer-events-none select-none font-mono text-xs">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`pointer-events-auto flex items-center gap-2 px-3 py-2 rounded shadow-xl border backdrop-blur-md transition-all animate-in slide-in-from-bottom-2 ${
            t.type === 'success'
              ? 'bg-zinc-900/95 border-emerald-500/40 text-emerald-200'
              : t.type === 'error'
              ? 'bg-zinc-900/95 border-rose-500/40 text-rose-200'
              : 'bg-zinc-900/95 border-zinc-700 text-zinc-200'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
          {t.type === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
          {t.type === 'info' && <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
          <span className="text-[11px] font-medium">{t.text}</span>
        </div>
      ))}
    </div>
  );
};
