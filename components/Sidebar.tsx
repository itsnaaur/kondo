"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarClient = { id: string; name: string; status: string };

const STATUS_DOT: Record<string, string> = {
  DRAFT: "bg-neutral-600",
  AUDITING: "bg-yellow-400",
  AUDIT_READY: "bg-blue-400",
  GENERATING: "bg-yellow-400",
  READY_FOR_REVIEW: "bg-green-400",
  EXPORTED: "bg-green-600",
};

const PAGE_SIZE = 10;
const COLLAPSE_KEY = "kondo:sidebar-collapsed";

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Sidebar({ clients }: { clients: SidebarClient[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
  }, []);

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
          <ChevronRight />
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
          <ChevronLeft />
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
              <li key={client.id}>
                <Link
                  href={href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                    active
                      ? "bg-neutral-900 text-neutral-100"
                      : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                      STATUS_DOT[client.status] ?? "bg-neutral-600"
                    }`}
                  />
                  <span className="truncate">{client.name}</span>
                </Link>
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
          Trash
        </Link>
      </div>
    </aside>
  );
}
