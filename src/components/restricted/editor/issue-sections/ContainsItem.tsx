import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import RemoveContainsButton from "./RemoveContainsButton";
import type { ContainsProps, FieldItem } from "./types";
import {generateLabel} from "../../../../util/hierarchy";
import {IssueReferenceInline} from "../../../generic/IssueNumberInline";

interface ContainsItemProps extends ContainsProps {
  item: FieldItem;
  index: number;
  fields: React.ReactElement;
  type: "stories";
  expanded?: boolean;
}

class ContainsItem extends React.Component<ContainsItemProps> {
  shouldComponentUpdate(nextProps: ContainsItemProps) {
    return (
      this.props.item !== nextProps.item ||
      (this.props.items || []).length !== (nextProps.items || []).length ||
      this.props.index !== nextProps.index ||
      this.props.expanded !== nextProps.expanded ||
      this.props.dragOverStoryIndex !== nextProps.dragOverStoryIndex ||
      this.props.draggedStoryIndex !== nextProps.draggedStoryIndex
    );
  }

  render() {
    const childCount = Array.isArray(this.props.item.children)
      ? this.props.item.children.length
      : 0;
    const isDisabled = childCount > 0;
    const isExpanded = Boolean(this.props.expanded);
    const isDragOver = this.props.dragOverStoryIndex === this.props.index;
    const isDragging = this.props.draggedStoryIndex === this.props.index;

      const parent = (this.props.item.parent || {}) as { title? : string;
          issue?: { number?: string | number; legacy_number?: string ; series?: { title?: string }};
      };

    const itemTitle = normalizeDisplayStoryTitle(this.props.item.title);
    const parentTitle =
        !itemTitle && parent.title ? normalizeDisplayStoryTitle(parent.title) : undefined;
    const storyTitle = itemTitle || parentTitle || "";
    const storyTitleLabel = storyTitle !== "" ? storyTitle : "Story";

    const addinfoText = buildAddinfoText(this.props.item);

    const itemCount = Array.isArray(this.props.items) ? this.props.items.length : 0;
    const isFirst = this.props.index === 0;
    const isLast = this.props.index === itemCount - 1;
    const borderRadius = isFirst ? (isLast ? "8px" : "8px 8px 0 0") : isLast ? "0 0 8px 8px" : "0";

    return (
      <Accordion
        disableGutters
        expanded={isExpanded}
        data-story-card="true"
        data-story-index={this.props.index}
        onChange={() => this.props.onStoryToggle?.(this.props.index)}
        sx={{
            borderRadius,
            width: "auto",
            maxWidth: "100%",
            mb: isLast ? 0 : 1,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: (theme) =>
                theme.palette.mode === "dark" ? "#161b22" : "#ffffff",
            overflow: "hidden",
            boxShadow: (theme) => theme.shadows[1],
            transition: "box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease",
            "&:before": { display: "none" },
            "& .MuiAccordionSummary-root": {
                backgroundColor: (theme) =>
                    theme.palette.mode === "dark" ? "#161b22" : "#ffffff",
            },
            "& .MuiAccordionDetails-root": {
                backgroundColor: (theme) =>
                    theme.palette.mode === "dark" ? "#161b22" : "#ffffff",
            },
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          this.props.onStoryDragOver?.(this.props.index);
        }}
        onDrop={(event) => {
          event.preventDefault();
          const raw = event.dataTransfer.getData("text/plain");
          const fromIndex = Number(raw);
          if (Number.isInteger(fromIndex)) {
            this.props.onStoryReorder?.(fromIndex, this.props.index);
          }
          this.props.onStoryDragEnd?.();
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
              py: 1.25,
              minHeight: 0,
              "&.Mui-expanded": {
                  minHeight: 0,
              },
              "& .MuiAccordionSummary-content": {
                  width: "100%",
                  margin: 0,
                  "&.Mui-expanded": {
                      margin: 0,
                  },
              },
              "& .MuiAccordionSummary-expandIconWrapper": {
                  margin: 0,
                  alignSelf: "center",
              },
          }}
        >
          <Box sx={{ width: "100%", pr: 0.5 }}>
            <Box
              sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}
            >
              <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, flexGrow: 1 }}>
                <IconButton
                  size="small"
                  title="Reihenfolge ändern"
                  draggable
                  onClick={(event) => event.stopPropagation()}
                  onDragStart={(event) => {
                    event.stopPropagation();
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(this.props.index));
                    this.props.onStoryDragStart?.(this.props.index);
                  }}
                  onDragEnd={() => {
                    this.props.onStoryDragEnd?.();
                  }}
                  sx={{ mr: 0.25, cursor: "grab" }}
                >
                  <DragIndicatorIcon fontSize="small" />
                </IconButton>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                      variant="overline"
                      sx={{
                          fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
                          fontWeight: 500,
                          fontSize: "0.7rem",
                          lineHeight: 1.5,
                          textTransform: "uppercase",
                          letterSpacing: "0.16em",
                          color: "text.secondary",
                          opacity: 0.9,
                      }}
                  >
                      {storyTitleLabel}
                  </Typography>

                    <Typography
                        variant="subtitle1"
                        sx={{
                            fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
                            fontSize: "1rem",
                            lineHeight: 1.75,
                            fontWeight: 700,
                            color: "text.secondary",
                            letterSpacing: "0.01em",
                            opacity: 0.9,
                        }}
                    >
                        <IssueReferenceInline
                            seriesLabel={generateLabel({ series: parent.issue?.series as any } as any)}
                            number={ parent.issue?.number}
                            legacy_number={parent.issue?.legacy_number}
                        />

                        <Typography
                            sx={{
                                fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
                                fontSize: "0.8rem",
                                lineHeight: 1.75,
                                fontWeight: 500,
                                color: "text.secondary",
                                letterSpacing: "0.01em",
                                opacity: 0.9,
                            }}
                        >
                            {addinfoText === "" ? null : addinfoText}
                        </Typography>
                    </Typography>
                  
                </Box>
              </Box>
              <Box onClick={(event) => event.stopPropagation()}>
                <RemoveContainsButton {...this.props} disabled={isDisabled} />
              </Box>
            </Box>
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ pr: 2, pb: 2, pt: 1.25, pl: 6 }}>
          <Box>
            {React.cloneElement(this.props.fields, {
              ...this.props,
              disabled: isDisabled,
            })}
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  }
}

function normalizeDisplayStoryTitle(value: string | null | undefined): string {
    const normalized = String(value || "").trim();
    return normalized === "Untitled" ? "" : normalized;
}

function buildAddinfoText(item: any): string {
    let addinfoText = "";
    if (item.part && item.part.indexOf("/x") === -1) {
        addinfoText += "Teil " + item.part.replace("/", " von ");
    }
    if (addinfoText !== "" && item.addinfo) {
        addinfoText += ", ";
    }
    if (item.addinfo) {
        addinfoText += item.addinfo;
    }
    return addinfoText;
}

export default ContainsItem;
