import type { Metadata } from "next";
import { generateIssuePageMetadata, renderIssuePage } from "@/app/_shared/catalogPages";

export function generateMetadata(props: Readonly<Parameters<typeof renderIssuePage>[0]>): Promise<Metadata> {
  return generateIssuePageMetadata(props, false);
}

export default function DeIssuePage(props: Readonly<Parameters<typeof renderIssuePage>[0]>) {
  return renderIssuePage(props, false);
}
