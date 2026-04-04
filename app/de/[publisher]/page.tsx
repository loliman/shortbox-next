import type { Metadata } from "next";
import { generatePublisherPageMetadata, renderPublisherPage } from "@/app/_shared/catalogPages";

export function generateMetadata(props: Readonly<Parameters<typeof renderPublisherPage>[0]>): Promise<Metadata> {
  return generatePublisherPageMetadata(props, false);
}

export default function DePublisherPage(props: Readonly<Parameters<typeof renderPublisherPage>[0]>) {
  return renderPublisherPage(props, false);
}
