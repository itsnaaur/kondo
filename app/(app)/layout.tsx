import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";

// Every route under this layout is authenticated and needs a live, per-request client
// list (not a build-time snapshot) — without this, Next tries to statically prerender
// pages like /clients/new at build time, running this Prisma query with no reachable
// database and failing the whole build (confirmed live on Vercel: P1001, can't reach
// 127.0.0.1:5432, since there's obviously no Postgres listening during the build step).
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, status: true },
    take: 50,
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black">
      <TopNav />
      <div className="flex min-h-0 flex-1">
        <Sidebar clients={clients} />
        <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
