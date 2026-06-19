import { useEffect, useId, useRef } from 'react';
import { X, AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';
import ModalPortal from './ModalPortal';

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Confirmation',
  message = 'Êtes-vous sûr de vouloir continuer ?',
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'primary',
  loading = false,
}) {
  const titleId   = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && !loading && onClose?.();
    if (open) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose, loading]);

  // À l'ouverture, on déplace le focus dans la boîte de dialogue (lecteurs d'écran + clavier).
  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const isDanger = variant === 'danger';
  const Icon = isDanger ? AlertTriangle : HelpCircle;
  const iconBg = isDanger
    ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
    : 'bg-brand-50 dark:bg-brand-900/20 text-brand-500';
  const confirmCls = isDanger ? 'btn-danger' : 'btn-primary';

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby={titleId}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !loading && onClose?.()}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden outline-none"
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-5 border-b border-gray-100 dark:border-gray-800">
          <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id={titleId} className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          </div>
          <button
            onClick={() => !loading && onClose?.()}
            disabled={loading}
            aria-label="Fermer"
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {message}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <button onClick={onClose} className="btn-secondary" disabled={loading}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={confirmCls} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
