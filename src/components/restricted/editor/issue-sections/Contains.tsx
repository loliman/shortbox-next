import React from "react";
import Box from "@mui/material/Box";
import ContainsItem from "./ContainsItem";
import { getContainsKey } from "./containsKey";
import type { ContainsProps } from "./types";

interface ContainsListProps extends ContainsProps {
  type: "stories";
  fields: React.ReactElement;
}

function Contains(props: Readonly<ContainsListProps>) {
  if (!props.items || props.items.length === 0)
    return null;

  return (
    <Box>
      {props.items.map((item, index) => (
        <ContainsItem
          key={getContainsKey(props.type, item, index)}
          {...props}
          item={item}
          index={index}
          expanded={props.expandedStoryIndex === index}
        />
      ))}
    </Box>
  );
}

export default Contains;
