import { generatePublisherSlug } from "../slug-builder";

export type PublisherSelectionInput = {
  us: boolean;
  publisher: string;
};

type PublisherSelectionCandidate = {
  name?: unknown;
  original?: unknown;
  us?: unknown;
};

export function matchesPublisherSelectionBySlug(
  candidate: PublisherSelectionCandidate,
  selection: PublisherSelectionInput
): boolean {
  const candidateUs = candidate.original ?? candidate.us ?? null;
  if (Boolean(candidateUs) !== Boolean(selection.us)) return false;

  const candidateName = typeof candidate.name === "string" ? candidate.name : "";
  const candidateSlug = generatePublisherSlug(candidateName);
  const expectedSlug = generatePublisherSlug(selection.publisher);
  return candidateSlug !== "" && candidateSlug === expectedSlug;
}


