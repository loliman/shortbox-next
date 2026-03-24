import React from "react";
import { useRouter } from "next/navigation";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import { generateLabel, generateSeoUrl, HierarchyLevel } from "../../util/hierarchy";
import CoverTooltip from "./CoverTooltip";
import type { SelectedRoot } from "../../types/domain";
import { buildRouteHref } from "../generic/routeHref";

type ListEntryItem = {
  __typename?: "Issue" | "Series" | "Publisher";
  number?: string;
  title?: string;
  format?: string;
  variant?: string;
  collected?: boolean;
  variants?: Array<{ collected?: boolean }>;
  name?: string;
  series?: {
    title?: string;
    volume?: number | string;
    publisher?: { name?: string };
  };
  publisher?: { name?: string };
};

interface TypeListEntryProps {
  us?: boolean;
  item: ListEntryItem;
  level?: string;
  idx?: number;
  toggleDrawer?: () => void;
  isPhonePortrait?: boolean;
  isPhone?: boolean;
  isPhoneLandscape?: boolean;
  session?: unknown;
  selected?: SelectedRoot;
  query?: { filter?: string | null } | null;
}

export default function TypeListEntry(props: Readonly<TypeListEntryProps>) {
  const router = useRouter();
  const { us, item, level, toggleDrawer } = props;
  const phonePortrait = props.isPhonePortrait ?? Boolean(props.isPhone && !props.isPhoneLandscape);
  const supportsCoverPreview = level === HierarchyLevel.ISSUE || level === HierarchyLevel.SERIES;
  const label = createItemLabel(item, level, us);
  const variantCount = item.variants ? item.variants.length - 1 : 0;
  const showVariants = Boolean(item.variants && item.variants.length > 1);
  const showCollected =
    Boolean(item.collected || item.variants?.some((v) => v.collected)) && Boolean(props.session);
  const isActiveIssue = Boolean(
    level === HierarchyLevel.ISSUE &&
    props.selected?.issue?.number &&
    props.selected.issue.number === item.number
  );

  const row = (
    <ListItemButton
      className="row"
      divider
      onClick={(e) => {
        e.stopPropagation();
        if (phonePortrait && supportsCoverPreview) {
          toggleDrawer?.();
        }

        router.push(
          buildRouteHref(generateSeoUrl(item as any, Boolean(us)), props.query, {
            expand: null,
            filter: props.query ? props.query.filter : null,
          })
        );
      }}
    >
      <ListItemText
        sx={{ whiteSpace: "normal", m: 0 }}
        primary={
          <ListEntryPrimary
            label={label}
            active={isActiveIssue}
            showVariants={showVariants}
            variantCount={variantCount}
            showCollected={showCollected}
          />
        }
      />
    </ListItemButton>
  );

  if (supportsCoverPreview) {
    return (
      <CoverTooltip issue={item as any}>
        <Box data-item-index={props.idx}>{row}</Box>
      </CoverTooltip>
    );
  }

  return <Box data-item-index={props.idx}>{row}</Box>;
}

function createItemLabel(item: ListEntryItem, level: string | undefined, us?: boolean) {
  if (level === HierarchyLevel.SERIES || level === HierarchyLevel.ISSUE) {
    const seriesTitle = item.series?.title || "";
    if (level === HierarchyLevel.ISSUE && us) return "#" + item.number + " " + seriesTitle;
    if (item.title && item.title !== "") return "#" + item.number + " " + item.title;
    return "#" + item.number + " " + seriesTitle;
  }

  return generateLabel(item as any);
}

function ListEntryPrimary(props: {
  label: string;
  active: boolean;
  showVariants: boolean;
  variantCount: number;
  showCollected: boolean;
}) {
  return (
    <Typography component="div" sx={props.active ? { fontWeight: "bold" } : undefined}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>{props.label}</Box>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          {props.showVariants ? (
            <Tooltip
              title={
                "+" + props.variantCount + (props.variantCount === 1 ? " Variante" : " Varianten")
              }
            >
              <Typography
                sx={{ color: "text.disabled", pl: 0.25, typography: "caption" }}
                color={"disabled"}
              >
                +{props.variantCount}
              </Typography>
            </Tooltip>
          ) : null}

          {props.showCollected ? (
            <Box
              component="img"
              src="/collected_badge.png"
              alt="gesammelt"
              sx={{ height: 21, m: 0 }}
            />
          ) : null}
        </Box>
      </Box>
    </Typography>
  );
}
