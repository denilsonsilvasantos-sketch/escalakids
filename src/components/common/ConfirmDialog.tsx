import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  details?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' (default) for destructive actions, 'warning' for high-impact but non-destructive ones. */
  tone?: 'danger' | 'warning';
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Shared, app-styled replacement for window.confirm(). Native browser confirm()
 * dialogs can't be styled, look inconsistent with the rest of the UI, and (in some
 * embedded/automated browser contexts) are silently auto-dismissed — which made a
 * couple of destructive actions in this app effectively unusable or unsafe.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  details,
  confirmLabel = 'Sim, Excluir',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  isConfirming = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const Icon = tone === 'danger' ? AlertTriangle : ShieldAlert;
  const iconClasses = tone === 'danger' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100';
  const confirmButtonClasses =
    tone === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300'
      : 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300';

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-start space-x-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${iconClasses}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-900 font-display">{title}</h3>
            <p className="text-xs text-slate-600 mt-1">{message}</p>
          </div>
        </div>

        {details && details.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
            {details.map((d, i) => (
              <p key={i}>• {d}</p>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end space-x-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-sm transition-all ${confirmButtonClasses}`}
          >
            {isConfirming ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
