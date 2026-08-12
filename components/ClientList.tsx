"use client";

import { useState } from "react";
import Link from "next/link";
import { STATUS_LABEL } from "@/lib/labels";

const PAGE_SIZE = 5;

type DashboardClient = {
  id: string;
  name: string;
  siteUrl: string;
  status: string;
  createdBy: { email: string | null; id: string } | null;
};

// The dashboard used to render every client in one long <ul> — fine with a handful of
// clients, but confirmed this becomes a genuinely long scroll once a team has been using
// Kondo for a while. Paginated client-side (not a ?page= server param) so "See more" is
// instant with no navigation/reload, same pattern as the sidebar's own client list
// (components/Sidebar.tsx) — deliberately mirrored rather than invented fresh, so the two
// client lists in this app behave identically.
export function ClientList({ clients }: { clients: DashboardClient[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleClients = clients.slice(0, visibleCount);
  const hasMore = visibleCount < clients.length;

  return (
    <ul className="space-y-3">
      {visibleClients.map((client) => (
        <li key={client.id}>
          <Link
            href={`/clients/${client.id}`}
            className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-5 py-4 transition hover:border-neutral-700"
          >
            <div>
              <p className="font-medium text-neutral-100">{client.name}</p>
              <p className="text-sm text-neutral-500">{client.siteUrl}</p>
              {client.createdBy && (
                <p className="text-xs text-neutral-600">
                  Added by {client.createdBy.email ?? client.createdBy.id}
                </p>
              )}
            </div>
            <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
              {STATUS_LABEL[client.status] ?? client.status}
            </span>
          </Link>
        </li>
      ))}

      {hasMore && (
        <li>
          <button
            onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
            className="w-full rounded-xl border border-dashed border-neutral-800 px-5 py-3 text-sm text-neutral-500 transition hover:border-neutral-700 hover:text-neutral-300"
          >
            See more ({clients.length - visibleCount} more)
          </button>
        </li>
      )}
    </ul>
  );
}
