import React from "react";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { getContainsItemKey } from "../utils/issueDetailsUtils";
import { ContainsSimpleItem } from "./ContainsSimpleItem";
import { ContainsItem } from "./ContainsItem";
import type { ItemLike, QueryParams } from "./expanded";

interface ContainsProps {
  header?: string;
  noEntriesHint?: string;
  items?: ItemLike[] | null;
  itemTitle: React.ReactElement;
  itemDetails?: React.ReactElement;
  query?: QueryParams;
  us?: boolean;
  [key: string]: unknown;
}

export function Contains(props: Readonly<ContainsProps>) {
  const items = Array.isArray(props.items) ? props.items : [];

  return (
    <Box>
      {props.header ? <CardHeader title={props.header} /> : null}

      {items.length === 0 ? (
        <Typography color="text.secondary">{props.noEntriesHint}</Typography>
      ) : (
        items.map((item, idx) => {
          if (!props.itemDetails) {
            return (
              <ContainsSimpleItem
                key={getContainsItemKey(item, idx)}
                item={item}
                itemTitle={props.itemTitle}
                query={props.query}
                us={props.us}
              />
            );
          }

          return (
            <ContainsItem
              idx={idx}
              key={getContainsItemKey(item, idx)}
              isLast={idx === items.length - 1}
              item={item}
              itemTitle={props.itemTitle}
              itemDetails={props.itemDetails}
              query={props.query}
              us={props.us}
            />
          );
        })
      )}
    </Box>
  );
}
