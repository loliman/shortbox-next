"use client";

import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { JsonDiffComponent } from "json-diff-react";
import type { JsonValue } from "json-diff-react";
import {generateLabel} from "../../lib/routes/hierarchy";
import { useSnackbarBridge } from "../generic/useSnackbarBridge";
import { mutationRequest } from "../../lib/client/mutation-request";
import type { SessionData } from "../../types/session";
import type { SelectedRoot } from "../../types/domain";
import type { LayoutRouteData, RouteQuery } from "../../types/route-ui";
import FormPageShell from "../form-shell/FormPageShell";
import FormSection from "../form-shell/FormSection";

type SnackbarVariant = "success" | "error" | "warning" | "info";

interface ChangeRequestsProps {
  selected: LayoutRouteData["selected"];
  level: LayoutRouteData["level"];
  us: boolean;
  query?: RouteQuery | null;
  initialFilterCount?: number | null;
  initialItems?: ChangeRequestEntry[];
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  changeRequestsCount?: number;
  session?: SessionData | null;
  enqueueSnackbar?: (message: string, options?: { variant?: SnackbarVariant }) => void;
}

interface ParsedChangeRequest {
  issue?: Record<string, unknown>;
  item?: Record<string, unknown>;
}

type ChangeRequestEntry = {
  id?: string | number | null;
  createdAt?: string | null;
  changeRequest?: unknown;
};

