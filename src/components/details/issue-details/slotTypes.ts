import type React from "react";
import type { SessionData } from "../../../app/session";
import type { RouteQuery } from "../../../types/route-ui";
import type { QueryParams } from "./contains/expanded";

export type IssueDetailsSlotProps = {
  issue?: unknown;
  query?: RouteQuery | null;
  us?: boolean;
  session?: SessionData | null;
  selected?: unknown;
  [key: string]: unknown;
};

export type IssueDetailsSlotComponent = React.ComponentType<any>;

export type ContainsTitleSlotProps = {
  item: unknown;
  query?: QueryParams;
  us?: boolean;
  simple?: boolean;
  [key: string]: unknown;
};

export type ContainsTitleSlotComponent = React.ComponentType<any>;

export type ContainsDetailsSlotProps = {
  item: unknown;
  query?: QueryParams;
  us?: boolean;
  [key: string]: unknown;
};

export type ContainsDetailsSlotComponent = React.ComponentType<any>;
