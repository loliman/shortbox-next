import { countChangeRequests } from "@/src/lib/read/issue-read";
import { readServerSession } from "@/src/lib/server/session";
import PersistentCatalogShell from "@/src/components/app-shell/PersistentCatalogShell";


export default async function UsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await readServerSession();
  const changeRequestsCount = session?.canAdmin ? await countChangeRequests().catch(() => 0) : 0;

  return (
    <PersistentCatalogShell
      us={true}
      session={session}
      changeRequestsCount={changeRequestsCount}
    >
      {children}
    </PersistentCatalogShell>
  );
}
