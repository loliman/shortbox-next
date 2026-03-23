import CatalogPageShell from "./CatalogPageShell";
import type { CatalogPageShellProps } from "./CatalogPageShell";

type WorkspacePageShellProps = Omit<
  CatalogPageShellProps,
  | "showNavigation"
  | "initialPublisherNodes"
  | "initialSeriesNodesByPublisher"
  | "initialIssueNodesBySeriesKey"
  | "initialFilterCount"
  | "drawerOpen"
>;

export default function WorkspacePageShell(props: Readonly<WorkspacePageShellProps>) {
  return (
    <CatalogPageShell
      {...props}
      showNavigation={false}
      lockViewportHeight={props.lockViewportHeight ?? false}
    />
  );
}
