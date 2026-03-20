import type { Issue, Publisher, Series } from "./domain";

export interface DateFilter {
  date?: string | null;
  compare?: string | null;
}

export interface NumberFilter {
  number?: string | number | null;
  compare?: string | null;
}

export interface Filter {
  us?: boolean;
  withVariants?: boolean;
  publishers?: Array<{ name?: string | null } | null>;
  series?: Array<{ title?: string | null; volume?: number | null } | null>;
  numbers?: Array<NumberFilter | null>;
  releasedates?: Array<DateFilter | null>;
  formats?: Array<string | null>;
  genres?: Array<string | null>;
  arcs?: Array<{ title?: string | null } | null>;
  appearances?: Array<{ name?: string | null } | null>;
  noComicguideId?: boolean;
  [key: string]: unknown;
}

export interface Individual {
  name?: string | null;
  type?: Array<string | null> | string | null;
  role?: Array<string | null> | string | null;
  __typename?: "Individual";
  [key: string]: unknown;
}

export interface Edge<T> {
  cursor?: string | null;
  node?: T | null;
}

export interface PageInfo {
  endCursor?: string | null;
  hasNextPage?: boolean | null;
}

export interface Connection<T> {
  edges: Array<Edge<T> | null>;
  pageInfo: PageInfo;
}

export type QueryCollection<T> = Array<T | null> | Connection<T>;

export type SearchNode = (Publisher | Series | Issue | Individual) & {
  label?: string | null;
  url?: string | null;
};

export interface NodesQueryData {
  nodes: Array<SearchNode | null>;
}

export interface PublishersQueryData {
  publishers: QueryCollection<Publisher>;
}

export interface SeriesQueryData {
  series: QueryCollection<Series>;
}

export interface IssuesQueryData {
  issues: QueryCollection<Issue>;
}

export interface IndividualsQueryData {
  individuals: QueryCollection<Individual>;
}

export interface AppsQueryData {
  apps: QueryCollection<unknown>;
}

export interface LastEditedQueryData {
  lastEdited: QueryCollection<Issue>;
}

export type { Issue, Publisher, Series };
