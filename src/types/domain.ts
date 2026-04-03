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

export interface Story {
  number?: number | string | null;
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
  id?: string | number | null;
  name?: string | null;
  us?: boolean | null;
  addinfo?: string | null;
  startyear?: number | null;
  endyear?: number | null;
  __typename?: "Publisher";
  [key: string]: unknown;
}

export interface Series {
  id?: string | number | null;
  title?: string | null;
  volume?: number | null;
  startyear?: number | null;
  endyear?: number | null;
  addinfo?: string | null;
  publisher: Publisher;
  __typename?: "Series";
  [key: string]: unknown;
}

export interface Issue {
  id?: string | number | null;
  number: string;
  legacy_number?: string | null;
  title?: string | null;
  format?: string | null;
  variant?: string | null;
  releasedate?: string | null;
  verified?: boolean | null;
  collected?: boolean | null;
  addinfo?: string | null;
  comicguideid?: string | number | null;
  isbn?: string | null;
  pages?: number | null;
  price?: number | null;
  currency?: string | null;
  limitation?: string | null;
  cover?: Cover | null;
  arcs?: NullableNodeList<Arc>;
  stories?: NullableNodeList<Story>;
  variants?: NullableNodeList<Issue>;
  createdat?: string | null;
  updatedat?: string | null;
  series: Series;
  __typename?: "Issue";
  [key: string]: unknown;
}

export interface SelectedRoot {
  us?: boolean;
  publisher?: Publisher;
  series?: Series;
  issue?: Issue;
  __typename?: SelectedRootTypeName;
}
