import type { Metadata } from "next";
import "./globals.css";
import App from "@/src/components/App";
import { IssueService } from "@/src/services/IssueService";

export const metadata: Metadata = {
  title: "Shortbox",
  description: "Shortbox"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const changeRequestsCount = await new IssueService().countChangeRequests().catch(() => 0);

  return (
    <html lang="de" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <App changeRequestsCount={changeRequestsCount}>{children}</App>
      </body>
    </html>
  );
}
