import type { Metadata } from "next";
import { createWorkspaceMetadata } from "@/src/lib/routes/metadata";

export const metadata: Metadata = createWorkspaceMetadata("Erstellen");

export default function CreateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}

