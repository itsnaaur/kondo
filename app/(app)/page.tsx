import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { purgeExpiredTrash } from "@/lib/actions/trash";
import { ClientList } from "@/components/ClientList";

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
        <ClientList clients={clients} />
      )}
    </main>
  );
}
