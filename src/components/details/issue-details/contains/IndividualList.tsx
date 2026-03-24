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
  const issueIndividuals = Array.isArray(props.item.individuals) ? props.item.individuals : [];
  const parentIndividuals = Array.isArray(props.item.parent?.individuals)
    ? props.item.parent.individuals
    : [];

  // Prefer issue-level individuals for deterministic SSR/CSR output.
  const individuals =
    props.type === "TRANSLATOR"
      ? issueIndividuals
      : issueIndividuals.length > 0
        ? issueIndividuals
        : parentIndividuals;

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
