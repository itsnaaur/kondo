"use client";

import { useEffect, useRef } from "react";

export type ConfirmVariant = "primary" | "neutral" | "danger";

const CONFIRM_BUTTON_CLASS: Record<ConfirmVariant, string> = {
  primary: "bg-yellow-400 text-neutral-900 hover:bg-yellow-300",
  neutral: "bg-neutral-100 text-neutral-900 hover:bg-white",
  danger: "bg-red-600 text-white hover:bg-red-500",
};

// A native <dialog> rather than a hand-rolled fixed-position overlay — shown via
// .showModal(), the browser promotes it to the top layer automatically, so it always
// renders above everything regardless of any ancestor's z-index/overflow/transform, with
// no portal needed. It also gets focus-trapping and Escape-to-close for free; the onCancel
// handler below just repoints Escape at the same onCancel prop a backdrop click uses.
export function ConfirmDialog({
  text,
  confirmLabel,
  cancelLabel,
  variant = "primary",
  onConfirm,
  onCancel,
}: {
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
    // showModal() focuses the first focusable element by default, racing with (and
    // sometimes beating) a plain `autoFocus` prop — set focus explicitly instead of
    // relying on that. Danger actions default to Cancel focused, so pressing Enter can't
    // accidentally trigger a destructive confirm; everything else defaults to Confirm for
    // a fast keyboard flow on the common case.
    (variant === "danger" ? cancelRef : confirmRef).current?.focus();
  }, [variant]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        // A click that lands on the <dialog> element itself (not its content) is a click
        // on the backdrop — ::backdrop clicks bubble as the dialog being the target.
        if (e.target === dialogRef.current) onCancel();
      }}
      className="m-auto max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-0 text-neutral-100 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <p className="text-sm leading-relaxed text-neutral-200">{text}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-900"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${CONFIRM_BUTTON_CLASS[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
