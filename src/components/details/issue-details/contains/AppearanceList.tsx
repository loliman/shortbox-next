"use client";

import React from "react";
import { ChipList } from "./ChipList";

type AppearanceListProps = {
  us?: boolean;
  label?: string;
  hideIfEmpty?: boolean;
  type?: string;
  appRole?: string;
  item: { parent?: { appearances?: unknown[] | null } | null; appearances?: unknown[] | null };
};

export function AppearanceList(props: Readonly<AppearanceListProps>) {
  const appearances = props.item.parent ? props.item.parent.appearances : props.item.appearances;

  return (
    <ChipList
      us={props.us}
      label={props.label}
      hideIfEmpty={props.hideIfEmpty}
      type={props.type}
      appRole={props.appRole}
      items={Array.isArray(appearances) ? appearances : []}
    />
  );
}
