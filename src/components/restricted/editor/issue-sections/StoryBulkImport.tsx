"use client";

import React from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { parseStoryReferences } from "../../../../services/story-reference-parser";
import { cloneFieldItem, ensureFieldItemClientId, storyDefault } from "./defaults";
import type { ContainsProps, FieldItem } from "./types";

function StoryBulkImport(props: Readonly<ContainsProps>) {
  const [value, setValue] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [messageTone, setMessageTone] = React.useState<"error" | "success">("success");

  if (props.us || !props.canUseStoryImport) return null;

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
    setMessage(
      `${parsed.references.length} Story-Referenz${parsed.references.length === 1 ? "" : "en"} hinzugefugt.`
    );
    setMessageTone("success");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (props.disabled || value.trim().length === 0) return;
    handleImport();
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
        <Typography variant="body2">Story-String importieren</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems="center">
            <TextField
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                if (message) setMessage(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="US-Hefte einfugen, z. B. Strange Tales 110-111, 114-146, Amazing Spider-Man Annual 2"
              fullWidth
              size="small"
              disabled={props.disabled}
              slotProps={{
                formHelperText: {
                  sx: {
                    mb: 0.5,
                  },
                },
              }}
            />

            <Button
              variant="text"
              size="small"
              onClick={handleImport}
              disabled={props.disabled || value.trim().length === 0}
              sx={{
                minWidth: "auto",
                px: 1,
                py: 0.5,
                minHeight: 30,
                alignSelf: "center",
                whiteSpace: "nowrap",
              }}
            >
              Anlegen
            </Button>
          </Stack>

          {message ? (
            <Typography variant="body2" color={messageTone === "error" ? "error.main" : "text.secondary"}>
              {message}
            </Typography>
          ) : null}
        </Stack>
      </AccordionDetails>
    </Accordion>
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
