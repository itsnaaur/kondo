import { prisma } from "@/lib/prisma";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { purgeExpiredTrash, restoreFromTrash, permanentlyDeleteClient } from "@/lib/actions/trash";
import { daysUntilPurge, TRASH_RETENTION_DAYS } from "@/lib/trash-utils";

export default async function TrashPage() {
  await purgeExpiredTrash();

  const clients = await prisma.client.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-100">Trash</h1>
        <p className="text-sm text-neutral-400">
          Deleted clients stay here for {TRASH_RETENTION_DAYS} days before being permanently
          removed.
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-800 px-6 py-16 text-center text-neutral-500">
          Trash is empty.
        </div>
      ) : (
        <ul className="space-y-3">
          {clients.map((client) => (
            <li
              key={client.id}
              className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-5 py-4"
            >
              <div>
                <p className="font-medium text-neutral-100">{client.name}</p>
                <p className="text-sm text-neutral-500">{client.siteUrl}</p>
                <p className="text-xs text-neutral-600">
                  {daysUntilPurge(client.deletedAt!)} day
                  {daysUntilPurge(client.deletedAt!) === 1 ? "" : "s"} left before permanent
                  deletion
                </p>
              </div>
              <div className="flex gap-2">
                <form action={restoreFromTrash.bind(null, client.id)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 transition hover:border-neutral-500"
                  >
                    Restore
                  </button>
                </form>
                <form action={permanentlyDeleteClient.bind(null, client.id)}>
                  <ConfirmSubmitButton
                    confirmText={`Permanently delete "${client.name}"? This cannot be undone.`}
                    confirmLabel="Delete permanently"
                    variant="danger"
                    pendingLabel="Deleting..."
                    className="rounded-lg border border-red-900 px-3 py-1.5 text-sm text-red-400 transition hover:border-red-700 hover:text-red-300"
                  >
                    Delete permanently
                  </ConfirmSubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
