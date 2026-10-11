import { useEffect, useRef } from 'react';

const getFocusableElements = (container) => Array.from(
  container?.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  ) || []
);

export default function RoutingDialog({
  titleId,
  onClose,
  children,
  maxWidth = 'max-w-md',
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const firstFocusable = getFocusableElements(dialog)[0];
    (firstFocusable || dialog)?.focus();

    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements(dialogRef.current);
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white`}
      >
        {children}
      </section>
    </div>
  );
}
