/**
 * Business rules for resolving conflicts in filter specifications.
 * These pure functions handle cases where multiple related filter flags
 * could apply simultaneously, implementing domain-specific prioritization.
 */

/**
 * Resolves conflicts between positive and negative flag pairs.
 * Business rule: When both are specified, positive takes precedence.
 * When positive is false and negative is truthy, negative applies.
 */
export function resolveNegatablePair(
  positiveValue: unknown,
  negativeValue: unknown
): [boolean, boolean] {
  const positive = Boolean(positiveValue);
  const negative = !positive && Boolean(negativeValue);
  return [positive, negative];
}

/**
 * Resolves conflicts between collection mode flags.
 * Business rule: onlyCollected > onlyNotCollectedNoOwnedVariants > onlyNotCollected
 * When multiple are specified, the most restrictive takes precedence.
 */
export function resolveCollectionMode(
  onlyCollected: unknown,
  onlyNotCollected: unknown,
  onlyNotCollectedNoOwnedVariants: unknown
): { onlyCollected: boolean; onlyNotCollected: boolean; onlyNotCollectedNoOwnedVariants: boolean } {
  const isOnlyCollected = Boolean(onlyCollected);

  const isOnlyNotCollectedNoOwnedVariants =
    !isOnlyCollected &&
    Boolean(onlyNotCollectedNoOwnedVariants);

  const isOnlyNotCollected =
    !isOnlyCollected &&
    !isOnlyNotCollectedNoOwnedVariants &&
    Boolean(onlyNotCollected);

  return {
    onlyCollected: isOnlyCollected,
    onlyNotCollected: isOnlyNotCollected,
    onlyNotCollectedNoOwnedVariants: isOnlyNotCollectedNoOwnedVariants,
  };
}

