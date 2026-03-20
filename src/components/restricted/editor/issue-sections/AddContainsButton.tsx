import React from "react";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import { cloneFieldItem } from "./defaults";
import type { ContainsProps, FieldItem } from "./types";

interface AddContainsButtonProps extends ContainsProps {
  type: "stories";
  defaultItem: FieldItem;
}

function focusAndScrollToStory(index: number) {
  if (typeof document === "undefined") return;

  const run = () => {
    const card = document.querySelector<HTMLElement>(
      `[data-story-card="true"][data-story-index="${index}"]`,
    );
    const firstInput = document.querySelector<HTMLInputElement>(`input[name="stories[${index}].number"]`);

    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (firstInput) {
      firstInput.focus();
      firstInput.select?.();
      return true;
    }

    return false;
  };

  let attempts = 0;
  const maxAttempts = 8;

  const tryFocus = () => {
    attempts += 1;
    if (run() || attempts >= maxAttempts) return;
    window.setTimeout(tryFocus, 40);
  };

  requestAnimationFrame(tryFocus);
}

function AddContainsButton(props: AddContainsButtonProps) {
  return (
    <Button
      disabled={props.disabled}
      variant="outlined"
      size="small"
      startIcon={<AddIcon />}
      onClick={() => {
        if (!props.setFieldValue) return;

        const items = Array.isArray(props.items) ? props.items : [];
        const newIndex = items.length;
        const nextItem = cloneFieldItem(props.defaultItem);
        nextItem.number = newIndex + 1;

        props.setFieldValue(props.type, [...items, nextItem], true);
        props.onStoryAdded?.(newIndex);
        focusAndScrollToStory(newIndex);
      }}
    >
      Geschichte
    </Button>
  );
}

export default AddContainsButton;
