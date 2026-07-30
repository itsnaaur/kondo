"use client";

import type { ReactNode, MouseEvent } from "react";

export function ConfirmSubmitButton({
  confirmText,
  className,
  children,
  formAction,
}: {
  confirmText: string;
  className?: string;
  children: ReactNode;
  // Lets one <form> offer more than one submit target (e.g. plain "Save changes" vs a
  // confirmed "Approve") without needing separate <form> elements.
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (!confirm(confirmText)) {
      e.preventDefault();
    }
  }

  return (
    <button type="submit" formAction={formAction} onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
