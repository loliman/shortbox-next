import { countChangeRequests } from "@/src/lib/read/issue-read";
import { readServerSession } from "@/src/lib/server/session";
import PersistentCatalogShellClient from "@/src/components/app-shell/PersistentCatalogShellClient";

export default async function UsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await readServerSession();
  const changeRequestsCount = session?.canAdmin ? await countChangeRequests().catch(() => 0) : 0;

  return (
    <PersistentCatalogShellClient
      us={true}
      session={session}
      changeRequestsCount={changeRequestsCount}
    >
      {children}
    </PersistentCatalogShellClient>
  );
}
