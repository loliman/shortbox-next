/**
 * Orchestrates all conflict resolution rules for filter flag inputs.
 *
 * This module encapsulates the domain knowledge of which filter flag pairs
 * conflict with each other and which prioritization rules apply when multiple
 * conflicting flags are set simultaneously.
 *
 * Primitives are provided by filter-conflict-resolution.ts.
 * Callers (e.g. parseFilterValues) should use resolveFilterConflicts instead
 * of calling the primitives directly.
 */

import { resolveCollectionMode, resolveNegatablePair } from "./filter-conflict-resolution";

/**
 * Raw flag input: all conflict-relevant filter fields, typed as unknown
 * so callers can pass a parsed JSON object without prior narrowing.
 */
export type RawConflictingFilterFlags = {
  firstPrint?: unknown;
  notFirstPrint?: unknown;
  onlyPrint?: unknown;
  notOnlyPrint?: unknown;
  onlyTb?: unknown;
  notOnlyTb?: unknown;
  exclusive?: unknown;
  notExclusive?: unknown;
  reprint?: unknown;
  notReprint?: unknown;
  otherOnlyTb?: unknown;
  notOtherOnlyTb?: unknown;
  onlyOnePrint?: unknown;
  notOnlyOnePrint?: unknown;
  noPrint?: unknown;
  notNoPrint?: unknown;
  onlyCollected?: unknown;
  onlyNotCollected?: unknown;
  onlyNotCollectedNoOwnedVariants?: unknown;
};

/**
 * Resolved flags: all conflict-relevant filter fields after applying
 * the domain-specific resolution rules.
 */
export type ResolvedConflictFlags = {
  firstPrint: boolean;
  notFirstPrint: boolean;
  onlyPrint: boolean;
  notOnlyPrint: boolean;
  onlyTb: boolean;
  notOnlyTb: boolean;
  exclusive: boolean;
  notExclusive: boolean;
  reprint: boolean;
  notReprint: boolean;
  otherOnlyTb: boolean;
  notOtherOnlyTb: boolean;
  onlyOnePrint: boolean;
  notOnlyOnePrint: boolean;
  noPrint: boolean;
  notNoPrint: boolean;
  onlyCollected: boolean;
  onlyNotCollected: boolean;
  onlyNotCollectedNoOwnedVariants: boolean;
};

/**
 * Applies all conflict resolution rules to a raw parsed filter input.
 *
 * Rules applied:
 * - Negatable pairs: when both positive and negative flags are set, positive takes precedence.
 *   Affected pairs: firstPrint/notFirstPrint, onlyPrint/notOnlyPrint, onlyTb/notOnlyTb,
 *   exclusive/notExclusive, reprint/notReprint, otherOnlyTb/notOtherOnlyTb,
 *   onlyOnePrint/notOnlyOnePrint, noPrint/notNoPrint
 * - Collection mode: onlyCollected > onlyNotCollectedNoOwnedVariants > onlyNotCollected
 */
export function resolveFilterConflicts(raw: RawConflictingFilterFlags): ResolvedConflictFlags {
  const [firstPrint, notFirstPrint] = resolveNegatablePair(raw.firstPrint, raw.notFirstPrint);
  const [onlyPrint, notOnlyPrint] = resolveNegatablePair(raw.onlyPrint, raw.notOnlyPrint);
  const [onlyTb, notOnlyTb] = resolveNegatablePair(raw.onlyTb, raw.notOnlyTb);
  const [exclusive, notExclusive] = resolveNegatablePair(raw.exclusive, raw.notExclusive);
  const [reprint, notReprint] = resolveNegatablePair(raw.reprint, raw.notReprint);
  const [otherOnlyTb, notOtherOnlyTb] = resolveNegatablePair(raw.otherOnlyTb, raw.notOtherOnlyTb);
  const [onlyOnePrint, notOnlyOnePrint] = resolveNegatablePair(
    raw.onlyOnePrint,
    raw.notOnlyOnePrint
  );
  const [noPrint, notNoPrint] = resolveNegatablePair(raw.noPrint, raw.notNoPrint);

  const { onlyCollected, onlyNotCollected, onlyNotCollectedNoOwnedVariants } =
    resolveCollectionMode(
      raw.onlyCollected,
      raw.onlyNotCollected,
      raw.onlyNotCollectedNoOwnedVariants
    );

  return {
    firstPrint,
    notFirstPrint,
    onlyPrint,
    notOnlyPrint,
    onlyTb,
    notOnlyTb,
    exclusive,
    notExclusive,
    reprint,
    notReprint,
    otherOnlyTb,
    notOtherOnlyTb,
    onlyOnePrint,
    notOnlyOnePrint,
    noPrint,
    notNoPrint,
    onlyCollected,
    onlyNotCollected,
    onlyNotCollectedNoOwnedVariants,
  };
}

