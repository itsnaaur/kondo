import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { STATUS_LABEL } from "@/lib/labels";
import { purgeExpiredTrash } from "@/lib/actions/trash";

export default async function DashboardPage() {
  await purgeExpiredTrash();

  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { createdBy: true },
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">Clients</h1>
          <p className="text-sm text-neutral-400">
            Every facelift in progress, and every one that&apos;s shipped.
          </p>
        </div>
        <Link
          href="/clients/new"
          className="rounded-lg bg-yellow-400 px-4 py-2 font-medium text-neutral-900 transition hover:bg-yellow-300"
        >
          + New client
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-800 px-6 py-16 text-center text-neutral-500">
          No clients yet. Add one to get started.
        </div>
      ) : (
        <ul className="space-y-3">
          {clients.map((client) => (
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
        </ul>
      )}
    </main>
  );
}
