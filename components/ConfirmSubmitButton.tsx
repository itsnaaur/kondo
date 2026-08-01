"use client";

import { useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmDialog, type ConfirmVariant } from "@/components/ConfirmDialog";

export function ConfirmSubmitButton({
  confirmText,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  pendingLabel,
  className,
  children,
  formAction,
}: {
  confirmText: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  pendingLabel?: string;
  className?: string;
  children: ReactNode;
  // Lets one <form> offer more than one submit target (e.g. plain "Save changes" vs a
  // confirmed "Approve") without needing separate <form> elements.
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { pending } = useFormStatus();

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    // Always block the native submit here — confirmation happens in the dialog below, not
    // synchronously in this handler, so there's no way to decide "confirmed or not" yet.
    e.preventDefault();
    setConfirmOpen(true);
  }

  function handleConfirm() {
    setConfirmOpen(false);
    // Re-submit the form as if this button were clicked normally — requestSubmit(button)
    // respects the button's own formAction (or falls back to the form's action, if this
    // button doesn't override it), which is exactly what the skipped native submit above
    // would have done.
    buttonRef.current?.form?.requestSubmit(buttonRef.current);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="submit"
        formAction={formAction}
        onClick={handleClick}
        disabled={pending}
        className={className}
      >
        {pending && pendingLabel ? pendingLabel : children}
      </button>
      {confirmOpen && (
        <ConfirmDialog
          text={confirmText}
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          variant={variant}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}
