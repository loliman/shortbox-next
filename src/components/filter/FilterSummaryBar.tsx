import React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { generateUrl } from "../../util/hierarchy";
import type { SelectedRoot } from "../../types/domain";
import { CONTRIBUTOR_FIELDS, TRANSLATOR_FIELD } from "./constants";

const MAX_CHIPS = 8;

type FilterSummaryBarProps = {
  query?: { filter?: string | null } | null;
  us?: boolean;
  selected?: SelectedRoot | { us: boolean } | null;
  compactLayout?: boolean;
};

export default function FilterSummaryBar(props: Readonly<FilterSummaryBarProps>) {
  const router = useRouter();
  const us = Boolean(props.us);
  const filterLabels = React.useMemo(
    () => buildFilterLabels(props.query?.filter),
    [props.query?.filter]
  );

  if (filterLabels.length === 0) return null;

  const visible = filterLabels.slice(0, MAX_CHIPS);
  const hiddenCount = Math.max(0, filterLabels.length - visible.length);
  const compactLayout = Boolean(props.compactLayout);

  return (
    <Box
      sx={(theme) => ({
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 1.5,
        backgroundColor:
          theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
      })}
    >
      <Stack
        direction={compactLayout ? "column" : "row"}
        spacing={compactLayout ? 1.25 : 2}
        alignItems={compactLayout ? "stretch" : "center"}
        justifyContent="space-between"
        flexWrap={compactLayout ? "nowrap" : "wrap"}
      >
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography
            sx={{
              fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
              fontSize: "0.72rem",
              lineHeight: 1.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "text.secondary",
            }}
          >
            Filter aktiv
          </Typography>
          {visible.map((label) => (
            <Chip key={label} size="small" label={label} />
          ))}
          {hiddenCount > 0 ? (
            <Chip size="small" label={`+${hiddenCount} weitere`} />
          ) : null}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant="outlined"
            onClick={() => router.push(us ? "/filter/us" : "/filter/de")}
          >
            Bearbeiten
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              const target = props.selected || { us };
              if (!props.selected) {
                router.push(us ? "/us" : "/de");
                return;
              }
              router.push(generateUrl(target, us));
            }}
          >
            Zurücksetzen
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

function buildFilterLabels(rawFilter?: string | null): string[] {
  if (!rawFilter) return [];
  let parsed: Record<string, unknown> | null = null;
  try {
    const parsedValue = JSON.parse(rawFilter);
    parsed = parsedValue && typeof parsedValue === "object" ? (parsedValue as Record<string, unknown>) : null;
  } catch {
    parsed = null;
  }
  if (!parsed) return [];

  const entries: string[] = [];

  pushNamedList(entries, parsed.formats, "Format");
  pushReleaseDateEntries(entries, parsed.releasedates);
  if (parsed.withVariants === true) entries.push("Mit Varianten");
  pushNamedList(entries, parsed.publishers, "Verlag");
  pushNamedList(entries, parsed.series, "Serie");
  pushNumberEntries(entries, parsed.numbers);
  pushNamedList(entries, parsed.arcs, "Teil von");
  pushIndividualEntries(entries, parsed.individuals);
  pushNamedList(entries, parsed.appearances, "Auftritte");

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
    if (parsed[key] === true) entries.push(label);
  }

  return entries.filter(Boolean);
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
