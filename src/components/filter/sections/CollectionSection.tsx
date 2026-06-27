"use client";
import React from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { FilterValues } from "../types";
import FilterSwitch from "../FilterSwitch";

interface CollectionSectionProps {
  values: FilterValues;
  us: boolean;
  setFieldValue: (field: string, value: unknown) => void;
}

function CollectionSection({
  values,
  us,
  setFieldValue,
}: Readonly<CollectionSectionProps>) {
  const [activeDatePreset, setActiveDatePreset] = React.useState("");

  React.useEffect(() => {
    if (values.releasedateExact || (!values.releasedateFrom && !values.releasedateTo)) {
      setActiveDatePreset("");
    }
  }, [values.releasedateExact, values.releasedateFrom, values.releasedateTo]);

  const switchGridSx = {
    display: "grid",
    gap: 1.5,
    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
  } as const;

  const headerSx = {
    fontWeight: 600,
    color: "text.primary",
    letterSpacing: "0.025em",
    mt: 1,
  } as const;

  return (
    <Stack spacing={2.5}>
      {/* 1. Date Presets (Zeitraum) - styled identically to DetailsSection */}
      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={headerSx}>
          Zeitraum
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={activeDatePreset}
          onChange={(_, preset: string | null) => {
            if (!preset) {
              setActiveDatePreset("");
              setFieldValue("releasedateFrom", "");
              setFieldValue("releasedateTo", "");
              return;
            }

            const range = getPresetDateRange(preset);
            if (!range) return;

            setActiveDatePreset(preset);
            setFieldValue("releasedateExact", "");
            setFieldValue("releasedateFrom", range.from);
            setFieldValue("releasedateTo", range.to);
          }}
          size="small"
          sx={{
            gridColumn: { xs: "1", sm: "1 / span 3" },
            flexWrap: { xs: "wrap", md: "nowrap" },
            width: "100%",
            mb: 1.1,
            "& .MuiToggleButton-root": {
              textTransform: "none",
              flex: { xs: "1 1 auto", md: 1 },
              px: 0.8,
              py: 0.35,
              fontSize: "0.72rem",
              whiteSpace: "nowrap",
              backgroundColor: "background.paper",
              color: "text.primary",
              borderColor: "rgba(100, 116, 139, 0.35)",
              "&:hover": {
                backgroundColor: "action.hover",
              },
              "&.Mui-selected": {
                backgroundColor: "action.selected",
                color: "text.primary",
              },
              "&.Mui-selected:hover": {
                backgroundColor: "action.selected",
              },
            },
          }}
        >
          <ToggleButton value="nextYear">Nächstes Jahr</ToggleButton>
          <ToggleButton value="nextMonth">Nächster Monat</ToggleButton>
          <ToggleButton value="nextWeek">Nächste Woche</ToggleButton>
          <ToggleButton value="afterToday">Erscheint noch</ToggleButton>
          <ToggleButton value="untilToday">Bis Heute</ToggleButton>
          <ToggleButton value="thisWeek">Diese Woche</ToggleButton>
          <ToggleButton value="thisMonth">Dieser Monat</ToggleButton>
          <ToggleButton value="thisYear">Dieses Jahr</ToggleButton>
          <ToggleButton value="lastWeek">Letzte Woche</ToggleButton>
          <ToggleButton value="lastMonth">Letzter Monat</ToggleButton>
          <ToggleButton value="lastYear">Letztes Jahr</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Divider />

      {/* 2. Sammlung (Collection) Category */}
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" sx={headerSx}>
          Sammlung
        </Typography>
        <Box sx={switchGridSx}>
          <FilterSwitch
            checked={values.onlyIssuesWithMultipleCollectedVariants}
            label="Mehr als eine Variante gesammelt"
            onToggle={() =>
              setFieldValue(
                "onlyIssuesWithMultipleCollectedVariants",
                !values.onlyIssuesWithMultipleCollectedVariants
              )
            }
          />
          <FilterSwitch
            checked={values.onlyNeededIssues}
            label="Welche Ausgaben brauche ich noch?"
            onToggle={() => setFieldValue("onlyNeededIssues", !values.onlyNeededIssues)}
          />
          <FilterSwitch
            checked={values.onlyIncompleteSeries}
            label="Unvollständige Serien"
            onToggle={() => setFieldValue("onlyIncompleteSeries", !values.onlyIncompleteSeries)}
          />
          <FilterSwitch
            checked={values.onlyUnownedFirstPrints}
            label="Erstausgaben, die ich nicht besitze"
            onToggle={() => setFieldValue("onlyUnownedFirstPrints", !values.onlyUnownedFirstPrints)}
          />
          <FilterSwitch
            checked={values.onlyUnownedPublisherFirstPrints}
            label="Verlagsinterne Erstausgaben, die ich nicht besitze"
            onToggle={() => setFieldValue("onlyUnownedPublisherFirstPrints", !values.onlyUnownedPublisherFirstPrints)}
          />
          {!us && (
            <FilterSwitch
              checked={values.onlyNotOwnedUsMaterial}
              label="Ungesammeltes US-Material"
              onToggle={() => setFieldValue("onlyNotOwnedUsMaterial", !values.onlyNotOwnedUsMaterial)}
            />
          )}
          {!us && (
            <FilterSwitch
              checked={values.onlyNeededDeComics2024}
              label="Benötigte deutsche Comics (bis 2024)"
              onToggle={() => setFieldValue("onlyNeededDeComics2024", !values.onlyNeededDeComics2024)}
            />
          )}
          {!us && (
            <FilterSwitch
              checked={values.excludeOnlyNewUsMaterial}
              label="Kein reines US-Material ab Startjahr 2025"
              onToggle={() => setFieldValue("excludeOnlyNewUsMaterial", !values.excludeOnlyNewUsMaterial)}
            />
          )}
        </Box>
      </Stack>

      <Divider />

      {/* 3. Verkaufen (Selling) Category */}
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" sx={headerSx}>
          Verkaufen
        </Typography>
        <Box sx={switchGridSx}>
          <FilterSwitch
            checked={values.onlyDoubleTrippleCollected}
            label="Doppelt & Dreifach gesammelt"
            onToggle={() =>
              setFieldValue("onlyDoubleTrippleCollected", !values.onlyDoubleTrippleCollected)
            }
          />
          {!us && (
            <FilterSwitch
              checked={values.onlyDoubleTripplePublisherCollected}
              label="Doppelt & Dreifach gesammelt (verlagsintern)"
              onToggle={() =>
                setFieldValue(
                  "onlyDoubleTripplePublisherCollected",
                  !values.onlyDoubleTripplePublisherCollected
                )
              }
            />
          )}
          <FilterSwitch
            checked={values.onlyNewUsMaterial}
            label="US-Material ab Startjahr 2025"
            onToggle={() => setFieldValue("onlyNewUsMaterial", !values.onlyNewUsMaterial)}
          />
          <FilterSwitch
            checked={values.onlySellingList}
            label="Verkaufsliste"
            onToggle={() => setFieldValue("onlySellingList", !values.onlySellingList)}
          />
        </Box>
      </Stack>

      <Divider />

      {/* 4. Admin Category */}
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" sx={headerSx}>
          Admin
        </Typography>
        <Box sx={switchGridSx}>
          <FilterSwitch
            checked={values.noComicguideId}
            label="Ohne Comicguide ID"
            onToggle={() => setFieldValue("noComicguideId", !values.noComicguideId)}
          />
          <FilterSwitch
            checked={values.noContent}
            label="Ohne Stories"
            onToggle={() => setFieldValue("noContent", !values.noContent)}
          />
          <FilterSwitch
            checked={values.onlyFirstOfMonthRelease}
            label="Erschienen am 01. des Monats"
            onToggle={() => setFieldValue("onlyFirstOfMonthRelease", !values.onlyFirstOfMonthRelease)}
          />
        </Box>
      </Stack>
    </Stack>
  );
}

