import type { HierarchyLevelType } from "../util/hierarchy";
import type { SelectedRoot } from "./domain";

export type RouteQuery = Record<string, unknown>;

export interface LayoutRouteData {
  selected: SelectedRoot;
  level: HierarchyLevelType;
  us: boolean;
  query?: RouteQuery | null;
  initialFilterCount?: number | null;
}