function ChangeRequestsPage(props: Readonly<ChangeRequestsProps>) {
  const canAdmin = Boolean(props.session?.canAdmin);
  const [hiddenIds, setHiddenIds] = React.useState<Record<string, boolean>>({});
  const [data, setData] = React.useState<{ changeRequests?: ChangeRequestEntry[] }>({
    changeRequests: props.initialItems || [],
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const [accepting, setAccepting] = React.useState(false);

  const refetch = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/public-change-requests?order=createdAt&direction=asc", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Change requests request failed: ${response.status}`);
      const payload = (await response.json()) as { items?: ChangeRequestEntry[] };
      setData({ changeRequests: Array.isArray(payload.items) ? payload.items : [] });
    } catch (nextError) {
      setData({ changeRequests: [] });
      setError(nextError);
    } finally {
      setLoading(false);
    }
  }, []);

  const visibleChangeRequests = React.useMemo(() => {
    const entries = data?.changeRequests || [];
    return entries
      .filter((entry) => {
        const id = readTextValue(entry?.id);
        return id.length > 0 && !hiddenIds[id];
      })
      .sort((a, b) => {
        return toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
      });
  }, [data?.changeRequests, hiddenIds]);

  const handleDiscard = async (id: string) => {
    setHiddenIds((prev) => ({ ...prev, [id]: true }));
    try {
      await mutationRequest({
        url: "/api/change-requests",
        method: "DELETE",
        body: { id },
      });
      props.enqueueSnackbar?.("Change Request verworfen.", { variant: "success" });
      await refetch();
    } catch (discardError) {
      setHiddenIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      const message =
        discardError instanceof Error && discardError.message ? `: ${discardError.message}` : "";
      props.enqueueSnackbar?.(`Verwerfen fehlgeschlagen${message}`, { variant: "error" });
    }
  };

  const handleAccept = async (entry: ChangeRequestEntry | null) => {
    const id = readTextValue(entry?.id);
    if (!id) return;

    try {
      setAccepting(true);
      await mutationRequest({
        url: "/api/change-requests",
        method: "PATCH",
        body: {
          id,
        },
      });

      setHiddenIds((prev) => ({ ...prev, [id]: true }));
      props.enqueueSnackbar?.("Change Request akzeptiert und Issue aktualisiert.", {
        variant: "success",
      });

      await refetch();
    } catch (acceptError) {
      const message =
        acceptError instanceof Error && acceptError.message ? `: ${acceptError.message}` : "";
      props.enqueueSnackbar?.(`Akzeptieren fehlgeschlagen${message}`, { variant: "error" });
    } finally {
      setAccepting(false);
    }
  };

  return (
    <FormPageShell title="Change Requests">
      <FormSection title="Offene Anfragen">
        <>
          {loading ? <Typography>Lade Change Requests...</Typography> : null}
          {error ? (
            <Alert severity="warning">
              Change Requests konnten aktuell nicht geladen werden. Die Ansicht bleibt leer.
            </Alert>
          ) : null}

          {!loading && !error && visibleChangeRequests.length === 0 ? (
            <Alert severity="info">Keine offenen Change Requests.</Alert>
          ) : null}

          <Box>
            {visibleChangeRequests.map(
              (entry: ChangeRequestEntry, idx: number) => {
              const id = readTextValue(entry.id);
              const isLast = idx === visibleChangeRequests.length - 1;
              let borderRadius = "0";
              if (idx === 0) {
                borderRadius = isLast ? "8px" : "8px 8px 0 0";
              } else if (isLast) {
                borderRadius = "0 0 8px 8px";
              }
              const parsed = parseChangeRequest(entry.changeRequest);
              const rawIssue = parsed.issue || {};
              const rawItem = parsed.item || {};
              const usContext = isUsIssueContext(rawIssue) || isUsIssueContext(rawItem);
              const issue = toJsonValue(
                sanitizeForDiffView(parseJsonish(rawIssue), usContext)
              );
              const item = toJsonValue(
                sanitizeForDiffView(parseJsonish(rawItem), usContext)
              );

                return (
                  <Accordion
                    key={id}
                    disableGutters
                    sx={{
                      borderRadius,
                      width: "auto",
                      maxWidth: "100%",
                      mb: isLast ? 0 : 1,
                      border: "1px solid",
                      borderColor: "divider",
                      backgroundColor: "background.paper",
                      overflow: "hidden",
                      boxShadow: (theme) => theme.shadows[1],
                      transition: "box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease",
                      "&:before": { display: "none" },
                      "& .MuiAccordionSummary-root": {
                        backgroundColor: "background.paper",
                      },
                      "& .MuiAccordionDetails-root": {
                        backgroundColor: "background.paper",
                      },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        py: 1.25,
                        minHeight: 0,
                        "&.Mui-expanded": {
                          minHeight: 0,
                        },
                        "& .MuiAccordionSummary-content": {
                          width: "100%",
                          margin: 0,
                          "&.Mui-expanded": {
                            margin: 0,
                          },
                        },
                        "& .MuiAccordionSummary-expandIconWrapper": {
                          margin: 0,
                          alignSelf: "center",
                        },
                      }}
                    >
                      <Stack sx={{ width: "100%" }}>
                      <Typography
                          variant="overline"
                          sx={{
                            fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
                            fontWeight: 500,
                            fontSize: "0.7rem",
                            lineHeight: 1.5,
                            textTransform: "uppercase",
                            letterSpacing: "0.16em",
                            color: "text.secondary",
                            opacity: 0.9,
                          }}
                      >
                        {formatDateTime(entry.createdAt)}
                      </Typography>
                      <Typography
                          variant="subtitle1"
                          sx={{
                            fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
                            fontSize: "1rem",
                            lineHeight: 1.75,
                            fontWeight: 700,
                            color: "text.secondary",
                            letterSpacing: "0.01em",
                            opacity: 0.9,
                          }}
                      >
                        {generateLabel({ series: rawIssue?.series as SelectedRoot["series"] })} #{toDisplay(rawIssue.number, "")}
                      </Typography>

                      <Typography
                          sx={{
                            fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
                            fontSize: "0.8rem",
                            lineHeight: 1.75,
                            fontWeight: 500,
                            color: "text.secondary",
                            letterSpacing: "0.01em",
                            opacity: 0.9,
                          }}
                      >
                        {buildAddInfo(rawIssue)}
                      </Typography>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={1.25}>
                        <JsonDiffReactView before={issue} after={item} />

                        <Divider />

                        {canAdmin ? (
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button color="error" variant="outlined" onClick={() => handleDiscard(id)}>
                              Verwerfen
                            </Button>
                            <Button
                              disabled={accepting}
                              variant="contained"
                              onClick={() => handleAccept(entry)}
                            >
                              Akzeptieren
                            </Button>
                          </Stack>
                        ) : null}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                );
              }
            )}
          </Box>
        </>
      </FormSection>
    </FormPageShell>
  );
}

