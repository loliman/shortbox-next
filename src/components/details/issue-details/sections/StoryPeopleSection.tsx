"use client";

import React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { IndividualList } from "../contains/IndividualList";

type StoryPeopleSectionProps = {
  item: Record<string, unknown>;
  us?: boolean;
  includeTranslator?: boolean;
  translatorOptional?: boolean;
};

export function StoryPeopleSection(props: Readonly<StoryPeopleSectionProps>) {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
        <Typography
          sx={{
            fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
            fontSize: "0.78rem",
            lineHeight: 1.5,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "text.secondary",
          }}
        >
          Mitwirkende
        </Typography>
        <IconButton
          size="small"
          aria-label={expanded ? "Mitwirkende einklappen" : "Mitwirkende ausklappen"}
          onClick={() => setExpanded((prev) => !prev)}
          sx={{
            ml: 1,
            transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 180ms ease",
          }}
        >
          <ExpandMoreIcon fontSize="small" />
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <IndividualList
          us={props.us}
          label="Autor"
          type="WRITER"
          item={props.item}
        />
        <IndividualList
          us={props.us}
          label="Zeichner"
          type="PENCILER"
          item={props.item}
        />
        <IndividualList
          us={props.us}
          label="Inker"
          type="INKER"
          item={props.item}
        />
        <IndividualList
          us={props.us}
          label="Kolorist"
          type="COLORIST"
          item={props.item}
        />
        <IndividualList
          us={props.us}
          label="Letterer"
          type="LETTERER"
          item={props.item}
        />
        {props.includeTranslator === false ? null : (
          <IndividualList
            us={props.us}
            label="Übersetzer"
            type="TRANSLATOR"
            item={props.item}
            hideIfEmpty={Boolean(props.translatorOptional)}
          />
        )}
        <IndividualList
          us={props.us}
          label="Verleger"
          type="EDITOR"
          item={props.item}
        />
      </Collapse>
    </Box>
  );
}
