import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import CatalogPageShell from "../app-shell/CatalogPageShell";
import WorkspacePageShell from "../app-shell/WorkspacePageShell";
import FormPageShell from "../form-shell/FormPageShell";
import { HierarchyLevel } from "../../lib/routes/hierarchy";
import { IssueDetailsPreview } from "../details/issue-details/preview/IssueDetailsPreview";
import { DetailsPagePlaceholder } from "./DetailsPagePlaceholder";
import { HomeListingPlaceholder } from "./HomeListingPlaceholder";

type RouteLoadingScreenProps = {
  us: boolean;
};

const BASE_SELECTED = {
  publisher: undefined,
  series: undefined,
  issue: undefined,
} as const;

export function CatalogHomeLoadingScreen(props: Readonly<RouteLoadingScreenProps>) {
  return (
    <CatalogPageShell
      selected={{ ...BASE_SELECTED, us: props.us }}
      level={HierarchyLevel.ROOT}
      us={props.us}
      navigationLoading
    >
      <HomeListingPlaceholder />
    </CatalogPageShell>
  );
}

export function CatalogDetailsLoadingScreen(props: Readonly<RouteLoadingScreenProps>) {
  return (
    <CatalogPageShell
      selected={{ ...BASE_SELECTED, us: props.us }}
      level={HierarchyLevel.ROOT}
      us={props.us}
      navigationLoading
    >
      <DetailsPagePlaceholder compactLayout={false} />
    </CatalogPageShell>
  );
}

export function CatalogIssueLoadingScreen(props: Readonly<RouteLoadingScreenProps>) {
  return (
    <CatalogPageShell
      selected={{ ...BASE_SELECTED, us: props.us }}
      level={HierarchyLevel.ROOT}
      us={props.us}
      navigationLoading
    >
      <IssueDetailsPreview />
    </CatalogPageShell>
  );
}

export function FilterPageLoadingScreen(props: Readonly<RouteLoadingScreenProps>) {
  return (
    <WorkspacePageShell
      selected={{ ...BASE_SELECTED, us: props.us }}
      level={HierarchyLevel.ROOT}
      us={props.us}
    >
      <FormPageShell
        title={<Skeleton variant="text" width={96} height={36} />}
        headerCenter={<Skeleton variant="rounded" width="100%" height={46} />}
      >
        <Stack spacing={2.25}>
          <Box
            sx={{
              borderRadius: 3,
              border: 1,
              borderColor: "divider",
              overflow: "hidden",
              backgroundColor: "background.paper",
            }}
          >
            <CardContent sx={{ pt: 3 }}>
              <Stack spacing={2}>
                <Skeleton variant="text" width={120} height={28} />
                <Skeleton variant="rounded" width="100%" height={56} />
                <Skeleton variant="rounded" width="100%" height={56} />
                <Skeleton variant="rounded" width="100%" height={56} />
              </Stack>
            </CardContent>
          </Box>

          <Box
            sx={{
              position: "sticky",
              bottom: 0,
              zIndex: 1,
              display: "flex",
              justifyContent: "flex-end",
              gap: 1.25,
              py: 1,
            }}
          >
            <Skeleton variant="rounded" width={120} height={40} />
            <Skeleton variant="rounded" width={140} height={40} />
          </Box>
        </Stack>
      </FormPageShell>
    </WorkspacePageShell>
  );
}
