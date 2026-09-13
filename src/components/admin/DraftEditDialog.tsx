"use client";

import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { formats, currencies } from "../restricted/editor/issue-editor/constants";
import { parseStoryReferences } from "../../services/story-reference-parser";
import type { StagedPreviewDraft } from "../../types/preview-import";
import type { IssueEditorFormValues } from "../restricted/editor/issue-editor/types";

interface DraftEditDialogProps {
  open: boolean;
  draft: StagedPreviewDraft | null;
  onClose: () => void;
  onSave: (draftId: string, updatedValues: Partial<IssueEditorFormValues>) => Promise<void>;
}

export function DraftEditDialog({
  open,
  draft,
  onClose,
  onSave,
}: Readonly<DraftEditDialogProps>) {
  const [seriesTitle, setSeriesTitle] = React.useState("");
  const [volume, setVolume] = React.useState<number>(1);
  const [publisherName, setPublisherName] = React.useState("Panini Comics");
  const [issueNumber, setIssueNumber] = React.useState("");
  const [issueTitle, setIssueTitle] = React.useState("");
  const [variant, setVariant] = React.useState("");
  const [format, setFormat] = React.useState("Softcover");
  const [releasedate, setReleasedate] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [currency, setCurrency] = React.useState("EUR");
  const [pages, setPages] = React.useState<number | "">("");
  const [limitation, setLimitation] = React.useState("");
  const [addinfo, setAddinfo] = React.useState("");
  const [isbn, setIsbn] = React.useState("");
  const [storyString, setStoryString] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [storyError, setStoryError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!draft) return;
    const v = draft.rawDraft.values;
    setSeriesTitle(v.series?.title || draft.series.title || "");
    setVolume(Number(v.series?.volume || draft.series.volume || 1));
    setPublisherName(v.series?.publisher?.name || draft.series.publisherName || "Panini Comics");
    setIssueNumber(String(v.number ?? draft.issue.number ?? ""));
    setIssueTitle(String(v.title ?? draft.issue.title ?? ""));
    setVariant(v.variant ?? draft.issue.variant ?? "");
    setFormat(v.format ?? draft.issue.format ?? "Softcover");
    setReleasedate(v.releasedate ?? draft.issue.releasedate ?? "");
    setPrice(v.price ? String(v.price) : draft.issue.price ? String(draft.issue.price) : "");
    setCurrency(v.currency ?? draft.issue.currency ?? "EUR");
    setPages(v.pages != null ? v.pages : draft.issue.pages != null ? draft.issue.pages : "");
    setLimitation(v.limitation ?? draft.issue.limitation ?? "");
    setAddinfo(v.addinfo ?? draft.issue.addinfo ?? "");
    setIsbn(v.isbn ?? "");

    if (v.storyString) {
      setStoryString(v.storyString);
    } else if (Array.isArray(v.stories) && v.stories.length > 0) {
      const parts = v.stories.map((s: Record<string, unknown>) => {
        const parent = s.parent as { issue?: { series?: { title?: string }; number?: string | number } } | undefined;
        const pSeries = parent?.issue?.series?.title || (typeof s.title === "string" ? s.title : "");
        const pNum = parent?.issue?.number ?? s.number ?? "";
        return `${pSeries} ${pNum}`.trim();
      }).filter(Boolean);
      setStoryString(parts.join(", "));
    } else {
      setStoryString("");
    }
    setStoryError(null);
  }, [draft]);

  const handleStoryChange = (val: string) => {
    setStoryString(val);
    if (!val.trim()) {
      setStoryError(null);
      return;
    }
    const parsed = parseStoryReferences(val);
    if (parsed.error) {
      setStoryError(parsed.error);
    } else {
      setStoryError(null);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      let stories: Array<Record<string, unknown>> = draft.rawDraft.values.stories || [];

      if (storyString.trim()) {
        const parsed = parseStoryReferences(storyString);
        if (parsed.error) {
          setStoryError(parsed.error);
          setSaving(false);
          return;
        }
        stories = parsed.references.map((ref, idx) => ({
          number: idx + 1,
          title: "",
          exclusive: false,
          addinfo: "",
          part: "",
          parent: {
            issue: {
              series: {
                title: ref.seriesTitle,
                volume: ref.volume,
                publisher: { name: "Marvel", us: true },
              },
              number: ref.issueNumber,
            },
            number: 0,
          },
        }));
      } else {
        stories = [];
      }

      const updatedValues: Partial<IssueEditorFormValues> = {
        series: {
          title: seriesTitle.trim(),
          volume,
          publisher: {
            name: publisherName.trim(),
            us: false,
          },
        },
        number: issueNumber.trim(),
        title: issueTitle.trim(),
        variant: variant.trim(),
        format,
        releasedate: releasedate.trim(),
        price: price.trim(),
        currency,
        pages: pages === "" ? undefined : Number(pages),
        limitation: limitation.trim(),
        addinfo: addinfo.trim(),
        isbn: isbn.trim(),
        stories,
        storyString: storyString.trim(),
      };

      await onSave(draft.id, updatedValues);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" component="div">
          Eintrag bearbeiten
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {draft?.sourceTitle}
          {draft?.issueCode ? ` • Bestellcode: ${draft.issueCode}` : ""}
        </Typography>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={3}>
          {/* Series / Publisher Section */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              Serie & Verlag
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 7 }}>
                <TextField
                  label="Serientitel"
                  value={seriesTitle}
                  onChange={(e) => setSeriesTitle(e.target.value)}
                  fullWidth
                  size="small"
                  required
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 2 }}>
                <TextField
                  label="Vol."
                  type="number"
                  value={volume}
                  onChange={(e) => setVolume(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  label="Verlag"
                  value={publisherName}
                  onChange={(e) => setPublisherName(e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Issue & Variant Details */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              Ausgabe & Format
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 4, sm: 2 }}>
                <TextField
                  label="Nummer"
                  value={issueNumber}
                  onChange={(e) => setIssueNumber(e.target.value)}
                  fullWidth
                  size="small"
                  required
                />
              </Grid>
              <Grid size={{ xs: 8, sm: 5 }}>
                <TextField
                  label="Titel (optional)"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="z. B. Panini Comics Magazin"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField
                  label="Variante / Cover (optional)"
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="z. B. Variant Cover B, Comic-Salon Exklusiv"
                />
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  select
                  label="Format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  fullWidth
                  size="small"
                >
                  {formats.map((fmt) => (
                    <MenuItem key={fmt} value={fmt}>
                      {fmt}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  label="Erscheinungsdatum"
                  value={releasedate}
                  onChange={(e) => setReleasedate(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="YYYY-MM-DD"
                />
              </Grid>
              <Grid size={{ xs: 4, sm: 2 }}>
                <TextField
                  label="Preis"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="14.00"
                />
              </Grid>
              <Grid size={{ xs: 4, sm: 2 }}>
                <TextField
                  select
                  label="Währung"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  fullWidth
                  size="small"
                >
                  {currencies.map((curr) => (
                    <MenuItem key={curr} value={curr}>
                      {curr}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 4, sm: 2 }}>
                <TextField
                  label="Seiten"
                  type="number"
                  value={pages}
                  onChange={(e) => setPages(e.target.value === "" ? "" : Number(e.target.value))}
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Additional details */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              Zusatzangaben
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField
                  label="Limitierung"
                  value={limitation}
                  onChange={(e) => setLimitation(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="z. B. 555"
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField
                  label="ISBN"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Zusatzinfo"
                  value={addinfo}
                  onChange={(e) => setAddinfo(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="z. B. Hardcover auf 333 Ex. limitiert"
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Stories */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Enthaltene US-Stories
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
              Kommagetrennte Liste der enthaltenen US-Originalhefte (z. B. <i>Amazing Spider-Man 1-5, Spectacular Spider-Man 10</i>).
            </Typography>
            <TextField
              value={storyString}
              onChange={(e) => handleStoryChange(e.target.value)}
              fullWidth
              multiline
              rows={2}
              size="small"
              placeholder="z. B. Avengers 1-6, Iron Man 55"
              error={Boolean(storyError)}
              helperText={storyError}
            />
            {storyError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {storyError}
              </Alert>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Abbrechen
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={saving || Boolean(storyError)}
        >
          {saving ? "Wird gespeichert..." : "Änderungen übernehmen"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
