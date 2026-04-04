import type { Metadata } from "next";
import { generateIssuePageMetadata, renderIssuePage } from "@/app/_shared/catalogPages";

export function generateMetadata(props: Readonly<Parameters<typeof renderIssuePage>[0]>): Promise<Metadata> {
  return generateIssuePageMetadata(props, true);
}

export default function UsIssuePage(props: Readonly<Parameters<typeof renderIssuePage>[0]>) {
  return renderIssuePage(props, true);
}
