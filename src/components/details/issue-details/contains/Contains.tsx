"use client";

import React from "react";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { getContainsItemKey } from "../utils/issueDetailsUtils";
import { ContainsSimpleItem } from "./ContainsSimpleItem";
import { ContainsItem } from "./ContainsItem";
import type { ItemLike, QueryParams } from "./expanded";
import type {
  ContainsDetailsSlotComponent,
  ContainsNavigationSlotComponent,
  ContainsTitleSlotComponent,
} from "../slotTypes";

interface ContainsProps {
  header?: string;
  noEntriesHint?: string;
  items?: ItemLike[] | null;
  itemTitle: ContainsTitleSlotComponent;
  itemNavigation?: ContainsNavigationSlotComponent;
  itemDetails?: ContainsDetailsSlotComponent;
  query?: QueryParams;
  us?: boolean;
  [key: string]: unknown;
}

export function Contains(props: Readonly<ContainsProps>) {
  const items = Array.isArray(props.items) ? props.items : [];
  const ItemTitle = props.itemTitle;
  const ItemNavigation = props.itemNavigation;
  const ItemDetails = props.itemDetails;
  const slotProps: Record<string, unknown> = { ...props };
  delete slotProps.header;
  delete slotProps.noEntriesHint;
  delete slotProps.items;
  delete slotProps.itemTitle;
  delete slotProps.itemNavigation;
  delete slotProps.itemDetails;

  return (
    <Box>
      {props.header ? <CardHeader title={props.header} /> : null}

      {items.length === 0 ? (
        <Typography color="text.secondary">{props.noEntriesHint}</Typography>
      ) : (
        items.map((item, idx) => {
          if (!ItemDetails) {
            return (
              <ContainsSimpleItem
                key={getContainsItemKey(item, idx)}
                item={item}
                itemTitle={ItemTitle}
                query={props.query}
                us={props.us}
                {...slotProps}
              />
            );
          }

          return (
            <ContainsItem
              idx={idx}
              key={getContainsItemKey(item, idx)}
              isLast={idx === items.length - 1}
              item={item}
              itemTitle={ItemTitle}
              itemNavigation={ItemNavigation}
              itemDetails={ItemDetails as ContainsDetailsSlotComponent}
              query={props.query}
              us={props.us}
              {...slotProps}
            />
          );
        })
      )}
    </Box>
  );
}