function JsonDiffReactView(props: Readonly<{ before: JsonValue; after: JsonValue }>) {
  return (
    <Box
      sx={{
        overflowX: "auto",
        bgcolor: "background.paper",
        "& .diff": {
          fontFamily: "monospace",
          fontSize: "0.82rem",
          whiteSpace: "pre",
          margin: 0,
          padding: "10px 10px 10px 20px",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "4px",
          backgroundColor: "background.paper",
          color: "text.primary",
        },
        "& .deletion, & .addition": {
          position: "relative",
        },
        "& .deletion": {
          color: "#d32f2f",
        },
        "& .addition": {
          color: "#2e7d32",
        },
        "& .deletion::before, & .addition::before": {
          display: "block",
          position: "absolute",
          left: 0,
          top: 0,
          marginLeft: "-10px",
        },
        "& .deletion::before": {
          content: '"-"',
        },
        "& .addition::before": {
          content: '"+"',
        },
        "& .unchanged": {
          color: "#808080",
        },
      }}
    >
      <JsonDiffComponent
        jsonA={props.before}
        jsonB={props.after}
        styleCustomization={{
          additionLineStyle: null,
          deletionLineStyle: null,
          unchangedLineStyle: null,
          additionClassName: "addition",
          deletionClassName: "deletion",
          unchangedClassName: "unchanged",
          frameStyle: null,
          frameClassName: "diff",
        }}
        jsonDiffOptions={{
          maxElisions: 2,
          renderElision: (n: number, max: number) =>
            n < max ? [...Array(n)].map(() => "…") : `… (${n} Einträge)`,
        }}
      />
    </Box>
  );
}

function parseChangeRequest(value: unknown): ParsedChangeRequest {
  const parsed = parseJsonRecord(value);
  const issue = asRecord(parsed?.issue);
  const item = asRecord(parsed?.item);

  return {
    issue: issue || undefined,
    item: item || undefined,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  const direct = asRecord(value);
  if (direct) return direct;
  if (typeof value !== "string") return null;
  try {
    return asRecord(JSON.parse(value));
  } catch {
    return null;
  }
}

function buildAddInfo(issue: Record<string, unknown>): string {
  const format = toDisplay(issue.format, "-");
  const variant = (issue.variant && issue.variant != "") ? "(" + toDisplay(issue.variant, "") + "Variant)" : "(Reguläre Ausgabe)";
  return `${format} ${variant}`;
}

function toDisplay(value: unknown, fallback: string): string {
  const text = readTextValue(value);
  return text.length > 0 ? text : fallback;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("de-DE");
}

function toTimestamp(value?: string | null): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseJsonish(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => parseJsonish(entry));
  if (isPlainObject(value)) {
    const normalized: Record<string, unknown> = {};
    Object.keys(value)
      .sort((left, right) => left.localeCompare(right, "de-DE"))
      .forEach((key) => {
        normalized[key] = parseJsonish((value as Record<string, unknown>)[key]);
      });
    return normalized;
  }

  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return parseJsonish(JSON.parse(trimmed));
    } catch {
      return value;
    }
  }
  return value;
}

function sanitizeForDiffView(value: unknown, forceUsContext = false): unknown {
  if (Array.isArray(value)) return value.map((entry) => sanitizeForDiffView(entry, forceUsContext));
  if (!isPlainObject(value)) return value;

  const source = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  Object.keys(source).forEach((key) => {
    normalized[key] = sanitizeForDiffView(source[key], forceUsContext);
  });

  const series = source.series;
  const isUsIssue =
    forceUsContext ||
    (isPlainObject(series) &&
      isPlainObject(series.publisher) &&
      Boolean((series.publisher as Record<string, unknown>).us));

  if (isUsIssue) {
    delete normalized.format;
    delete normalized.variant;
    delete normalized.stories;

    if (isPlainObject(normalized.series)) {
      const nextSeries = { ...(normalized.series as Record<string, unknown>) };
      delete nextSeries.publisher;
      normalized.series = nextSeries;
    }
  }

  return normalized;
}

function isUsIssueContext(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  const issue = value as Record<string, unknown>;
  const series = issue.series;
  if (!isPlainObject(series)) return false;
  const publisher = (series as Record<string, unknown>).publisher;
  if (!isPlainObject(publisher)) return false;
  return Boolean((publisher as Record<string, unknown>).us);
}

function toJsonValue(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) return value.map((entry) => toJsonValue(entry));
  if (isPlainObject(value)) {
    const result: { [x: string]: JsonValue } = {};
    Object.keys(value).forEach((key) => {
      result[key] = toJsonValue((value as Record<string, unknown>)[key]);
    });
    return result;
  }
  return readTextValue(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}

export default function ChangeRequests(props: Readonly<ChangeRequestsProps>) {
  const snackbarBridge = useSnackbarBridge();

  return <ChangeRequestsPage {...props} {...snackbarBridge} />;
}
