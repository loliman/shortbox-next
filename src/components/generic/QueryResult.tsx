import React from "react";
import ErrorIcon from "@mui/icons-material/Error";
import SearchIcon from "@mui/icons-material/Search";
import Typography from "@mui/material/Typography";
import { generateLabel } from "../../util/hierarchy";
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

  const renderPlaceholder = () => {
    if (!props.placeholder) return null;

    const placeholder: React.ReactElement[] = [];
    const placeholderCount = props.placeholderCount || 1;

    for (let i = 0; i < placeholderCount; i++)
      placeholder.push(
        React.cloneElement(props.placeholder, {
          key: i,
        })
      );

    return placeholder;
  };

  if (appIsLoading || loading) {
    const placeholder = renderPlaceholder();
    if (placeholder) return placeholder;

    if (props.loadingVariant === "none") return null;
    if (props.loadingVariant === "inline") {
      return <AppInlineLoader label={props.loadingLabel || "Lade..."} centered={false} />;
    }

    return <AppPageLoader label={props.loadingLabel} />;
  }

  if (error || (data && data.errors))
    return (
      <Box sx={{ p: 2, display: "flex" }}>
        <ErrorIcon fontSize="large" />
        <Typography sx={{ pl: 1.25, alignSelf: "center" }}>Fehler</Typography>
      </Box>
    );

  // `undefined` means "not resolved yet" (e.g. query transition/race), while
  // explicit `null` means "resolved, but not found".
  if (typeof data === "undefined") {
    const placeholder = renderPlaceholder();
    if (placeholder) return placeholder;

    if (props.loadingVariant === "none") return null;
    if (props.loadingVariant === "inline") {
      return <AppInlineLoader label={props.loadingLabel || "Lade..."} centered={false} />;
    }
    return <AppPageLoader label={props.loadingLabel} />;
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

function getNotFoundLabel(selected?: SelectedRoot | null): string {
  if (!selected) return "Eintrag nicht gefunden";

  const label = generateLabel(selected);
  return label && label.trim().length > 0 ? `${label} nicht gefunden` : "Eintrag nicht gefunden";
}
