"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

const DEFAULT_CLASS =
  "rounded-lg bg-yellow-400 px-5 py-2.5 font-medium text-neutral-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60";

// A bare <button type="submit"> gives no feedback while a server action is in flight —
// on a slow action (crawl/audit/generation enqueue, several DB writes plus an audit-log
// write before the redirect) that reads as "did that not work?" and invites clicking
// again, which can enqueue the same job more than once (confirmed live: approving a
// design spec 3 times produced 2 separate GENERATION jobs). useFormStatus reads the
// nearest ancestor <form>'s pending state, so this works as a drop-in replacement even
// though the <form action={...}> itself is defined in a parent Server Component.
export function SubmitButton({
  children,
  pendingLabel,
  className = DEFAULT_CLASS,
  formAction,
}: {
  children: ReactNode;
  pendingLabel: string;
  className?: string;
  // Lets one <form> offer more than one submit target (e.g. "Save changes" vs
  // "Approve") without needing separate <form> elements — the button's own formAction
  // overrides the form's action when this one is what gets clicked.
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" formAction={formAction} disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
