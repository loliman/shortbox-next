import type { Metadata } from "next";
import AppPageShell from "@/src/components/app-shell/AppPageShell";
import Privacy from "@/src/components/footer/Privacy";
import { createStaticMetadata } from "@/src/lib/routes/metadata";
import { resolveAppPage } from "@/src/lib/routes/app-page";

export const metadata: Metadata = createStaticMetadata(
  "Datenschutz",
  "Datenschutzerklärung von Shortbox."
);

export default async function PrivacyPage() {
  const page = await resolveAppPage({ us: false, includeNavigation: false });

  return (
    <AppPageShell selected={page.selected} level={page.level} us={page.us}>
      <Privacy />
    </AppPageShell>
  );
}
