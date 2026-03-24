import type { Metadata } from "next";
import WorkspacePageShell from "@/src/components/app-shell/WorkspacePageShell";
import Login from "@/src/components/Login";
import { resolveWorkspacePage } from "@/src/lib/routes/app-page";
import { createStaticMetadata } from "@/src/lib/routes/metadata";

export const metadata: Metadata = createStaticMetadata(
  "Login",
  "Login für redaktionelle Funktionen und Bearbeitung in Shortbox.",
  { noIndex: true, canonical: "/login" }
);

export default async function LoginPage() {
  const page = await resolveWorkspacePage({ us: false, session: "optional" });

  return (
    <WorkspacePageShell
      selected={page.selected}
      level={page.level}
      us={page.us}
      query={page.query}
      session={page.session}
    >
      <Login />
    </WorkspacePageShell>
  );
}
