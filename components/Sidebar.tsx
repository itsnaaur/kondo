"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { moveToTrash } from "@/lib/actions/trash";

type SidebarClient = { id: string; name: string; status: string };

const STATUS_DOT: Record<string, string> = {
  NEW: "bg-neutral-600",
  ANALYZING: "bg-yellow-400",
  ANALYSIS_FAILED: "bg-red-400",
  READY_FOR_REVIEW: "bg-green-400",
};

const PAGE_SIZE = 10;
const COLLAPSE_KEY = "kondo:sidebar-collapsed";

function SidebarToggleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export function Sidebar({ clients }: { clients: SidebarClient[] }) {
  const pathname = usePathname();
  // A lazy initializer reads localStorage during the initial client render instead of
  // an effect that calls setState after mount — avoids both the extra render pass and
  // a visible flash of the default (expanded) state before the stored preference loads.
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  if (collapsed) {
    return (
      <aside className="flex w-14 flex-shrink-0 flex-col items-center border-r border-neutral-800 bg-neutral-950 py-4">
        <button
          onClick={toggleCollapsed}
          title="Expand sidebar"
          className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-900 hover:text-neutral-200"
        >
          <SidebarToggleIcon />
        </button>
      </aside>
    );
  }

  const visibleClients = clients.slice(0, visibleCount);
  const hasMore = visibleCount < clients.length;

  return (
    <aside className="flex w-72 flex-shrink-0 flex-col border-r border-neutral-800 bg-neutral-950">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Clients
        </span>
        <button
          onClick={toggleCollapsed}
          title="Collapse sidebar"
          className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-900 hover:text-neutral-200"
        >
          <SidebarToggleIcon />
        </button>
      </div>

      <div className="px-4 pb-3">
        <Link
          href="/clients/new"
          className="block rounded-lg bg-yellow-400 px-3 py-2 text-center text-sm font-medium text-neutral-900 transition hover:bg-yellow-300"
        >
          + New client
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <ul className="space-y-0.5">
          {visibleClients.map((client) => {
            const href = `/clients/${client.id}`;
            const active = pathname === href;
            return (
              <li key={client.id} className="relative">
                <div
                  className={`flex items-center gap-1 rounded-lg pr-1 transition ${
                    active ? "bg-neutral-900" : "hover:bg-neutral-900"
                  }`}
                >
                  <Link
                    href={href}
                    className={`flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-sm ${
                      active ? "text-neutral-100" : "text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                        STATUS_DOT[client.status] ?? "bg-neutral-600"
                      }`}
                    />
                    <span className="truncate">{client.name}</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setOpenMenuId((id) => (id === client.id ? null : client.id))}
                    title="Client options"
                    className="flex-shrink-0 rounded-lg p-1.5 text-neutral-600 transition hover:bg-neutral-800 hover:text-neutral-300"
                  >
                    <KebabIcon />
                  </button>
                </div>

                {openMenuId === client.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                    <div className="absolute right-2 top-full z-20 mt-1 w-40 rounded-lg border border-neutral-800 bg-neutral-900 py-1 shadow-lg">
                      <form action={moveToTrash.bind(null, client.id)}>
                        <button
                          type="submit"
                          className="w-full px-3 py-2 text-left text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-red-400"
                        >
                          Move to trash
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </li>
            );
          })}

          {clients.length === 0 && (
            <li className="px-3 py-2 text-sm text-neutral-600">No clients yet.</li>
          )}

          {hasMore && (
            <li>
              <button
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-500 transition hover:bg-neutral-900 hover:text-neutral-300"
              >
                See more
              </button>
            </li>
          )}
        </ul>
      </nav>

      <div className="flex-shrink-0 border-t border-neutral-900 px-2 py-2">
        <Link
          href="/trash"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
            pathname === "/trash"
              ? "bg-neutral-900 text-neutral-100"
              : "text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300"
          }`}
        >
          <TrashIcon />
          Trash
        </Link>
      </div>
    </aside>
  );
}
