"use client";

import React from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { parseStoryReferences } from "../../../../services/story-reference-parser";
import {
  cloneFieldItem,
  ensureFieldItemClientId,
  storyDefault,
} from "../issue-sections/defaults";
import type { FieldItem } from "../issue-sections/types";
import type { IssueEditorFormValues } from "./types";
import type { PaniniScrapedIssue } from "../../../../services/panini-scraper";

interface PaniniImportPanelProps {
  values: IssueEditorFormValues;
  edit?: boolean;
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void;
}

type ImportState = "idle" | "loading" | "success" | "error";

function PaniniImportPanel({ values, edit, setFieldValue }: Readonly<PaniniImportPanelProps>) {
  const [url, setUrl] = React.useState("");
  const [state, setState] = React.useState<ImportState>("idle");
  const [message, setMessage] = React.useState<string | null>(null);

  // Only visible for new DE issues
  const isVisible = !edit && !values.series.publisher.us;
  if (!isVisible) return null;

  const handleImport = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setState("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/panini-scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const json = (await res.json()) as { data?: PaniniScrapedIssue; error?: string };

      if (!res.ok || json.error) {
        setState("error");
        setMessage(json.error ?? "Import fehlgeschlagen.");
        return;
      }

      if (!json.data) {
        setState("error");
        setMessage("Keine Daten empfangen.");
        return;
      }

      applyImportedData(json.data, setFieldValue);

      setState("success");
      setMessage(buildSuccessMessage(json.data));
    } catch {
      setState("error");
      setMessage("Netzwerkfehler beim Import.");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (state === "loading" || !url.trim()) return;
    void handleImport();
  };

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.5,
        backgroundColor: "transparent",
        boxShadow: "none",
        "&::before": { display: "none" },
        "& .MuiAccordionSummary-root": {
          minHeight: 44,
          px: 1.5,
        },
        "& .MuiAccordionSummary-content": {
          my: 0,
        },
        "& .MuiAccordionSummary-content.Mui-expanded": {
          my: 0,
        },
        "& .MuiAccordionDetails-root": {
          px: 1.5,
          pt: 0.5,
          pb: 1.5,
        },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="body2">Panini importieren</Typography>
      </AccordionSummary>

      <AccordionDetails>
        <Stack spacing={1}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems="center">
            <TextField
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                if (state !== "idle") {
                  setState("idle");
                  setMessage(null);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="panini.de/shp_deu_de/…"
              fullWidth
              size="small"
              disabled={state === "loading"}
            />

            <Button
              variant="text"
              size="small"
              onClick={() => void handleImport()}
              disabled={state === "loading" || !url.trim()}
              sx={{
                minWidth: "auto",
                px: 1,
                py: 0.5,
                minHeight: 30,
                alignSelf: "center",
                whiteSpace: "nowrap",
              }}
            >
              {state === "loading" ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                "Importieren"
              )}
            </Button>
          </Stack>

          {message ? (
            <Typography
              variant="body2"
              color={state === "error" ? "error.main" : "text.secondary"}
            >
              {message}
            </Typography>
          ) : null}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function applyImportedData(
  data: PaniniScrapedIssue,
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void
) {
  if (data.title) setFieldValue("title", data.title, false);
  if (data.seriesTitle) setFieldValue("series.title", data.seriesTitle, false);
  setFieldValue("series.volume", 1, false);

  if (data.isbn) setFieldValue("isbn", data.isbn, false);
  if (data.pages) setFieldValue("pages", data.pages, false);
  if (data.releasedate) setFieldValue("releasedate", data.releasedate, false);

  if (data.containsRaw) {
    const storyItems = buildStoryItemsFromContains(data.containsRaw);
    if (storyItems.length > 0) {
      setFieldValue("stories", storyItems, false);
    }
  }
}

function buildStoryItemsFromContains(containsRaw: string): FieldItem[] {
  const normalized = normalizePaniniContainsString(containsRaw);
  const parsed = parseStoryReferences(normalized);

  if (parsed.error || parsed.references.length === 0) {
    return [];
  }

  return parsed.references.map((reference, index) => {
    const item = ensureFieldItemClientId(cloneFieldItem(storyDefault));
    item.exclusive = false;
    item.number = index + 1;
    item.parent = {
      issue: {
        series: {
          title: reference.seriesTitle,
          volume: reference.volume,
          publisher: { name: "" },
        },
        number: reference.issueNumber,
      },
      number: 0,
    };
    return item;
  });
}

/**
 * Normalizes a Panini "Enthält" string to be compatible with parseStoryReferences.
 *
 * Examples:
 *   "Spider-Man: Life Story (2019) 1–6 & Annual"
 *   → "Spider-Man: Life Story 1-6, Annual"
 *
 *   "Amazing Spider-Man (2018) 1-5, Annual 1"
 *   → "Amazing Spider-Man 1-5, Annual 1"
 */
function normalizePaniniContainsString(raw: string): string {
  return raw
    .replace(/\s*\((?!\d{4}\b)[^)]+\)/g, "") // remove parenthesized annotations that are not 4-digit years (e.g. (I), (Part 1))
    .replaceAll(/\s*\(\d{4}\)\s*/g, " ") // remove (year)
    .replaceAll(/\s*&\s*/g, ", ") // & → ,
    .trim();
}

function buildSuccessMessage(data: PaniniScrapedIssue): string {
  const parts: string[] = [`„${data.title}" importiert.`];

  if (data.isbn) parts.push(`ISBN: ${data.isbn}`);
  if (data.pages) parts.push(`${data.pages} Seiten`);
  if (data.releasedate) parts.push(`Erscheint: ${data.releasedate}`);

  const storyCount = data.containsRaw
    ? parseStoryReferences(normalizePaniniContainsString(data.containsRaw)).references.length
    : 0;

  if (storyCount > 0) {
    parts.push(`${storyCount} Story-Referenz${storyCount === 1 ? "" : "en"} importiert`);
  } else if (data.containsRaw) {
    parts.push(`Enthält: ${data.containsRaw} (manuell prüfen)`);
  }

  return parts.join(" · ");
}

export default PaniniImportPanel;
