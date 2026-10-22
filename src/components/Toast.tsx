import React, { useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  text: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<{
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (paused) return;
    const duration = 4500;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(interval);
          onDismiss(toast.id);
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [paused, toast.id, onDismiss]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="status"
      className={`pointer-events-auto relative overflow-hidden flex flex-col p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 ${
        toast.type === 'error'
          ? 'bg-stone-900 text-stone-50 border-rose-900/60'
          : toast.type === 'success'
          ? 'bg-stone-900 text-stone-50 border-stone-800'
          : 'bg-stone-900 text-stone-50 border-stone-800'
      }`}
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0 pr-1">
          {toast.type === 'error' && (
            <span className="text-rose-400 font-bold shrink-0">✕</span>
          )}
          {toast.type === 'success' && (
            <span className="text-emerald-400 font-bold shrink-0">✓</span>
          )}
          {toast.type === 'info' && (
            <span className="text-amber-400 font-bold shrink-0">ℹ</span>
          )}
          <span className="font-medium leading-snug break-words">{toast.text}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
              className="px-2 py-0.5 text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white rounded cursor-pointer transition-colors"
            >
              {toast.action.label}
            </button>
          )}

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-stone-400 hover:text-white transition-colors p-1 cursor-pointer text-xs"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 transition-all duration-75 ${
          toast.type === 'error'
            ? 'bg-rose-500'
            : toast.type === 'success'
            ? 'bg-emerald-500'
            : 'bg-amber-500'
        }`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] sm:w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
