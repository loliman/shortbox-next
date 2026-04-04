import type { Metadata } from "next";
import { generateSeriesPageMetadata, renderSeriesPage } from "@/app/_shared/catalogPages";

export function generateMetadata(props: Readonly<Parameters<typeof renderSeriesPage>[0]>): Promise<Metadata> {
  return generateSeriesPageMetadata(props, true);
}

export default function UsSeriesPage(props: Readonly<Parameters<typeof renderSeriesPage>[0]>) {
  return renderSeriesPage(props, true);
}
