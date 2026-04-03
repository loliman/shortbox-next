import "server-only";

import { prisma } from "../prisma/client";
import {
  generateAppearanceSlug,
  generateArcSlug,
  generateGenreSlug,
  generatePersonSlug,
} from "../slug-builder";
import {
  parseAppearanceSlug,
  parseArcSlug,
  parseGenreSlug,
  parsePersonSlug,
  validateSlug,
} from "../slug-parser";
import { readAutocompleteItems } from "../read/autocomplete-read";

export type SeoFilterKind = "person" | "arc" | "appearance" | "genre";

export interface ResolvedSeoFilterLanding {
  us: boolean;
  kind: SeoFilterKind;
  locale: "de" | "us";
  canonicalPath: string;
  filterQuery: string;
  entityLabel: string;
  metadataTitle: string;
  metadataDescription: string;
}

type ResolveInput = {
  us: boolean;
  kind: SeoFilterKind;
  slug: string | null | undefined;
};

const SEO_AUTOCOMPLETE_PAGE_SIZE = 250;
const SEO_APPEARANCE_SCAN_BATCH_SIZE = 2000;

function localeFromUs(us: boolean): "de" | "us" {
  return us ? "us" : "de";
}

function buildMetadataForKind(kind: SeoFilterKind, entityLabel: string) {

  if (kind === "person") {
    return {
      title: `${entityLabel} - Comics, Stories und Auftritte`,
      description: `${entityLabel}: Comics, Stories und Auftritte in Shortbox mit direkten Treffern auf Ausgaben und Details.`,
    };
  }

  if (kind === "arc") {
    return {
      title: `${entityLabel} - Story-Arc-Ausgaben und Veroeffentlichungen`,
      description: `${entityLabel}: Story-Arc-Ausgaben und Veroeffentlichungen in Shortbox mit Hefttreffern und Release-Details.`,
    };
  }

  if (kind === "appearance") {
    return {
      title: `${entityLabel} - Comic-Auftritte und Veroeffentlichungen`,
      description: `${entityLabel}: Comic-Auftritte und zugehoerige Veroeffentlichungen in Shortbox mit direkten Ausgabe-Treffern.`,
    };
  }

  return {
    title: `${entityLabel} - Comics und Stories nach Genre`,
    description: `${entityLabel}: Genre-Ausgaben und Stories in Shortbox mit Serienkontext und direkten Hefttreffern.`,
  };
}

function makeResolved(input: {
  us: boolean;
  kind: SeoFilterKind;
  canonicalSlug: string;
  entityLabel: string;
  filterPayload: Record<string, unknown>;
}): ResolvedSeoFilterLanding {
  const locale = localeFromUs(input.us);
  const canonicalPath = `/${locale}/${input.kind}/${input.canonicalSlug}`;
  const filterPayload = { ...input.filterPayload, us: input.us };

  const metadata = buildMetadataForKind(input.kind, input.entityLabel);

  return {
    us: input.us,
    kind: input.kind,
    locale,
    canonicalPath,
    filterQuery: JSON.stringify(filterPayload),
    entityLabel: input.entityLabel,
    metadataTitle: metadata.title,
    metadataDescription: metadata.description,
  };
}

function readEntryName(entry: unknown): string {
  if (!entry || typeof entry !== "object") return "";
  return readTextValue((entry as { name?: unknown }).name);
}

function readEntryTitle(entry: unknown): string {
  if (!entry || typeof entry !== "object") return "";
  return readTextValue((entry as { title?: unknown }).title);
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

async function findAutocompleteMatch<TEntry>(
  input: {
    source: "individuals" | "arcs" | "apps" | "genres";
    variables: Record<string, unknown>;
    matches: (entry: TEntry) => boolean;
  }
): Promise<TEntry | null> {
  let offset = 0;

  while (true) {
    const list = await readAutocompleteItems({
      source: input.source,
      variables: input.variables,
      offset,
      limit: SEO_AUTOCOMPLETE_PAGE_SIZE,
    });

    const match = list.items.find((entry) => input.matches(entry as TEntry));
    if (match) return match as TEntry;
    if (!list.hasMore) return null;

    offset += SEO_AUTOCOMPLETE_PAGE_SIZE;
  }
}

async function findAppearanceNameBySlug(slug: string): Promise<string | null> {
  let cursor: bigint | undefined;

  while (true) {
    const rows = await prisma.appearance.findMany({
      orderBy: { id: "asc" },
      take: SEO_APPEARANCE_SCAN_BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, name: true },
    });

    if (rows.length === 0) return null;
    cursor = rows.at(-1)?.id;

    const match = rows.find((row) => generateAppearanceSlug(row.name) === slug);
    if (match?.name) return match.name;
  }
}

export async function resolveSeoFilterLanding(
  input: ResolveInput
): Promise<ResolvedSeoFilterLanding | null> {
  const safeSlug = validateSlug(input.slug);
  if (!safeSlug) return null;

  if (input.kind === "person") {
    const parsed = parsePersonSlug(safeSlug);
    if (!parsed) return null;

    const match = await findAutocompleteMatch<{ name?: string }>({
      source: "individuals",
      variables: { pattern: parsed },
      matches: (entry) => generatePersonSlug(readEntryName(entry)) === safeSlug,
    });

    if (!match?.name) return null;

    return makeResolved({
      us: input.us,
      kind: input.kind,
      canonicalSlug: generatePersonSlug(match.name),
      entityLabel: match.name,
      filterPayload: { individuals: [{ name: match.name }] },
    });
  }

  if (input.kind === "arc") {
    const parsed = parseArcSlug(safeSlug);
    if (!parsed) return null;

    const match = await findAutocompleteMatch<{ title?: string }>({
      source: "arcs",
      variables: { pattern: parsed },
      matches: (entry) => generateArcSlug(readEntryTitle(entry)) === safeSlug,
    });

    if (!match?.title) return null;

    return makeResolved({
      us: input.us,
      kind: input.kind,
      canonicalSlug: generateArcSlug(match.title),
      entityLabel: match.title,
      filterPayload: { arcs: [{ title: match.title }] },
    });
  }

  if (input.kind === "appearance") {
    const matchName = await findAppearanceNameBySlug(safeSlug);
    if (!matchName) return null;

    return makeResolved({
      us: input.us,
      kind: input.kind,
      canonicalSlug: generateAppearanceSlug(matchName),
      entityLabel: matchName,
      filterPayload: { appearances: [{ name: matchName }] },
    });
  }

  const parsed = parseGenreSlug(safeSlug);
  if (!parsed) return null;

  const match = await findAutocompleteMatch<{ name?: string }>({
    source: "genres",
    variables: { pattern: parsed },
    matches: (entry) => generateGenreSlug(readEntryName(entry)) === safeSlug,
  });

  if (!match?.name) return null;

  return makeResolved({
    us: input.us,
    kind: input.kind,
    canonicalSlug: generateGenreSlug(match.name),
    entityLabel: match.name,
    filterPayload: { genres: [match.name] },
  });
}
