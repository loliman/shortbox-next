"use client";

import React from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { parseStoryReferences } from "../../../../services/story-reference-parser";
import { cloneFieldItem, ensureFieldItemClientId, storyDefault } from "./defaults";
import type { ContainsProps, FieldItem } from "./types";

function StoryBulkImport(props: ContainsProps) {
  const [value, setValue] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [messageTone, setMessageTone] = React.useState<"error" | "success">("success");

  if (props.us) return null;

  const handleImport = () => {
    if (!props.setFieldValue) return;

    const parsed = parseStoryReferences(value);
    if (parsed.error) {
      setMessage(parsed.error);
      setMessageTone("error");
      return;
    }

    if (parsed.references.length === 0) {
      setMessage("Keine verwertbaren Story-Referenzen gefunden.");
      setMessageTone("error");
      return;
    }

    const existingItems = Array.isArray(props.items) ? props.items : [];
    const nextItems = [
      ...existingItems,
      ...parsed.references.map((reference) => buildStoryItem(reference.seriesTitle, reference.volume, reference.issueNumber)),
    ].map((item, index) => ({
      ...item,
      number: index + 1,
    }));

    props.setFieldValue("stories", nextItems, true);
    setValue("");
    setMessage(`${parsed.references.length} Story-Referenz${parsed.references.length === 1 ? "" : "en"} hinzugefugt.`);
    setMessageTone("success");
  };

  return (
    <Stack spacing={1.5}>
      <TextField
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (message) setMessage(null);
        }}
        label="Stories aus Heftliste erzeugen"
        placeholder="Strange Tales 110-111, 114-146, Amazing Spider-Man Annual 2"
        multiline
        minRows={2}
        fullWidth
        disabled={props.disabled}
        helperText="Komma, Semikolon oder Zeilenumbruch trennen Eintrage. Ohne Volume wird automatisch Vol. 1 angenommen."
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }}>
        <Typography
          variant="body2"
          color={messageTone === "error" ? "error.main" : "text.secondary"}
        >
          {message || "Es werden Parent-Issue-Referenzen fur nicht-exklusive Stories angelegt."}
        </Typography>

        <Button
          variant="outlined"
          onClick={handleImport}
          disabled={props.disabled || value.trim().length === 0}
        >
          Heftliste ubernehmen
        </Button>
      </Stack>
    </Stack>
  );
}

function buildStoryItem(seriesTitle: string, volume: number, issueNumber: string): FieldItem {
  const nextItem = ensureFieldItemClientId(cloneFieldItem(storyDefault));
  nextItem.exclusive = false;
  nextItem.parent = {
    issue: {
      series: {
        title: seriesTitle,
        volume,
        publisher: {
          name: "",
        },
      },
      number: issueNumber,
    },
    number: 0,
  };

  return nextItem;
}

export default StoryBulkImport;
