"use client";

import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { mutationRequest } from "../../lib/client/mutation-request";
import { useSnackbarBridge } from "../generic/useSnackbarBridge";
import type { ActivePreviewImportQueue, StagedPreviewImport } from "../../types/preview-import";
import type { SessionData } from "../../types/session";

interface PreviewImportProps {
  initialQueue?: ActivePreviewImportQueue | null;
  stagedImport?: StagedPreviewImport | null;
  session?: SessionData | null;
}

export default function PreviewImport(props: Readonly<PreviewImportProps>) {
  const router = useRouter();
  const snackbar = useSnackbarBridge();

  const [staged, setStaged] = React.useState<StagedPreviewImport | null>(props.stagedImport ?? null);
  const [loading, setLoading] = React.useState(false);
  const [committing, setCommitting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"inScope" | "outOfScope">("inScope");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);

  // Sync props if changed
  React.useEffect(() => {
    if (props.stagedImport) {
      setStaged(props.stagedImport);
    }
  }, [props.stagedImport]);

  const onTriggerCheck = async (force: boolean = false) => {
    setLoading(true);
    try {
      const data = await mutationRequest<{
        action?: string;
        message?: string;
        staged?: StagedPreviewImport;
      }>({
        url: "/api/admin-preview-import",
        method: "POST",
        body: { action: "trigger-check", force },
      });

      snackbar.enqueueSnackbar(data.message || "Prüfung abgeschlossen.", {
        variant: data.action === "STAGED_NEW_PREVIEW" ? "success" : "info",
      });
      if (data.staged) {
        setStaged(data.staged);
      }
      router.refresh();
    } catch (err) {
      snackbar.enqueueSnackbar(err instanceof Error ? err.message : "Prüfung fehlgeschlagen.", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const onCommitBatch = async () => {
    if (!staged) return;
    setCommitting(true);
    try {
      const approvedDraftIds = staged.drafts.filter((d) => d.selected).map((d) => d.id);
      if (approvedDraftIds.length === 0) {
        snackbar.enqueueSnackbar("Bitte mindestens eine Ausgabe zum Import auswählen.", {
          variant: "warning",
        });
        setCommitting(false);
        return;
      }

      const data = await mutationRequest<{
        committedCount?: number;
        skippedCount?: number;
      }>({
        url: "/api/admin-preview-import",
        method: "POST",
        body: {
          action: "commit",
          approvedDraftIds,
        },
      });

      snackbar.enqueueSnackbar(
        `${data.committedCount ?? 0} Ausgaben erfolgreich importiert.`,
        { variant: "success" }
      );
      setStaged(null);
      router.refresh();
    } catch (err) {
      snackbar.enqueueSnackbar(err instanceof Error ? err.message : "Import fehlgeschlagen.", {
        variant: "error",
      });
    } finally {
      setCommitting(false);
    }
  };

  const onDiscard = async () => {
    setLoading(true);
    try {
      await mutationRequest<{ success?: boolean }>({
        url: "/api/admin-preview-import",
        method: "DELETE",
      });
      setStaged(null);
      snackbar.enqueueSnackbar("Import-Vorschau verworfen.", { variant: "info" });
      router.refresh();
    } catch (err) {
      snackbar.enqueueSnackbar(err instanceof Error ? err.message : "Verwerfen fehlgeschlagen.", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const onToggleDraft = async (draftId: string) => {
    if (!staged) return;
    const nextDrafts = staged.drafts.map((d) =>
      d.id === draftId ? { ...d, selected: !d.selected } : d
    );
    setStaged({ ...staged, drafts: nextDrafts });

    // Inform server in background
    fetch("/api/admin-preview-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle-draft", draftId }),
    }).catch(() => {});
  };

  const onSelectAllVisible = (select: boolean) => {
    if (!staged) return;
    const visibleIds = new Set(filteredDrafts.map((d) => d.id));
    const nextDrafts = staged.drafts.map((d) =>
      visibleIds.has(d.id) ? { ...d, selected: select } : d
    );
    setStaged({ ...staged, drafts: nextDrafts });
  };

  const onManualUpload = async () => {
    if (!uploadFile) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("file", uploadFile);
      const res = await fetch("/api/admin-preview-import", {
        method: "POST",
        body: formData,
      });
      const rawText = await res.text().catch(() => "");
      let data: { error?: string; staged?: StagedPreviewImport } = {};
      try {
        if (rawText) data = JSON.parse(rawText);
      } catch {
        throw new Error(
          res.status === 504
            ? "Server-Timeout (504): Die PDF-Analyse dauerte länger als das Proxy-Limit."
            : `Serverfehler (${res.status}): Die Datei konnte nicht verarbeitet werden.`
        );
      }
      if (!res.ok) throw new Error(data.error || "Upload fehlgeschlagen");
      snackbar.enqueueSnackbar("PDF erfolgreich analysiert.", {
        variant: "success",
      });
      if (data.staged) setStaged(data.staged);
      router.refresh();
    } catch (err) {
      snackbar.enqueueSnackbar(err instanceof Error ? err.message : "Fehler beim Upload", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter drafts for current tab and category
  const inScopeDrafts = staged?.drafts.filter((d) => d.inScope) ?? [];
  const outOfScopeDrafts = staged?.drafts.filter((d) => !d.inScope) ?? [];
  const tabDrafts = activeTab === "inScope" ? inScopeDrafts : outOfScopeDrafts;

  const filteredDrafts = tabDrafts.filter((d) => {
    if (categoryFilter === "all") return true;
    return d.category === categoryFilter;
  });

  const selectedCount = staged?.drafts.filter((d) => d.selected).length ?? 0;

  // View 1: Staged Preview is ready for Review
  if (staged && staged.status === "PENDING_REVIEW") {
    return (
      <>
        <CardHeader
          title={staged.title}
          subheader={`${staged.fileName} • ${staged.inScopeDrafts} Einträge im Marvel-Umfeld (${staged.totalDrafts} gesamt)`}
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                disabled={loading || committing}
                onClick={onDiscard}
              >
                Verwerfen
              </Button>
              <Button
                variant="contained"
                color="primary"
                size="small"
                disabled={loading || committing || selectedCount === 0}
                onClick={onCommitBatch}
                startIcon={committing ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {committing ? "Importiere..." : `${selectedCount} Ausgaben importieren`}
              </Button>
            </Stack>
          }
        />

        <CardContent sx={{ pt: 1 }}>
          <Stack spacing={2}>
            {/* Status chips & Filter tabs */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={1.5}
            >
              <Tabs
                value={activeTab}
                onChange={(_, val) => {
                  setActiveTab(val);
                  setCategoryFilter("all");
                }}
              >
                <Tab
                  value="inScope"
                  label={`Marvel (${inScopeDrafts.length})`}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                />
                <Tab
                  value="outOfScope"
                  label={`Weitere Titel (${outOfScopeDrafts.length})`}
                  sx={{ textTransform: "none" }}
                />
              </Tabs>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={`${staged.readyCount} Bereit`}
                  color="success"
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`${staged.newSeriesCount} Neue Serien`}
                  color="warning"
                  size="small"
                  variant="outlined"
                />
                {staged.duplicateCount > 0 && (
                  <Chip
                    label={`${staged.duplicateCount} Bereits vorhanden`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>
            </Stack>

            {/* Scope category subfilters */}
            {activeTab === "inScope" && (
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
                <Chip
                  label="Alle"
                  clickable
                  color={categoryFilter === "all" ? "primary" : "default"}
                  size="small"
                  onClick={() => setCategoryFilter("all")}
                />
                <Chip
                  label="Marvel Superhelden"
                  clickable
                  color={categoryFilter === "marvel" ? "primary" : "default"}
                  size="small"
                  onClick={() => setCategoryFilter("marvel")}
                />
                <Chip
                  label="Star Wars"
                  clickable
                  color={categoryFilter === "star_wars" ? "primary" : "default"}
                  size="small"
                  onClick={() => setCategoryFilter("star_wars")}
                />
                <Chip
                  label="Alien & Predator"
                  clickable
                  color={categoryFilter === "alien_predator" ? "primary" : "default"}
                  size="small"
                  onClick={() => setCategoryFilter("alien_predator")}
                />
                <Chip
                  label="Crossovers"
                  clickable
                  color={categoryFilter === "crossover" ? "primary" : "default"}
                  size="small"
                  onClick={() => setCategoryFilter("crossover")}
                />
                <Chip
                  label="Manga"
                  clickable
                  color={categoryFilter === "marvel_manga" ? "primary" : "default"}
                  size="small"
                  onClick={() => setCategoryFilter("marvel_manga")}
                />

                <Box sx={{ flex: 1 }} />

                <Button size="small" onClick={() => onSelectAllVisible(true)}>
                  Alle wählen
                </Button>
                <Button size="small" color="inherit" onClick={() => onSelectAllVisible(false)}>
                  Keine
                </Button>
              </Stack>
            )}

            {/* Review Table */}
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={
                          filteredDrafts.length > 0 &&
                          filteredDrafts.every((d) => d.selected)
                        }
                        indeterminate={
                          filteredDrafts.some((d) => d.selected) &&
                          !filteredDrafts.every((d) => d.selected)
                        }
                        onChange={(e) => onSelectAllVisible(e.target.checked)}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Ausgabe</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Serie & Verlag</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Format / Datum</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Enthaltene US-Stories</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Bestellcode</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDrafts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: "text.secondary" }}>
                        Keine Einträge für die gewählte Filterung.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDrafts.map((draft) => (
                      <TableRow
                        key={draft.id}
                        hover
                        selected={draft.selected}
                        sx={{
                          opacity: draft.status === "DUPLICATE" ? 0.5 : 1,
                        }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={draft.selected}
                            onChange={() => onToggleDraft(draft.id)}
                          />
                        </TableCell>

                        <TableCell>
                          {draft.status === "READY" && (
                            <Chip label="Bereit" color="success" size="small" variant="outlined" />
                          )}
                          {draft.status === "NEW_SERIES" && (
                            <Tooltip title="Serie wird beim Import neu angelegt">
                              <Chip label="Neue Serie" color="warning" size="small" variant="outlined" />
                            </Tooltip>
                          )}
                          {draft.status === "DUPLICATE" && (
                            <Tooltip title={draft.statusMessage || "Bereits in Datenbank vorhanden"}>
                              <Chip label="In DB" size="small" variant="outlined" />
                            </Tooltip>
                          )}
                          {draft.isVariant && (
                            <Chip label="Variant" size="small" sx={{ ml: 0.5 }} />
                          )}
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {draft.issue.title || draft.series.title} #{draft.issue.number}
                          </Typography>
                          {draft.issue.variant && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {draft.issue.variant}
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2">{draft.series.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {draft.series.publisherName} (Vol. {draft.series.volume})
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2">
                            {draft.issue.format || "Softcover"}
                            {draft.issue.price ? ` • ${draft.issue.price} €` : ""}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {draft.issue.releasedate || "Unbekannt"}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ maxWidth: 280 }}>
                          <Typography variant="body2" noWrap title={draft.issue.storiesSummary}>
                            {draft.issue.storiesSummary || `${draft.issue.storiesCount} Story(s)`}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace">
                            {draft.issueCode || "-"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </CardContent>
      </>
    );
  }

  // View 2: Idle State (No staged preview currently waiting)
  return (
    <>
      <CardHeader
        title="Panini-Vorschau Import"
        subheader="Vorschau-Erkennung und Vorbereitung zur Übernahme in den Katalog"
        action={
          <Button
            variant="contained"
            color="primary"
            size="small"
            disabled={loading}
            onClick={() => onTriggerCheck(true)}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? "Prüfe..." : "Nach Vorschau suchen"}
          </Button>
        }
      />

      <CardContent sx={{ pt: 1 }}>
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            Aktuell liegt keine ausstehende Vorschau zur Prüfung vor. Der automatische Hintergrundjob
            prüft täglich auf neue Veröffentlichungen. Sie können die Prüfung jederzeit manuell anstoßen
            oder eine Vorschau-PDF direkt hochladen.
          </Typography>

          <Divider />

          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Manuelle PDF-Verarbeitung
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center">
              <Button component="label" variant="outlined" size="small" disabled={loading}>
                Datei auswählen
                <input
                  hidden
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                {uploadFile ? uploadFile.name : "Keine Datei ausgewählt"}
              </Typography>
              <Button
                variant="contained"
                color="inherit"
                size="small"
                disabled={!uploadFile || loading}
                onClick={onManualUpload}
              >
                Analysieren
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </>
  );
}
