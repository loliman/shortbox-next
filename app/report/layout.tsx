import type { Metadata } from "next";
import { createWorkspaceMetadata } from "@/src/lib/routes/metadata";

export const metadata: Metadata = createWorkspaceMetadata("Melden");

export default function ReportLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}

