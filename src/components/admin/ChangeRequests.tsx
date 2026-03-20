"use client";

import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CardContent,
  CardHeader,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { JsonDiffComponent } from "json-diff-react";
import type { JsonValue } from "json-diff-react";
import Layout from "../Layout";
import {generateLabel} from "../../util/hierarchy";
import { useSnackbarBridge } from "../generic/useSnackbarBridge";
import { mutationRequest } from "../../lib/client/mutation-request";
import type { AppRouteContextValue } from "../../app/routeContext";

type SnackbarVariant = "success" | "error" | "warning" | "info";

interface ChangeRequestsProps {
  routeContext?: AppRouteContextValue;
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
  const [hiddenIds, setHiddenIds] = React.useState<Record<string, boolean>>({});
  const [data, setData] = React.useState<{ changeRequests?: ChangeRequestEntry[] }>({
    changeRequests: [],
  });
  const [loading, setLoading] = React.useState(true);
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

  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  const visibleChangeRequests = React.useMemo(() => {
    const entries = data?.changeRequests || [];
    return entries
      .filter((entry) => {
        const id = String(entry?.id || "");
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
    const id = String(entry?.id || "");
    if (!id) return;

    const parsed = parseChangeRequest(entry?.changeRequest);
    if (!parsed.issue || !parsed.item) {
      props.enqueueSnackbar?.("Change Request enthält keine gültigen Issue-Daten.", {
        variant: "error",
      });
      return;
    }

    try {
      setAccepting(true);
      const oldInput = sanitizeIssueInputForMutation(parsed.issue);
      const fallbackReleaseDate =
        typeof oldInput.releasedate === "string" ? oldInput.releasedate : undefined;
      const itemInput = sanitizeIssueInputForMutation(parsed.item, fallbackReleaseDate);

      await mutationRequest({
        url: "/api/issues",
        method: "PATCH",
        body: {
          old: oldInput,
          item: itemInput,
        },
      });

      setHiddenIds((prev) => ({ ...prev, [id]: true }));
      props.enqueueSnackbar?.("Change Request akzeptiert und Issue aktualisiert.", {
        variant: "success",
      });

      try {
        await mutationRequest({
          url: "/api/change-requests",
          method: "DELETE",
          body: { id },
        });
      } catch {
        props.enqueueSnackbar?.(
          "Issue aktualisiert. Der Change Request konnte nicht gelöscht werden.",
          { variant: "warning" }
        );
      }

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
    <Layout routeContext={props.routeContext}>
      <CardHeader title="Change Requests" />
      <CardContent sx={{ pt: 1 }}>
        {loading ? <Typography>Lade Change Requests...</Typography> : null}
        {error ? <Alert severity="error">Change Requests konnten nicht geladen werden.</Alert> : null}

        {!loading && !error && visibleChangeRequests.length === 0 ? (
          <Alert severity="success">Keine offenen Change Requests.</Alert>
        ) : null}

        <Box>
          {visibleChangeRequests.map(
            (entry: ChangeRequestEntry, idx: number) => {
              const id = String(entry.id || "");
              const isLast = idx === visibleChangeRequests.length - 1;
              const borderRadius =
                idx === 0 ? (isLast ? "8px" : "8px 8px 0 0") : isLast ? "0 0 8px 8px" : "0";
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
                    backgroundColor: (theme) =>
                      theme.palette.mode === "dark" ? "#161b22" : "#ffffff",
                    overflow: "hidden",
                    boxShadow: (theme) => theme.shadows[1],
                    transition: "box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease",
                    "&:before": { display: "none" },
                    "& .MuiAccordionSummary-root": {
                      backgroundColor: (theme) =>
                        theme.palette.mode === "dark" ? "#161b22" : "#ffffff",
                    },
                    "& .MuiAccordionDetails-root": {
                      backgroundColor: (theme) =>
                        theme.palette.mode === "dark" ? "#161b22" : "#ffffff",
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
                        {generateLabel({ series: rawIssue?.series as any } as any)} #{(rawIssue as any).number}
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
                        {buildAddInfo(rawIssue as any)}
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1.25}>
                      <JsonDiffReactView before={issue} after={item} />

                      <Divider />

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
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            }
          )}
        </Box>
      </CardContent>
    </Layout>
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
          renderElision: (n: any, max: any) => (n < max) ? [...Array(n)].map(() => '…') : `… (${n} Einträge)`
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
  const text = String(value ?? "").trim();
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
      .sort()
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
  return String(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeIssueInputForMutation(
  value: Record<string, unknown>,
  fallbackReleaseDate?: string
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  Object.keys(value || {}).forEach((key) => {
    normalized[key] = normalizeInputValue((value as Record<string, unknown>)[key], key);
  });

  const normalizedReleaseDate = normalizeDateForGraphQL(normalized.releasedate);
  if (normalizedReleaseDate) {
    normalized.releasedate = normalizedReleaseDate;
  } else if (fallbackReleaseDate) {
    normalized.releasedate = fallbackReleaseDate;
  } else {
    delete normalized.releasedate;
  }

  return normalized;
}

function normalizeInputValue(value: unknown, keyName?: string): unknown {
  if (keyName === "id" && (typeof value === "number" || typeof value === "bigint")) {
    return String(value);
  }

  if (value instanceof Date) {
    return toIsoDateOnly(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeInputValue(entry));
  }
  if (isPlainObject(value)) {
    const record = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    Object.keys(record).forEach((key) => {
      normalized[key] = normalizeInputValue(record[key], key);
    });
    return normalized;
  }
  return value;
}

function normalizeDateForGraphQL(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return toIsoDateOnly(parsed);
    return undefined;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return toIsoDateOnly(value);
  }

  return undefined;
}

function toIsoDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export default function ChangeRequests() {
  const snackbarBridge = useSnackbarBridge();

  return <ChangeRequestsPage {...snackbarBridge} />;
}
