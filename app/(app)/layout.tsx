import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";

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
