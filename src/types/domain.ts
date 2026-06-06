export interface RouteParams {
  publisher?: string;
  series?: string;
  issue?: string;
  format?: string;
  variant?: string;
  // SEO-friendly URL parameters (legacy experiment, kept for compatibility)
  publisherSlug?: string;
  seriesSlug?: string;
  issueNumber?: string;
  formatSlug?: string;
  variantSlug?: string;
}

export interface Arc {
  title?: string | null;
  type?: string | null;
  __typename?: "Arc";
  [key: string]: unknown;
}

export interface Cover {
  url?: string | null;
  parent?: Cover | null;
  __typename?: "Cover";
  [key: string]: unknown;
}

export interface StoryParent {
  issue?: Issue | null;
  [key: string]: unknown;
}

type NullableNodeList<T> = Array<T | null> | null;
type SelectedRootTypeName = "Publisher" | "Series" | "Issue";
type OptionalNumberLike = number | string | null;
type OptionalId = string | number | null;

export interface Story {
  number?: OptionalNumberLike;
  title?: string | null;
  part?: string | null;
  addinfo?: string | null;
  parent?: StoryParent | null;
  issue?: Issue | null;
  children?: NullableNodeList<Story>;
  reprints?: NullableNodeList<Story>;
  reprintOf?: Story | null;
  __typename?: "Story";
  [key: string]: unknown;
}

export interface Publisher {
  id?: OptionalId;
  name?: string | null;
  us?: boolean | null;
  addinfo?: string | null;
  startyear?: number | null;
  endyear?: number | null;
  __typename?: "Publisher";
  [key: string]: unknown;
}

export interface Series {
  id?: OptionalId;
  title?: string | null;
  volume?: number | null;
  startyear?: number | null;
  endyear?: number | null;
  addinfo?: string | null;
  publisher: Publisher;
  __typename?: "Series";
  [key: string]: unknown;
}

/**
 * Variant: die konkrete physische Ausgabe eines Issues.
 * Besitzt: format, variantLabel, price, releaseDate, limitation, isbn,
 *          pages, addInfo, collected, verified, comicGuideId, covers.
 *
 * Hinweis: Das Feld `variant` (statt `variantLabel`) wird in UI-Shapes
 * für Abwärtskompatibilität mit bestehenden Komponenten verwendet.
 */
export interface Variant {
  id?: OptionalId;
  format?: string | null;
  /** Entspricht Prisma-Feld `variantLabel`. In UI-Shapes als `variant` serialisiert. */
  variant?: string | null;
  releasedate?: string | null;
  verified?: boolean | null;
  collected?: boolean | null;
  comicguideid?: OptionalId;
  isbn?: string | null;
  pages?: number | null;
  price?: number | null;
  currency?: string | null;
  limitation?: string | null;
  addinfo?: string | null;
  cover?: Cover | null;
  __typename?: "Variant";
  [key: string]: unknown;
}

/**
 * Issue: die abstrakte Publikationseinheit (das Werk).
 * Besitzt: number, title, series, stories, arcs, individuals, variants.
 * Besitzt NICHT: format, releaseDate, price, collected, comicGuideId, covers.
 *
 * Für UI-Zwecke werden diese Felder aus dem bevorzugten Variant abgeleitet
 * und in die Issue-Shape eingebettet (für Abwärtskompatibilität).
 */
export interface Issue {
  id?: OptionalId;
  number: string;
  legacy_number?: string | null;
  title?: string | null;
  addinfo?: string | null;
  arcs?: NullableNodeList<Arc>;
  stories?: NullableNodeList<Story>;
  variants?: NullableNodeList<Variant>;
  createdat?: string | null;
  updatedat?: string | null;
  series: Series;
  __typename?: "Issue";

  // ---------------------------------------------------------------------------
  // Abwärtskompatibilitäts-Felder: werden aus dem bevorzugten Variant abgeleitet
  // und von Serializer-Funktionen in der read-Schicht befüllt.
  // ---------------------------------------------------------------------------

  /** Aus bevorzugtem Variant: Variant.format */
  format?: string | null;
  /** Aus bevorzugtem Variant: Variant.variantLabel */
  variant?: string | null;
  /** Aus bevorzugtem Variant: Variant.releasedate */
  releasedate?: string | null;
  /** Aus bevorzugtem Variant: Variant.verified */
  verified?: boolean | null;
  /** Aus bevorzugtem Variant: Variant.collected */
  collected?: boolean | null;
  /** Aus bevorzugtem Variant: Variant.comicguideid */
  comicguideid?: OptionalId;
  /** Aus bevorzugtem Variant: Variant.isbn */
  isbn?: string | null;
  /** Aus bevorzugtem Variant: Variant.pages */
  pages?: number | null;
  /** Aus bevorzugtem Variant: Variant.price */
  price?: number | null;
  /** Aus bevorzugtem Variant: Variant.currency */
  currency?: string | null;
  /** Aus bevorzugtem Variant: Variant.limitation */
  limitation?: string | null;
  /** Aus bevorzugtem Variant: Variant.addinfo */
  cover?: Cover | null;
  /** Aus Stories: erstes Original-Cover-Referenz */
  originalStoryCover?: {
    cover?: Cover | null;
    comicguideid?: string | number | null;
  } | null;

  [key: string]: unknown;
}

export interface SelectedRoot {
  us?: boolean;
  publisher?: Publisher;
  series?: Series;
  issue?: Issue;
  __typename?: SelectedRootTypeName;
}
