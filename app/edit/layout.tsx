import type { Metadata } from "next";
import { createWorkspaceMetadata } from "@/src/lib/routes/metadata";

export const metadata: Metadata = createWorkspaceMetadata("Bearbeiten");

export default function EditLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}

