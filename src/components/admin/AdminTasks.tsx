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
  Chip,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Layout from "../Layout";
import { useSnackbarBridge } from "../generic/useSnackbarBridge";
import { PlayArrowOutlined } from "@mui/icons-material";
import {generateLabel} from "../../util/hierarchy";
import { mutationRequest } from "../../lib/client/mutation-request";
import type { AppRouteContextValue } from "../../app/routeContext";

type SnackbarVariant = "success" | "error" | "warning" | "info";

type AdminTasksProps = {
  routeContext: AppRouteContextValue;
  enqueueSnackbar?: (message: string, options?: { variant?: SnackbarVariant }) => void;
};

type AdminTaskItem = {
  id?: string | number;
  key?: string;
  name?: string;
  description?: string;
  runs?: RunLike[];
};

const MAX_DETAIL_CHARS = 120000;

const formatDateTime = (value?: string | null): string => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("de-DE");
};

const trimDetails = (value?: string | null): { text: string; truncated: boolean } => {
  const details = String(value || "");
  if (details.length <= MAX_DETAIL_CHARS) {
    return { text: details, truncated: false };
  }

  return {
    text: details.slice(0, MAX_DETAIL_CHARS),
    truncated: true,
  };
};

type RunLike = {
  id?: string | number | null;
  taskKey?: string | null;
  taskName?: string | null;
  dryRun?: boolean | null;
  status?: string | null;
  summary?: string | null;
  details?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
};

type VisualState = "queued" | "running" | "success" | "failed" | "missing";

const getWorkerStateFromDetails = (details?: string | null): string | null => {
  if (!details) return null;
  try {
    const parsed = JSON.parse(details) as { state?: unknown };
    return typeof parsed.state === "string" ? parsed.state : null;
  } catch {
    return null;
  }
};

const hasFailedItemsInSummary = (summary: string): boolean => {
  const match = summary.match(/failed\s*=\s*(\d+)/i);
  if (!match) return false;
  const failedCount = Number(match[1]);
  return Number.isFinite(failedCount) && failedCount > 0;
};

const resolveVisualState = (run: RunLike | null | undefined): VisualState => {
  if (!run) return "missing";

  const summary = String(run.summary || "").toLowerCase();
  const workerState = getWorkerStateFromDetails(run.details);

  if (!run.finishedAt || summary.includes("queued") || summary.includes("running")) {
    if (workerState === "running" || summary.includes("running")) return "running";
    if (workerState === "queued" || summary.includes("queued")) return "queued";
  }

  if (hasFailedItemsInSummary(summary)) return "failed";
  if (run.status === "FAILED" || workerState === "failed-awaiting-retry") return "failed";
  if (run.status === "SUCCESS") return "success";
  return "missing";
};

const resolveStatusCircleSx = (state: VisualState) => {
  const base = {
    width: 16,
    height: 16,
    borderRadius: "999px",
    border: "1px solid",
    borderColor: "rgba(0,0,0,0.12)",
  };

  if (state === "running") {
    return {
      ...base,
      backgroundColor: (theme: { palette: { mode: string; info: { main: string; light: string } } }) =>
        theme.palette.mode === "dark" ? theme.palette.info.light : theme.palette.info.main,
      animation: "admin-run-pulse 1.3s ease-in-out infinite",
      borderColor: (theme: { palette: { mode: string } }) =>
        theme.palette.mode === "dark" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.12)",
      boxShadow: (theme: { palette: { mode: string } }) =>
        theme.palette.mode === "dark"
          ? "0 0 0 0 rgba(125, 211, 252, 0.75)"
          : "0 0 0 0 rgba(2, 136, 209, 0.65)",
      "@keyframes admin-run-pulse": {
        "0%": {
          transform: "scale(0.95)",
          boxShadow: "0 0 0 0 rgba(125, 211, 252, 0.75)",
        },
        "70%": {
          transform: "scale(1)",
          boxShadow: "0 0 0 7px rgba(125, 211, 252, 0)",
        },
        "100%": {
          transform: "scale(0.95)",
          boxShadow: "0 0 0 0 rgba(125, 211, 252, 0)",
        },
      },
    };
  }

  if (state === "queued") {
    return {
      ...base,
      backgroundColor: (theme: {
        palette: { mode: string; success: { light: string; main: string } };
      }) => (theme.palette.mode === "dark" ? "#bbf7d0" : "#8fdc8f"),
      borderColor: (theme: { palette: { mode: string } }) =>
        theme.palette.mode === "dark" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.12)",
    };
  }
  if (state === "success") {
    return {
      ...base,
      backgroundColor: (theme: {
        palette: { mode: string; success: { light: string; main: string } };
      }) =>
        theme.palette.mode === "dark" ? theme.palette.success.light : theme.palette.success.main,
      borderColor: (theme: { palette: { mode: string } }) =>
        theme.palette.mode === "dark" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.12)",
    };
  }
  if (state === "failed") {
    return {
      ...base,
      backgroundColor: (theme: {
        palette: { mode: string; error: { light: string; main: string } };
      }) => (theme.palette.mode === "dark" ? theme.palette.error.light : theme.palette.error.main),
      borderColor: (theme: { palette: { mode: string } }) =>
        theme.palette.mode === "dark" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.12)",
    };
  }
  return {
    ...base,
    backgroundColor: (theme: { palette: { mode: string } }) =>
      theme.palette.mode === "dark" ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.38)",
    borderColor: (theme: { palette: { mode: string } }) =>
      theme.palette.mode === "dark" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.12)",
  };
};

