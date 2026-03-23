"use client";

import React from "react";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AccordionDetails from "@mui/material/AccordionDetails";
import { expanded } from "./expanded";
import type { ItemLike, QueryParams } from "./expanded";
import type {
  ContainsDetailsSlotComponent,
  ContainsTitleSlotComponent,
} from "../slotTypes";

interface ContainsItemProps {
  idx: number;
  isLast: boolean;
  item: ItemLike;
  query?: QueryParams;
  itemTitle: ContainsTitleSlotComponent;
  itemDetails: ContainsDetailsSlotComponent;
  us?: boolean;
  [key: string]: unknown;
}

export function ContainsItem(props: Readonly<ContainsItemProps>) {
  const ItemTitle = props.itemTitle;
  const ItemDetails = props.itemDetails;
  const isHighlighted = expanded(props.item, props.query);
  let borderRadius: string;
  if (props.idx === 0) {
    if (props.isLast) {
      borderRadius = "8px";
    } else {
      borderRadius = "8px 8px 0 0";
    }
  } else if (props.isLast) {
    borderRadius = "0 0 8px 8px";
  } else {
    borderRadius = "0";
  }

  return (
    <Accordion
      sx={(theme) => ({
        borderRadius,
        width: "auto",
        maxWidth: "100%",
        mb: props.isLast ? 0 : 1,
        border: "1px solid",
        borderColor: isHighlighted
          ? "rgba(124, 130, 139, 0.36)"
          : (theme.vars?.palette.divider ?? theme.palette.divider),
        background: isHighlighted
          ? "linear-gradient(90deg, rgba(185, 191, 201, 0.15) 0%, rgba(255,255,255,1) 36%)"
          : "#ffffff",
        overflow: "hidden",
        boxShadow: isHighlighted
          ? "0 10px 24px -16px rgba(150, 156, 166, 0.42), 0 0 0 1px rgba(168, 174, 184, 0.26) inset"
          : theme.shadows[1],
        transform: isHighlighted ? "translateY(-1px)" : "none",
        transition: "box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease",
        "&:before": { display: "none" },
        "&::after": isHighlighted
          ? {
              content: '""',
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              backgroundColor: "rgba(138, 144, 154, 0.9)",
              zIndex: 2,
              ...theme.applyStyles("dark", {
                backgroundColor: "rgba(202, 208, 217, 0.95)",
              }),
            }
          : undefined,
        "& .MuiAccordionSummary-root": {
          backgroundColor: "#ffffff",
          ...theme.applyStyles("dark", {
            backgroundColor: "#161b22",
          }),
        },
        "& .MuiAccordionDetails-root": {
          backgroundColor: "#ffffff",
          ...theme.applyStyles("dark", {
            backgroundColor: "#161b22",
          }),
        },
        ...theme.applyStyles("dark", {
          borderColor: isHighlighted
            ? "rgba(198, 204, 214, 0.52)"
            : (theme.vars?.palette.divider ?? theme.palette.divider),
          background: isHighlighted
            ? "linear-gradient(90deg, rgba(188, 196, 210, 0.16) 0%, rgba(22,27,34,1) 36%)"
            : "#161b22",
          boxShadow: isHighlighted
            ? "0 10px 28px -18px rgba(180, 188, 202, 0.7), 0 0 0 1px rgba(188, 196, 210, 0.42) inset"
            : theme.shadows[1],
        }),
      })}
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
        <ItemTitle {...props} query={props.query} item={props.item} us={props.us} />
      </AccordionSummary>
      <AccordionDetails>
        <ItemDetails {...props} us={props.us} query={props.query} item={props.item} />
      </AccordionDetails>
    </Accordion>
  );
}
