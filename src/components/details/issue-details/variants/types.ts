export type VariantIssue = {
  number?: string | null;
  legacy_number?: string | null;
  comicguideid?: string | number | null;
  format?: string | null;
  variant?: string | null;
  collected?: boolean | null;
  verified?: boolean | null;
  cover?: { url?: string | null } | null;
  stories?: Array<unknown | null> | null;
  storyOwner?: {
    number?: string | null;
    legacy_number?: string | null;
    format?: string | null;
    variant?: string | null;
  } | null;
  variants?: Array<VariantIssue | null> | null;
};
