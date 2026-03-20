import React from "react";
import { useRouter } from "next/navigation";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Typography from "@mui/material/Typography";
import EditIcon from "@mui/icons-material/Edit";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import ClearIcon from "@mui/icons-material/Clear";
import ExportDialog from "./ExportDialog";
import { generateUrl } from "../../util/hierarchy";
import type { SelectedRoot } from "../../types/domain";
import { CONTRIBUTOR_FIELDS, TRANSLATOR_FIELD } from "../filter/constants";
import { buildRouteHref } from "../generic/routeHref";

type TopBarFilterMenuProps = {
  us: boolean;
  selected: SelectedRoot | { us: boolean };
  isFilterActive?: boolean | string | null;
  query?: { filter?: string | null } | null;
  session?: { loggedIn?: boolean } | null;
};

export default function TopBarFilterMenu(props: Readonly<TopBarFilterMenuProps>) {
  const router = useRouter();
  const { us, selected, isFilterActive } = props;
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [exportOpen, setExportOpen] = React.useState(false);
  const menuOpen = Boolean(anchorEl);
  const filterVariables = React.useMemo(() => {
    try {
      const parsed = props.query?.filter ? JSON.parse(props.query.filter) : {};
      return { filter: { us, ...(parsed as Record<string, unknown>) } };
    } catch {
      return null;
    }
  }, [props.query?.filter, us]);

  const [count, setCount] = React.useState<number | undefined>(undefined);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isFilterActive || !filterVariables) {
      setCount(undefined);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetch("/api/public-filter-count", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(filterVariables),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Filter count request failed: ${response.status}`);
        return (await response.json()) as { count?: number };
      })
      .then((payload) => {
        if (cancelled) return;
        setCount(Number.isFinite(payload.count) ? Number(payload.count) : undefined);
      })
      .catch(() => {
        if (cancelled) return;
        setCount(undefined);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isFilterActive, filterVariables]);
  const tooltipTitle = React.useMemo(
    () => buildFilterTooltipTitle(Boolean(isFilterActive), props.query?.filter),
    [isFilterActive, props.query?.filter]
  );

  const handleFilterMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box>
      <Tooltip title={tooltipTitle}>
        <Box sx={{ display: "inline-flex", alignItems: "center" }}>
          <Badge
            color="secondary"
            max={999999999}
            overlap="circular"
            showZero={false}
            badgeContent={
              isFilterActive
                ? loading
                  ? "…"
                  : Number.isFinite(count)
                    ? count
                    : undefined
                : undefined
            }
            invisible={!isFilterActive || (!loading && !Number.isFinite(count))}
            slotProps={{
              badge: {
                sx: {
                  fontSize: "0.62rem",
                  minWidth: 17,
                  height: 17,
                  px: 0.45,
                },
              },
            }}
          >
            <IconButton
              color={isFilterActive ? "secondary" : "inherit"}
              aria-label={isFilterActive ? "Filteroptionen" : "Filter öffnen"}
              aria-controls={menuOpen ? "topbar-filter-menu" : undefined}
              aria-haspopup="menu"
              aria-expanded={menuOpen ? "true" : undefined}
              onClick={(e) => {
                if (!isFilterActive) {
                  router.push(us ? "/filter/us" : "/filter/de");
                  return;
                }
                if (menuOpen) {
                  handleFilterMenuClose();
                } else {
                  handleFilterMenuOpen(e);
                }
              }}
            >
              {isFilterActive ? (
                <FilterAltIcon sx={{ color: "common.white" }} />
              ) : (
                <FilterAltOutlinedIcon />
              )}
            </IconButton>
          </Badge>
        </Box>
      </Tooltip>

      <Menu
        id="topbar-filter-menu"
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleFilterMenuClose}
        PaperProps={{
          sx: {
            maxHeight: 48 * 4.5,
            width: 200,
          },
        }}
      >
        <MenuItem
          key="edit"
          onClick={(e) => {
            handleFilterMenuClose();
            router.push(us ? "/filter/us" : "/filter/de");
          }}
        >
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          <Typography variant="inherit" noWrap>
            Bearbeiten
          </Typography>
        </MenuItem>

        <MenuItem
          key="export"
          onClick={() => {
            handleFilterMenuClose();
            setExportOpen(true);
          }}
        >
          <ListItemIcon>
            <CloudDownloadIcon />
          </ListItemIcon>
          <Typography variant="inherit" noWrap>
            Exportieren
          </Typography>
        </MenuItem>

        <MenuItem
          key="reset"
          onClick={(e) => {
            handleFilterMenuClose();
            router.push(buildRouteHref(generateUrl(selected, us), props.query, { filter: null }));
          }}
        >
          <ListItemIcon>
            <ClearIcon />
          </ListItemIcon>
          <Typography variant="inherit" noWrap>
            Zurücksetzen
          </Typography>
        </MenuItem>
      </Menu>

      <ExportDialog handleClose={() => setExportOpen(false)} open={exportOpen} />
    </Box>
  );
}

function buildFilterTooltipTitle(isFilterActive: boolean, rawFilter?: string | null): React.ReactNode {
  if (!isFilterActive) return "Filtern";
  if (!rawFilter) return "Filter aktiv";

  let parsedFilter: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(rawFilter) as Record<string, unknown>;
    parsedFilter = parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    parsedFilter = null;
  }
  if (!parsedFilter) return "Filter aktiv";

  const entries: string[] = [];

  pushNamedList(entries, parsedFilter.formats, "Format");
  pushReleaseDateEntries(entries, parsedFilter.releasedates);
  if (parsedFilter.withVariants === true) entries.push("Mit Varianten");
  pushNamedList(entries, parsedFilter.publishers, "Verlag");
  pushNamedList(entries, parsedFilter.series, "Serie");
  pushNumberEntries(entries, parsedFilter.numbers);
  pushNamedList(entries, parsedFilter.arcs, "Teil von (Event, Story Arc, Story Line)");
  pushIndividualEntries(entries, parsedFilter.individuals);
  pushNamedList(entries, parsedFilter.appearances, "Auftritte (Personen, Gegenstände, Orte, ...)");

  const booleanLabels: Array<[string, string]> = [
    ["onlyCollected", "Nur in Sammlung"],
    ["onlyNotCollected", "Nur nicht in Sammlung"],
    ["onlyNotCollectedNoOwnedVariants", "Nur nicht in Sammlung (ohne Variants)"],
    ["firstPrint", "Erstveröffentlichung"],
    ["onlyPrint", "Einzige Veröffentlichung"],
    ["onlyTb", "Nur in Taschenbuch"],
    ["exclusive", "Exklusiver Inhalt"],
    ["reprint", "Reiner Nachdruck"],
    ["otherOnlyTb", "Sonst nur in Taschenbuch"],
    ["onlyOnePrint", "Nur einfach auf deutsch erschienen"],
    ["noPrint", "Nicht auf deutsch erschienen"],
    ["noComicguideId", "Ohne Comicguide ID"],
    ["noContent", "Ohne Inhalt"],
  ];
  for (const [key, label] of booleanLabels) {
    if (parsedFilter[key] === true) entries.push(label);
  }

  if (entries.length === 0) return "Filter aktiv";

  const visibleEntries = entries.slice(0, 6);
  const hiddenCount = Math.max(0, entries.length - visibleEntries.length);

  return (
    <Box sx={{ py: 0.25 }}>
      <Typography variant="caption" sx={{ display: "block", fontWeight: 700 }}>
        Filter aktiv
      </Typography>
      {visibleEntries.map((entry, idx) => (
        <Typography key={`${idx}|${entry}`} variant="caption" sx={{ display: "block", lineHeight: 1.35 }}>
          - {entry}
        </Typography>
      ))}
      {hiddenCount > 0 ? (
        <Typography variant="caption" sx={{ display: "block", opacity: 0.9 }}>
          +{hiddenCount} weitere
        </Typography>
      ) : null}
    </Box>
  );
}

function pushNamedList(entries: string[], value: unknown, label: string) {
  if (!Array.isArray(value) || value.length === 0) return;
  const names = value
    .map((item) => toFilterLabel(item))
    .filter((item): item is string => Boolean(item && item.length > 0));
  if (names.length === 0) return;

  const shown = names.slice(0, 2).join(", ");
  if (names.length <= 2) {
    entries.push(`${label}: ${shown}`);
    return;
  }
  entries.push(`${label}: ${shown} (+${names.length - 2})`);
}

function pushReleaseDateEntries(entries: string[], value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return;

  const exactDates: string[] = [];
  let fromDate = "";
  let toDate = "";

  for (const entry of value) {
    const item = entry as { compare?: unknown; date?: unknown };
    const compare = String(item?.compare || "").trim();
    const date = String(item?.date || "").trim();
    if (!date) continue;

    if (compare === "=") exactDates.push(date);
    if (compare === ">=" || compare === ">") fromDate = date;
    if (compare === "<=" || compare === "<") toDate = date;
  }

  if (exactDates.length > 0) {
    entries.push(`Exaktes Erscheinungsdatum: ${exactDates.slice(0, 2).join(", ")}`);
    return;
  }
  if (fromDate) entries.push(`Erscheinungsdatum von: ${fromDate}`);
  if (toDate) entries.push(`Erscheinungsdatum bis: ${toDate}`);
}

function pushNumberEntries(entries: string[], value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return;

  const exactNumbers: string[] = [];
  let fromNumber = "";
  let toNumber = "";

  for (const entry of value) {
    const item = entry as { compare?: unknown; number?: unknown };
    const compare = String(item?.compare || "").trim();
    const number = String(item?.number || "").trim();
    if (!number) continue;

    if (compare === "=") exactNumbers.push(number);
    if (compare === ">=" || compare === ">") fromNumber = number;
    if (compare === "<=" || compare === "<") toNumber = number;
  }

  if (exactNumbers.length > 0) {
    const shown = exactNumbers.slice(0, 2).join(", ");
    const rest = exactNumbers.length > 2 ? ` (+${exactNumbers.length - 2})` : "";
    entries.push(`Exakte Nummer(n): ${shown}${rest}`);
    return;
  }
  if (fromNumber) entries.push(`Nummer von: ${fromNumber}`);
  if (toNumber) entries.push(`Nummer bis: ${toNumber}`);
}

function pushIndividualEntries(entries: string[], value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return;

  const labelsByType = new Map<string, string>(
    [...CONTRIBUTOR_FIELDS, TRANSLATOR_FIELD].map((entry) => [entry.type, entry.label])
  );
  const grouped = new Map<string, string[]>();

  for (const entry of value) {
    const item = entry as { name?: unknown; type?: unknown };
    const name = String(item?.name || "").trim();
    if (!name) continue;

    const types = Array.isArray(item?.type)
      ? item.type.map((type) => String(type || "").trim()).filter((type) => type.length > 0)
      : [String(item?.type || "").trim()].filter((type) => type.length > 0);
    const targetTypes = types.length > 0 ? types : ["_ANY_"];

    for (const type of targetTypes) {
      const label = labelsByType.get(type) || "Mitwirkende";
      const existing = grouped.get(label) || [];
      if (!existing.includes(name)) existing.push(name);
      grouped.set(label, existing);
    }
  }

  for (const [label, names] of grouped) {
    const shown = names.slice(0, 2).join(", ");
    const rest = names.length > 2 ? ` (+${names.length - 2})` : "";
    entries.push(`${label}: ${shown}${rest}`);
  }
}

function toFilterLabel(item: unknown): string {
  if (item === null || item === undefined) return "";
  if (typeof item === "string") return item.trim();
  if (typeof item !== "object" || Array.isArray(item)) return String(item).trim();

  const objectItem = item as {
    name?: unknown;
    title?: unknown;
    number?: unknown;
    compare?: unknown;
  };
  if (objectItem.name) return String(objectItem.name).trim();
  if (objectItem.title) return String(objectItem.title).trim();
  if (objectItem.number) {
    const compare = String(objectItem.compare || "").trim();
    const number = String(objectItem.number || "").trim();
    return `${compare}${number}`.trim();
  }

  return "";
}
