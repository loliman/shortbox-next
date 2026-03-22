import React from "react";
import { useRouter } from "next/navigation";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
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
  const tooltipTitle = React.useMemo(
    () => buildFilterTooltipTitle(Boolean(isFilterActive), props.query?.filter),
    [isFilterActive, props.query?.filter]
  );

  return (
    <Box>
      <Tooltip title={tooltipTitle}>
        <Box sx={{ display: "inline-flex", alignItems: "center" }}>
          <Badge
            color="secondary"
            max={999999999}
            overlap="circular"
            showZero={false}
            badgeContent={undefined}
            invisible={true}
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
              aria-label="Filter öffnen"
              onClick={() => {
                router.push(
                  buildRouteHref(us ? "/filter/us" : "/filter/de", props.query, {
                    from: generateUrl(selected, us),
                  })
                );
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
