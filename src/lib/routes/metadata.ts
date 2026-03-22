import "server-only";

import type { Metadata } from "next";

const DEFAULT_DESCRIPTION =
  "Shortbox listet deutsche und US-Marvel-Veröffentlichungen serverseitig und detailreich auf.";

export function createPageMetadata(input: {
  title: string;
  description?: string;
}): Metadata {
  const description = input.description || DEFAULT_DESCRIPTION;
  return {
    title: input.title,
    description,
    openGraph: {
      title: input.title,
      description,
      siteName: "Shortbox",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: input.title,
      description,
    },
  };
}

export function createHomeMetadata(us: boolean): Metadata {
  return createPageMetadata({
    title: us ? "US-Ausgaben" : "Deutsche Ausgaben",
    description: us
      ? "Shortbox listet US-Marvel-Ausgaben mit Serien, Heften und Varianten."
      : "Shortbox listet deutsche Marvel-Ausgaben mit Serien, Heften und Varianten.",
  });
}

export function createStaticMetadata(title: string, description: string): Metadata {
  return createPageMetadata({ title, description });
}
