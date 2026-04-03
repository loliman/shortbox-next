"use client";

import React from "react";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import AddContainsButton from "./AddContainsButton";
import Contains from "./Contains";
import StoryBulkImport from "./StoryBulkImport";
import StoryFields from "./StoryFields";
import { storyDefault } from "./defaults";
import type { ContainsProps } from "./types";

function Stories(props: Readonly<ContainsProps>) {
  const [expandedStoryIndex, setExpandedStoryIndex] = React.useState<number | null>(null);
  const [draggedStoryIndex, setDraggedStoryIndex] = React.useState<number | null>(null);
  const [dragOverStoryIndex, setDragOverStoryIndex] = React.useState<number | null>(null);
  const storyCount = Array.isArray(props.items) ? props.items.length : 0;

  React.useEffect(() => {
    if (storyCount === 0) {
      setExpandedStoryIndex(null);
      return;
    }

    setExpandedStoryIndex((prev) => {
      if (prev === null) return 0;
      if (prev >= storyCount) return storyCount - 1;
      return prev;
    });
  }, [storyCount]);

  return (
    <Stack spacing={2}>
      <StoryBulkImport {...props} />

      <Contains
        {...props}
        type="stories"
        fields={<StoryFields />}
        expandedStoryIndex={expandedStoryIndex}
        draggedStoryIndex={draggedStoryIndex}
        dragOverStoryIndex={dragOverStoryIndex}
        onStoryToggle={(index) => {
          setExpandedStoryIndex((prev) => (prev === index ? null : index));
        }}
        onStoryDragStart={(index) => {
          setDraggedStoryIndex(index);
          setDragOverStoryIndex(index);
        }}
        onStoryDragOver={(index) => {
          setDragOverStoryIndex(index);
        }}
        onStoryDragEnd={() => {
          setDraggedStoryIndex(null);
          setDragOverStoryIndex(null);
        }}
        onStoryReorder={(fromIndex, toIndex) => {
          if (props.disabled) return;
          if (!props.setFieldValue) return;
          if (fromIndex === toIndex) return;

          const items = Array.isArray(props.items) ? [...props.items] : [];
          if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
            return;
          }

          const [movedItem] = items.splice(fromIndex, 1);
          if (!movedItem) return;
          items.splice(toIndex, 0, movedItem);

          const renumberedItems = items.map((item, index) => ({
            ...item,
            number: index + 1,
          }));

          props.setFieldValue("stories", renumberedItems, true);

          setExpandedStoryIndex((prev) => {
            if (prev === null) return null;
            if (prev === fromIndex) return toIndex;
            if (fromIndex < toIndex && prev > fromIndex && prev <= toIndex) return prev - 1;
            if (toIndex < fromIndex && prev >= toIndex && prev < fromIndex) return prev + 1;
            return prev;
          });

          setDraggedStoryIndex(null);
          setDragOverStoryIndex(null);
        }}
      />

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <AddContainsButton
          type="stories"
          defaultItem={storyDefault}
          {...props}
          onStoryAdded={(index) => {
            setExpandedStoryIndex(index);
          }}
        />
      </Box>
    </Stack>
  );
}

export default Stories;
