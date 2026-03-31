export type NavigationPreloadOptions = {
  seriesNodes?: boolean;
  issueNodes?: boolean;
};

export function resolveNavigationPreloadOptions(preload?: NavigationPreloadOptions) {
  return {
    seriesNodes: preload?.seriesNodes ?? true,
    issueNodes: preload?.issueNodes ?? true,
  };
}
