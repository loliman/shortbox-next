import "server-only";

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
  return String((entry as { name?: unknown }).name ?? "");
}

function readEntryTitle(entry: unknown): string {
  if (!entry || typeof entry !== "object") return "";
  return String((entry as { title?: unknown }).title ?? "");
}

export async function resolveSeoFilterLanding(
  input: ResolveInput
): Promise<ResolvedSeoFilterLanding | null> {
  const safeSlug = validateSlug(input.slug);
  if (!safeSlug) return null;

  if (input.kind === "person") {
    const parsed = parsePersonSlug(safeSlug);
    if (!parsed) return null;

    const list = await readAutocompleteItems({
      source: "individuals",
      variables: { pattern: parsed },
      offset: 0,
      limit: 250,
    });

    const match = list.items.find((entry) => generatePersonSlug(readEntryName(entry)) === safeSlug) as
      | { name?: string }
      | undefined;

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

    const list = await readAutocompleteItems({
      source: "arcs",
      variables: { pattern: parsed },
      offset: 0,
      limit: 250,
    });

    const match = list.items.find((entry) => generateArcSlug(readEntryTitle(entry)) === safeSlug) as
      | { title?: string }
      | undefined;

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
    const parsed = parseAppearanceSlug(safeSlug);
    if (!parsed) return null;

    const list = await readAutocompleteItems({
      source: "apps",
      variables: { pattern: parsed },
      offset: 0,
      limit: 250,
    });

    const match = list.items.find(
      (entry) => generateAppearanceSlug(readEntryName(entry)) === safeSlug
    ) as { name?: string } | undefined;

    if (!match?.name) return null;

    return makeResolved({
      us: input.us,
      kind: input.kind,
      canonicalSlug: generateAppearanceSlug(match.name),
      entityLabel: match.name,
      filterPayload: { appearances: [{ name: match.name }] },
    });
  }

  const parsed = parseGenreSlug(safeSlug);
  if (!parsed) return null;

  const list = await readAutocompleteItems({
    source: "genres",
    variables: { pattern: parsed },
    offset: 0,
    limit: 250,
  });

  const match = list.items.find((entry) => generateGenreSlug(readEntryName(entry)) === safeSlug) as
    | { name?: string }
    | undefined;

  if (!match?.name) return null;

  return makeResolved({
    us: input.us,
    kind: input.kind,
    canonicalSlug: generateGenreSlug(match.name),
    entityLabel: match.name,
    filterPayload: { genres: [match.name] },
  });
}
