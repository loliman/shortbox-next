"use client";

import React from "react";
import { ChipList } from "./ChipList";

type IndividualListProps = {
  us?: boolean;
  label?: string;
  hideIfEmpty?: boolean;
  type?: string;
  role?: string;
  item: { parent?: { individuals?: unknown[] | null } | null; individuals?: unknown[] | null };
};

export function IndividualList(props: Readonly<IndividualListProps>) {
  const individuals =
    props.item.parent && props.type !== "TRANSLATOR"
      ? props.item.parent.individuals
      : props.item.individuals;

  return (
    <ChipList
      us={props.us}
      label={props.label}
      hideIfEmpty={props.hideIfEmpty}
      type={props.type}
      appRole={props.role}
      items={Array.isArray(individuals) ? individuals : []}
      individual={true}
    />
  );
}
