"use client";

import React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
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
      const response = await fetch("/api/admin-preview-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger-check", force }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Prüfung fehlgeschlagen");
      }
      snackbar.enqueueSnackbar(data.message || "Prüfung erfolgreich abgeschlossen", {
        variant: data.action === "STAGED_NEW_PREVIEW" ? "success" : "info",
      });
      if (data.staged) {
        setStaged(data.staged);
      }
      router.refresh();
    } catch (err) {
      snackbar.enqueueSnackbar(err instanceof Error ? err.message : "Fehler bei der Prüfung", {
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

      const response = await fetch("/api/admin-preview-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "commit",
          approvedDraftIds,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Batch-Import fehlgeschlagen");
      }

      snackbar.enqueueSnackbar(
        `Erfolgreich: ${data.committedCount} Ausgaben in Shortbox angelegt! (${data.skippedCount} übersprungen)`,
        { variant: "success" }
      );
      setStaged(null);
      router.refresh();
    } catch (err) {
      snackbar.enqueueSnackbar(err instanceof Error ? err.message : "Fehler beim Batch-Import", {
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
      snackbar.enqueueSnackbar("Vorschau-Staging verworfen.", { variant: "info" });
      router.refresh();
    } catch {
      snackbar.enqueueSnackbar("Verwerfen fehlgeschlagen.", { variant: "error" });
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload fehlgeschlagen");
      snackbar.enqueueSnackbar("PDF erfolgreich analysiert und für Review gestaged!", {
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

  // View 1: Staged Preview is ready for Review & Commit
  if (staged && staged.status === "PENDING_REVIEW") {
    return (
      <Stack spacing={3}>
        {/* Header Summary Card */}
        <Card elevation={1}>
          <CardContent>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              spacing={2}
            >
              <Box>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography variant="h5" component="h1" fontWeight={700}>
                    {staged.title}
                  </Typography>
                  <Chip
                    label="Human-in-the-Loop Review"
                    color="primary"
                    size="small"
                    variant="outlined"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Automatisch vorbereitet aus {staged.fileName} • {staged.totalDrafts} Ausgaben im Gesamtkatalog
                </Typography>
              </Box>

              {/* Action Buttons */}
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  color="inherit"
                  disabled={loading || committing}
                  onClick={onDiscard}
                >
                  Verwerfen
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={loading || committing || selectedCount === 0}
                  onClick={onCommitBatch}
                  startIcon={committing ? <CircularProgress size={18} color="inherit" /> : null}
                  sx={{ px: 3, fontWeight: 700 }}
                >
                  {committing
                    ? "Importiert..."
                    : `Jetzt ${selectedCount} Ausgaben importieren (Los geht's!)`}
                </Button>
              </Stack>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {/* Quick Metrics Badges */}
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <Chip
                label={`${staged.readyCount} Bereit zum Import`}
                color="success"
                size="small"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={`${staged.newSeriesCount} Neue Serien`}
                color="warning"
                size="small"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={`${staged.duplicateCount} Bereits in DB (Duplikate)`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`${staged.inScopeDrafts} Marvel & Kosmos`}
                color="info"
                size="small"
                variant="outlined"
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Tabs: Marvel vs Other */}
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => {
              setActiveTab(val);
              setCategoryFilter("all");
            }}
          >
            <Tab
              value="inScope"
              label={`🎯 Marvel-Fokus (${inScopeDrafts.length})`}
              sx={{ fontWeight: 700 }}
            />
            <Tab
              value="outOfScope"
              label={`Ausgefiltert / Non-Marvel (${outOfScopeDrafts.length})`}
            />
          </Tabs>
        </Box>

        {/* Subfilter Chips for Categories */}
        {activeTab === "inScope" && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              Bereich:
            </Typography>
            <Chip
              label="Alle Marvel"
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
              label="Marvel Manga"
              clickable
              color={categoryFilter === "marvel_manga" ? "primary" : "default"}
              size="small"
              onClick={() => setCategoryFilter("marvel_manga")}
            />

            <Box sx={{ flex: 1 }} />

            <Button size="small" onClick={() => onSelectAllVisible(true)}>
              Alle auswählen
            </Button>
            <Button size="small" color="inherit" onClick={() => onSelectAllVisible(false)}>
              Auswahl aufheben
            </Button>
          </Stack>
        )}

        {/* Review Table */}
        <TableContainer component={Paper} elevation={1} sx={{ maxHeight: 650 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
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
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Heft & Titel</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Serie & Verlag</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Format / VÖ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>US-Stories (Inhalt)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Bestellcode</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDrafts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    Keine Ausgaben in diesem Filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDrafts.map((draft) => (
                  <TableRow
                    key={draft.id}
                    hover
                    selected={draft.selected}
                    sx={{
                      opacity: draft.status === "DUPLICATE" ? 0.6 : 1,
                      backgroundColor: draft.selected ? "action.selected" : "inherit",
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={draft.selected}
                        onChange={() => onToggleDraft(draft.id)}
                      />
                    </TableCell>

                    {/* Status Chip */}
                    <TableCell>
                      {draft.status === "READY" && (
                        <Chip label="Bereit" color="success" size="small" />
                      )}
                      {draft.status === "NEW_SERIES" && (
                        <Tooltip title="Serie wird beim Import neu angelegt">
                          <Chip label="Neue Serie" color="warning" size="small" />
                        </Tooltip>
                      )}
                      {draft.status === "DUPLICATE" && (
                        <Tooltip title={draft.statusMessage || "Existiert bereits"}>
                          <Chip label="In DB" size="small" variant="outlined" />
                        </Tooltip>
                      )}
                      {draft.isVariant && (
                        <Chip label="Variant" size="small" sx={{ ml: 0.5 }} />
                      )}
                    </TableCell>

                    {/* Title & Number */}
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {draft.issue.title || draft.series.title} #{draft.issue.number}
                      </Typography>
                      {draft.issue.variant && (
                        <Typography variant="caption" color="text.secondary">
                          Cover / Variante: {draft.issue.variant}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Series & Publisher */}
                    <TableCell>
                      <Typography variant="body2">{draft.series.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {draft.series.publisherName} (Vol. {draft.series.volume})
                      </Typography>
                    </TableCell>

                    {/* Format & Release */}
                    <TableCell>
                      <Typography variant="body2">
                        {draft.issue.format || "Softcover"} • {draft.issue.price ? `${draft.issue.price} €` : "-"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {draft.issue.releasedate || "Unbekannt"}
                      </Typography>
                    </TableCell>

                    {/* Stories */}
                    <TableCell sx={{ maxWidth: 300 }}>
                      <Typography variant="body2" noWrap title={draft.issue.storiesSummary}>
                        {draft.issue.storiesSummary || `${draft.issue.storiesCount} Story(s)`}
                      </Typography>
                    </TableCell>

                    {/* Issue Code */}
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
    );
  }

  // View 2: Empty State (No staged preview currently waiting)
  return (
    <Stack spacing={3} maxWidth={800} sx={{ mx: "auto", mt: 4 }}>
      <Card elevation={2}>
        <CardContent sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Panini-Vorschau Auto-Import (Marvel-Fokus)
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Der Hintergrund-Worker prüft täglich automatisch auf neue Panini-Vorschau-Ausgaben.
            Sobald eine neue Vorschau erscheint, wird sie automatisch geladen, auf den Marvel-Kosmos vorgefiltert
            und steht hier für dein 1-Klick-Review bereit.
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center" sx={{ mb: 4 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              onClick={() => onTriggerCheck(true)}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{ fontWeight: 700, px: 3 }}
            >
              {loading ? "Prüfe & Lade Vorschau..." : "Jetzt online nach neuer PV suchen"}
            </Button>
          </Stack>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary">
              ODER MANUELL HOCHLADEN
            </Typography>
          </Divider>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
            alignItems="center"
          >
            <Button component="label" variant="outlined" disabled={loading}>
              PDF-Datei wählen
              <input
                hidden
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </Button>
            <Typography variant="body2" color="text.secondary">
              {uploadFile ? uploadFile.name : "Keine Datei gewählt"}
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              disabled={!uploadFile || loading}
              onClick={onManualUpload}
            >
              Analysieren & Stagen
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Alert severity="info">
        <strong>Human in the Loop:</strong> Selbst wenn der Worker im Hintergrund eine neue PDF entdeckt,
        werden <em>niemals</em> Daten selbstständig in die Datenbank eingetragen. Du hast immer die volle
        Kontrolle und gibst die Ausgaben mit einem einzigen Klick frei.
      </Alert>
    </Stack>
  );
}
