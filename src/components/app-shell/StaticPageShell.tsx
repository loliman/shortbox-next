import WorkspacePageShell from "./WorkspacePageShell";
import type { CatalogPageShellProps } from "./CatalogPageShell";

type StaticPageShellProps = Omit<
  CatalogPageShellProps,
  | "showNavigation"
  | "initialPublisherNodes"
  | "initialSeriesNodesByPublisher"
  | "initialIssueNodesBySeriesKey"
  | "initialFilterCount"
  | "drawerOpen"
  | "changeRequestsCount"
>;

export default function StaticPageShell(props: Readonly<StaticPageShellProps>) {
  return <WorkspacePageShell {...props} />;
}