// Preset logic helper functions matching DetailsSection exactly
function getPresetDateRange(preset: string): { from: string; to: string } | null {
  const now = new Date();

  if (preset === "thisYear") {
    return {
      from: formatDateInput(new Date(now.getFullYear(), 0, 1)),
      to: formatDateInput(new Date(now.getFullYear(), 11, 31)),
    };
  }

  if (preset === "thisMonth") {
    return {
      from: formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }

  if (preset === "thisWeek") {
    const { from, to } = getWeekRange(now);
    return { from: formatDateInput(from), to: formatDateInput(to) };
  }

  if (preset === "lastYear") {
    const year = now.getFullYear() - 1;
    return {
      from: formatDateInput(new Date(year, 0, 1)),
      to: formatDateInput(new Date(year, 11, 31)),
    };
  }

  if (preset === "lastMonth") {
    return {
      from: formatDateInput(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: formatDateInput(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }

  if (preset === "lastWeek") {
    const oneWeekEarlier = new Date(now);
    oneWeekEarlier.setDate(oneWeekEarlier.getDate() - 7);
    const { from, to } = getWeekRange(oneWeekEarlier);
    return { from: formatDateInput(from), to: formatDateInput(to) };
  }

  if (preset === "untilToday") {
    return {
      from: "",
      to: formatDateInput(now),
    };
  }

  if (preset === "afterToday") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      from: formatDateInput(tomorrow),
      to: "",
    };
  }

  if (preset === "nextYear") {
    const year = now.getFullYear() + 1;
    return {
      from: formatDateInput(new Date(year, 0, 1)),
      to: formatDateInput(new Date(year, 11, 31)),
    };
  }

  if (preset === "nextMonth") {
    return {
      from: formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
      to: formatDateInput(new Date(now.getFullYear(), now.getMonth() + 2, 0)),
    };
  }

  if (preset === "nextWeek") {
    const oneWeekLater = new Date(now);
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);
    const { from, to } = getWeekRange(oneWeekLater);
    return { from: formatDateInput(from), to: formatDateInput(to) };
  }

  return null;
}

function getWeekRange(date: Date): { from: Date; to: Date } {
  const from = new Date(date);
  const day = from.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  from.setDate(from.getDate() + diffToMonday);
  from.setHours(0, 0, 0, 0);

  const to = new Date(from);
  to.setDate(to.getDate() + 6);
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default CollectionSection;
