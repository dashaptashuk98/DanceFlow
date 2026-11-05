import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const width =
    size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm transition-opacity dark:bg-black/70"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div
        className={`panel relative z-10 w-full ${width} animate-modal-in p-6 shadow-xl`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 id="modal-title" className="font-display text-xl font-semibold text-content">
            {title}
          </h3>
          <button
            type="button"
            className="rounded-md p-1 text-muted transition hover:bg-surface-2 hover:text-content"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <div className="text-sm text-muted">{children}</div>
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Подождите...' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-content/90">{message}</p>
    </Modal>
  );
}

interface AlertBannerProps {
  type?: 'success' | 'error' | 'info';
  children: ReactNode;
  onDismiss?: () => void;
}

export function AlertBanner({ type = 'info', children, onDismiss }: AlertBannerProps) {
  const styles =
    type === 'success'
      ? 'border-teal-soft/30 bg-teal-DEFAULT/10 text-teal-deep dark:text-teal-soft'
      : type === 'error'
        ? 'border-red-400/30 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200'
        : 'border-accent/25 bg-accent/10 text-accent-deep dark:text-accent-soft';

  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm ${styles}`}>
      <div>{children}</div>
      {onDismiss && (
        <button
          type="button"
          className="shrink-0 opacity-60 hover:opacity-100"
          onClick={onDismiss}
          aria-label="Скрыть"
        >
          ✕
        </button>
      )}
    </div>
  );
}
