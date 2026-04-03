import React from "react";
import ErrorIcon from "@mui/icons-material/Error";
import SearchIcon from "@mui/icons-material/Search";
import Typography from "@mui/material/Typography";
import { generateLabel } from "../../lib/routes/hierarchy";
import Box from "@mui/material/Box";
import type { SelectedRoot } from "../../types/domain";
import { AppInlineLoader, AppPageLoader } from "./loading";

interface QueryResultProps {
  appIsLoading?: boolean;
  loading?: boolean;
  loadingVariant?: "page" | "inline" | "none";
  loadingLabel?: string;
  error?: unknown;
  data?: (Record<string, unknown> & { errors?: unknown }) | null;
  selected?: SelectedRoot | null;
  placeholder?: React.ReactElement<{ key?: React.Key }>;
  placeholderCount?: number;
}

export default function QueryResult(props: Readonly<QueryResultProps>) {
  const { appIsLoading: initialAppIsLoading, loading, error, data, selected } = props;
  const appIsLoading = initialAppIsLoading ?? false;
  const placeholder = buildPlaceholders(props.placeholder, props.placeholderCount);

  if (appIsLoading || loading) {
    return renderLoadingState(placeholder, props.loadingVariant, props.loadingLabel);
  }

  if (error || data?.errors)
    return (
      <Box sx={{ p: 2, display: "flex" }}>
        <ErrorIcon fontSize="large" />
        <Typography sx={{ pl: 1.25, alignSelf: "center" }}>Fehler</Typography>
      </Box>
    );

  // `undefined` means "not resolved yet" (e.g. query transition/race), while
  // explicit `null` means "resolved, but not found".
  if (data === undefined) {
    return renderLoadingState(placeholder, props.loadingVariant, props.loadingLabel);
  }

  if (data === null)
    return (
      <Box sx={{ p: 2, display: "flex" }}>
        <SearchIcon fontSize="large" />
        <Typography sx={{ pl: 1.25, alignSelf: "center" }}>
          {getNotFoundLabel(selected)}
        </Typography>
      </Box>
    );

  return null;
}

function buildPlaceholders(
  placeholder: React.ReactElement<{ key?: React.Key }> | undefined,
  placeholderCount = 1
) {
  if (!placeholder) return null;

  const rendered: React.ReactElement[] = [];

  for (let index = 0; index < placeholderCount; index += 1) {
    rendered.push(
      React.cloneElement(placeholder, {
        key: index,
      })
    );
  }

  return rendered;
}

function renderLoadingState(
  placeholder: React.ReactElement[] | null,
  loadingVariant: QueryResultProps["loadingVariant"],
  loadingLabel: string | undefined
) {
  if (placeholder) return placeholder;
  if (loadingVariant === "none") return null;
  if (loadingVariant === "inline") {
    return <AppInlineLoader label={loadingLabel || "Lade..."} centered={false} />;
  }
  return <AppPageLoader label={loadingLabel} />;
}

function getNotFoundLabel(selected?: SelectedRoot | null): string {
  if (!selected) return "Eintrag nicht gefunden";

  const label = generateLabel(selected);
  return label && label.trim().length > 0 ? `${label} nicht gefunden` : "Eintrag nicht gefunden";
}
