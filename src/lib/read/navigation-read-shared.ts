import { compareIssueVariants, normalizeText } from "./issue-read-shared";

type NavigationGroupIssue = {
  format?: string | null;
  variant?: string | null;
  id?: bigint | number | string | null;
};

export function pickPrimaryNavigationIssue<T extends NavigationGroupIssue>(issues: T[]): T {
  const preferred = [...issues].sort((left, right) => {
    const leftVariant = normalizeText(left.variant);
    const rightVariant = normalizeText(right.variant);

    if (leftVariant === "" && rightVariant !== "") return -1;
    if (leftVariant !== "" && rightVariant === "") return 1;

    return compareIssueVariants(left, right);
  });

  return preferred[0];
}
