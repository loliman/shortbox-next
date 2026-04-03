"use client";

import React from "react";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { expanded, hasExpandNumberMatch } from "./expanded";
import type { ItemLike, QueryParams } from "./expanded";
import type {
  ContainsDetailsSlotComponent,
  ContainsNavigationSlotComponent,
  ContainsTitleSlotComponent,
} from "../slotTypes";

interface ContainsItemProps {
  idx: number;
  isLast: boolean;
  item: ItemLike;
  query?: QueryParams;
  itemTitle: ContainsTitleSlotComponent;
  itemNavigation?: ContainsNavigationSlotComponent;
  itemDetails: ContainsDetailsSlotComponent;
  us?: boolean;
  [key: string]: unknown;
}

export function ContainsItem(props: Readonly<ContainsItemProps>) {
  const ItemTitle = props.itemTitle;
  const ItemNavigation = props.itemNavigation;
  const ItemDetails = props.itemDetails;
  const isHighlighted = expanded(props.item, props.query);
  const shouldExpandFromQuery = hasExpandNumberMatch(props.item, props.query);
  const [isExpanded, setIsExpanded] = React.useState<boolean>(shouldExpandFromQuery);
  const contentId = React.useId();

  React.useEffect(() => {
    setIsExpanded(shouldExpandFromQuery);
  }, [shouldExpandFromQuery]);

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
    <Paper
      elevation={1}
      sx={(theme) => ({
        position: "relative",
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
      <Box
        sx={(theme) => ({
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto auto",
          alignItems: "start",
          gap: 1,
          px: 2,
          py: 1.25,
          backgroundColor: "#ffffff",
          position: "relative",
          zIndex: 1,
          ...theme.applyStyles("dark", {
            backgroundColor: "#161b22",
          }),
          "@media (max-width:599.95px)": {
            px: 1.5,
            py: 1,
          },
        })}
      >
        <ButtonBase
          onClick={() => {
            setIsExpanded((prev) => !prev);
          }}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            textAlign: "left",
            borderRadius: 1,
            minHeight: 0,
            minWidth: 0,
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <ItemTitle
              {...props}
              query={props.query}
              item={props.item}
              us={props.us}
              allowInteractiveActions={false}
            />
          </Box>
        </ButtonBase>
        {ItemNavigation ? (
          <Box sx={{ display: "flex", alignItems: "center", minHeight: "100%" }}>
            <ItemNavigation {...props} query={props.query} item={props.item} us={props.us} />
          </Box>
        ) : null}
        <ButtonBase
          onClick={() => {
            setIsExpanded((prev) => !prev);
          }}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          aria-label={isExpanded ? "Details einklappen" : "Details ausklappen"}
          sx={{
            width: 40,
            height: 40,
            borderRadius: "999px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "text.secondary",
            flexShrink: 0,
            alignSelf: "center",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 180ms ease",
            }}
          >
            <ExpandMoreIcon />
          </Box>
        </ButtonBase>
      </Box>
      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <Box
          id={contentId}
          role="region"
          sx={(theme) => ({
            px: 2,
            pb: 2,
            backgroundColor: "#ffffff",
            ...theme.applyStyles("dark", {
              backgroundColor: "#161b22",
            }),
            "@media (max-width:599.95px)": {
              px: 1.5,
              pb: 1.5,
            },
          })}
        >
          <ItemDetails {...props} us={props.us} query={props.query} item={props.item} />
        </Box>
      </Collapse>
    </Paper>
  );
}
