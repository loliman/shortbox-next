import type { Metadata } from "next";
import { createWorkspaceMetadata } from "@/src/lib/routes/metadata";

export const metadata: Metadata = createWorkspaceMetadata("Kopieren");

export default function CopyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}

