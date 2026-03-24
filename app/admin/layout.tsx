import type { Metadata } from "next";
import { createWorkspaceMetadata } from "@/src/lib/routes/metadata";

export const metadata: Metadata = createWorkspaceMetadata("Administration");

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}