const resolveVisualStateLabel = (state: VisualState): string => {
  if (state === "queued") return "QUEUED";
  if (state === "running") return "RUNNING";
  if (state === "success") return "SUCCESS";
  if (state === "failed") return "FAILED";
  return "MISSING";
};

const resolveAggregateTaskState = (runs: Array<RunLike | null | undefined>): VisualState => {
  if (!runs || runs.length === 0) return "missing";
  const latestRun = runs.find((run) => Boolean(run));
  if (!latestRun) return "missing";
  return resolveVisualState(latestRun);
};

function AdminTasksPage(props: Readonly<AdminTasksProps>) {
  const [runningTaskKey, setRunningTaskKey] = React.useState<string | null>(null);
  const [data, setData] = React.useState<{ adminTasks?: AdminTaskItem[] }>({ adminTasks: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(null);
  const [releasingLocks, setReleasingLocks] = React.useState(false);

  const tasks = data?.adminTasks || [];

  const refetch = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/public-admin-tasks?limitRuns=10", { cache: "no-store" });
      if (!response.ok) throw new Error(`Admin tasks request failed: ${response.status}`);
      const payload = (await response.json()) as { items?: AdminTaskItem[] };
      setData({ adminTasks: Array.isArray(payload.items) ? payload.items : [] });
    } catch (nextError) {
      setData({ adminTasks: [] });
      setError(nextError);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  const copyDetailsToClipboard = async (text: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      props.enqueueSnackbar?.("Kopieren ist in dieser Umgebung nicht verfügbar.", {
        variant: "warning",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(text || "");
      props.enqueueSnackbar?.("Log kopiert.", { variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      props.enqueueSnackbar?.(`Kopieren fehlgeschlagen: ${message}`, { variant: "error" });
    }
  };

  const runSelectedTask = async (taskKey: string, dryRun: boolean) => {
    setRunningTaskKey(taskKey + (dryRun ? ":dry" : ":run"));

    try {
      const result = await mutationRequest<{
        run?: {
          status?: string | null;
          summary?: string | null;
        };
      }>({
        url: "/api/admin-task-actions",
        method: "POST",
        body: {
          action: "run",
          input: {
            taskKey,
            dryRun,
          },
        },
      });

      const run = result?.run;
      const status = run?.status || "UNKNOWN";
      const summary = run?.summary || "";

      if (status === "SUCCESS") {
        props.enqueueSnackbar?.(`Task ${taskKey} abgeschlossen. ${summary}`, {
          variant: "success",
        });
      } else {
        props.enqueueSnackbar?.(`Task ${taskKey} fehlgeschlagen. ${summary}`, {
          variant: "error",
        });
      }
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : "Unbekannter Fehler";
      props.enqueueSnackbar?.(`Task ${taskKey} fehlgeschlagen: ${message}`, {
        variant: "error",
      });
    } finally {
      setRunningTaskKey(null);
      await refetch();
    }
  };

  const releaseAllLocksNow = async () => {
    setReleasingLocks(true);

    try {
      const result = await mutationRequest<{ removedJobs?: number }>({
        url: "/api/admin-task-actions",
        method: "POST",
        body: {
          action: "release-locks",
        },
      });
      const removedJobs = Number(result?.removedJobs || 0);
      if (removedJobs > 0) {
        props.enqueueSnackbar?.(
          `${removedJobs} Admin-Job(s) wurden freigegeben und aus der Queue entfernt.`,
          { variant: "success" }
        );
      } else {
        props.enqueueSnackbar?.("Keine Admin-Jobs zum Freigeben/Entfernen gefunden.", {
          variant: "info",
        });
      }
    } catch (releaseError) {
      const message = releaseError instanceof Error ? releaseError.message : "Unbekannter Fehler";
      props.enqueueSnackbar?.(`Locks konnten nicht freigegeben werden: ${message}`, {
        variant: "error",
      });
    } finally {
      setReleasingLocks(false);
      await refetch();
    }
  };

  return (
    <Layout routeContext={props.routeContext}>
      <CardHeader
        title="Adminpanel"
        action={
          <Tooltip title="Alle Admin-Jobs entsperren und direkt aus der Queue entfernen">
            <span>
              <Button
                size="small"
                aria-label="Release Jobs"
                color="primary"
                disabled={releasingLocks}
                sx={{ minWidth: 0, width: 32, height: 32, p: 0 }}
                onClick={releaseAllLocksNow}
              >
                <LockOpenIcon fontSize="small" />
              </Button>
            </span>
          </Tooltip>
        }
      />

      <CardContent sx={{ pt: 1 }}>
        {loading ? <Typography>Lade Jobs...</Typography> : null}
        {error ? (
          <Alert severity="warning">
            Jobs konnten aktuell nicht geladen werden. Die Admin-Ansicht bleibt ohne Daten nutzbar.
          </Alert>
        ) : null}

        {!loading && !error && tasks.length === 0 ? (
          <Alert severity="info">Aktuell sind keine Admin-Jobs sichtbar.</Alert>
        ) : null}

        <Box>
          {tasks.map((task, idx) => {
            const taskKey = String(task?.key || "");
            const runs = (task?.runs || []).slice(0, 10);
            const aggregateState = resolveAggregateTaskState(runs);
            const runningDryKey = `${taskKey}:dry`;
            const runningRealKey = `${taskKey}:run`;
            const isLast = idx === tasks.length - 1;
            const borderRadius =
              idx === 0 ? (isLast ? "8px" : "8px 8px 0 0") : isLast ? "0 0 8px 8px" : "0";

            return (
              <Accordion
                key={String(task?.key || task?.id)}
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
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1}
                    justifyContent="space-between"
                    sx={{ width: "100%", pr: 0.5 }}
                  >
                    <Box sx={{ minWidth: 0 }}>

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
                        {taskKey}
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
                        {task?.name}
                      </Typography>
                      {task?.description ? (
                        <Typography
                            variant="subtitle1"
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
                          {task.description}
                        </Typography>
                      ) : null}
                    </Box>

                    <Stack
                      direction="row"
                      spacing={0.25}
                      alignItems="center"
                      sx={{ flexWrap: "wrap" }}
                    >
                      <Tooltip title={`${resolveVisualStateLabel(aggregateState)}`}>
                        <Box sx={{ ...resolveStatusCircleSx(aggregateState), mr: 1 }} />
                      </Tooltip>
                      <Box sx={{ width: 8 }} />

                    <Tooltip
                      title={runningTaskKey === runningDryKey ? "Dry-Run läuft" : "Dry-Run starten"}
                    >
                      <span>
                        <Button
                          size="small"
                          aria-label="Dry-Run starten"
                          color="primary"
                          disabled={Boolean(runningTaskKey)}
                          sx={{ minWidth: 0, width: 32, height: 32, p: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            runSelectedTask(taskKey, true);
                          }}
                        >
                          <ScienceOutlinedIcon fontSize="small" />
                        </Button>
                      </span>
                    </Tooltip>

                    <Tooltip
                      title={runningTaskKey === runningRealKey ? "Run läuft" : "Live-Run starten"}
                    >
                      <span>
                        <Button
                          size="small"
                          aria-label="Live-Run starten"
                          color="primary"
                          disabled={Boolean(runningTaskKey)}
                          sx={{ minWidth: 0, width: 32, height: 32, p: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            runSelectedTask(taskKey, false);
                          }}
                        >
                          <PlayArrowOutlined fontSize="small" />
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                </Stack>
              </AccordionSummary>

              <AccordionDetails sx={{ pt: 0.5 }}>
                <Typography variant="h6">Letzte Runs</Typography>

                <Stack spacing={0.75}>
                  {runs.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Keine Runs vorhanden.
                    </Typography>
                  ) : null}

                  {runs.map((run, runIndex) => {
                    const runId = String(run?.id || "");
                    const details = trimDetails(run?.details || "");
                    const runVisualState = resolveVisualState(run);

                    return (
                      <React.Fragment key={runId}>
                        <Accordion
                          disableGutters
                          elevation={0}
                          sx={{
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "divider",
                            backgroundColor: (theme) =>
                              theme.palette.mode === "dark" ? "#161b22" : "#ffffff",
                            overflow: "hidden",
                            "&:before": { display: "none" },
                            "&.Mui-expanded": { margin: 0 },
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
                              minHeight: 40,
                              "& .MuiAccordionSummary-content": {
                                my: 0,
                                width: "100%",
                                minWidth: 0,
                                flexWrap: "nowrap",
                              },
                              "& .MuiAccordionSummary-content.Mui-expanded": { my: 0 },
                            }}
                          >
                            <Stack
                              direction="row"
                              spacing={0.75}
                              alignItems="center"
                              sx={{ minWidth: 0, width: "100%", flexWrap: "nowrap", overflow: "hidden" }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                                {formatDateTime(run?.startedAt)}
                              </Typography>
                              <Tooltip title={resolveVisualStateLabel(runVisualState)}>
                                <Box sx={{ ...resolveStatusCircleSx(runVisualState), flexShrink: 0 }} />
                              </Tooltip>
                              <Chip
                                  size="small"
                                  variant={"outlined"}
                                  sx={{ flexShrink: 0 }}
                                  label={run?.dryRun ? "Dry" : "Live"}
                              />
                              <Typography
                                variant="body2"
                                sx={{
                                  minWidth: 0,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {run?.summary}
                              </Typography>
                            </Stack>
                          </AccordionSummary>
                          <AccordionDetails sx={{ pt: 0 }}>
                            <Box sx={{ mt: 0.25 }}>
                              <Box
                                sx={{
                                  mt: 0,
                                  mb: 0,
                                  p: 1,
                                  pt: 4,
                                  maxHeight: 180,
                                  overflow: "auto",
                                  backgroundColor: "action.hover",
                                  borderRadius: 1,
                                  position: "relative",
                                }}
                              >
                                <Tooltip title="Log kopieren">
                                  <IconButton
                                    size="small"
                                    onClick={() => copyDetailsToClipboard(details.text || "")}
                                    sx={{ position: "absolute", top: 4, right: 4 }}
                                  >
                                    <ContentCopyIcon fontSize="inherit" />
                                  </IconButton>
                                </Tooltip>
                                <Box
                                  component="pre"
                                  sx={{
                                    mt: 0,
                                    mb: 0,
                                    fontSize: "0.75rem",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {details.text || "(keine Details)"}
                                </Box>
                              </Box>
                            </Box>
                              {details.truncated ? (
                                <Typography
                                  variant="caption"
                                  color="warning.main"
                                  sx={{ mt: 0.5, display: "block" }}
                                >
                                  Details wurden im UI gekürzt.
                                </Typography>
                              ) : null}
                            </AccordionDetails>
                          </Accordion>
                          {runIndex < runs.length - 1 ? <Divider /> : null}
                        </React.Fragment>
                      );
                    })}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      </CardContent>
    </Layout>
  );
}

export default function AdminTasks(props: Readonly<AdminTasksProps>) {
  const snackbarBridge = useSnackbarBridge();

  return <AdminTasksPage {...props} {...snackbarBridge} />;
}
