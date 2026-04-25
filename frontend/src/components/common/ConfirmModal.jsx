import { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

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
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;
  const confirmCls = variant === 'danger' ? 'btn-danger' : 'btn-primary';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className={variant === 'danger' ? 'text-red-500' : 'text-brand-500'} />
            <h3 className="text-base font-semibold">{title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 text-sm text-gray-600">{message}</div>
        <div className="flex justify-end gap-2 border-t p-3">
          <button onClick={onClose} className="btn-secondary" disabled={loading}>{cancelLabel}</button>
          <button onClick={onConfirm} className={confirmCls} disabled={loading}>
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
