import React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { AppearanceList } from "../../IssueDetails";

type StoryAppearanceSectionProps = {
  item: Record<string, unknown>;
  us?: boolean;
};

export function StoryAppearanceSection(props: Readonly<StoryAppearanceSectionProps>) {
  const source = props.item as { parent?: { appearances?: unknown[] }; appearances?: unknown[] };
  const appearances = source.parent ? source.parent.appearances : source.appearances;
  if (!appearances || appearances.length === 0) return null;
  const [expanded, setExpanded] = React.useState(false);

  return (
    <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "divider" }}>
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
          Auftritte
        </Typography>
        <IconButton
          size="small"
          aria-label={expanded ? "Auftritte einklappen" : "Auftritte ausklappen"}
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
        <AppearanceList
          us={props.us}
          label="Hauptcharaktere"
          appRole="FEATURED"
          type="CHARACTER"
          item={props.item}
          hideIfEmpty={true}
        />
        <AppearanceList
          us={props.us}
          label="Antagonisten"
          appRole="ANTAGONIST"
          type="CHARACTER"
          item={props.item}
          hideIfEmpty={true}
        />
        <AppearanceList
          us={props.us}
          label="Teams"
          type="GROUP"
          item={props.item}
          hideIfEmpty={true}
        />
        <AppearanceList
          us={props.us}
          label="Rassen"
          type="RACE"
          item={props.item}
          hideIfEmpty={true}
        />
        <AppearanceList
          us={props.us}
          label="Tiere"
          type="ANIMAL"
          item={props.item}
          hideIfEmpty={true}
        />
        <AppearanceList
          us={props.us}
          label="Gegenstände"
          type="ITEM"
          item={props.item}
          hideIfEmpty={true}
        />
        <AppearanceList
          us={props.us}
          label="Fahrzeuge"
          type="VEHICLE"
          item={props.item}
          hideIfEmpty={true}
        />
        <AppearanceList
          us={props.us}
          label="Orte"
          type="LOCATION"
          item={props.item}
          hideIfEmpty={true}
        />
      </Collapse>
    </Box>
  );
}
