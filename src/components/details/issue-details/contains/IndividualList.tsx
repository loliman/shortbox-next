"use client";

import React from "react";
import { ChipList } from "./ChipList";

type IndividualListProps = {
  us?: boolean;
  label?: string;
  hideIfEmpty?: boolean;
  type?: string;
  role?: string;
  item: {
    parent?: { individuals?: unknown[] | null; issue?: { individuals?: unknown[] | null } | null } | null;
    issue?: { individuals?: unknown[] | null } | null;
    individuals?: unknown[] | null;
  };
};

export function resolveIndividualListItems(
  item: IndividualListProps["item"],
  type?: string
): unknown[] {
  const storyIndividuals = Array.isArray(item.individuals) ? item.individuals : [];
  const parentStoryIndividuals = Array.isArray(item.parent?.individuals)
    ? item.parent.individuals
    : [];
  const currentIssueIndividuals = Array.isArray(item.issue?.individuals) ? item.issue.individuals : [];

  if (type === "TRANSLATOR") return storyIndividuals;

  // Use the first source that actually contains the requested role.
  if (hasIndividualsOfType(parentStoryIndividuals, type)) return parentStoryIndividuals;
  if (hasIndividualsOfType(storyIndividuals, type)) return storyIndividuals;
  if (hasIndividualsOfType(currentIssueIndividuals, type)) return currentIssueIndividuals;

  if (parentStoryIndividuals.length > 0) return parentStoryIndividuals;
  if (storyIndividuals.length > 0) return storyIndividuals;
  return currentIssueIndividuals;
}

function hasIndividualsOfType(items: unknown[], type?: string): boolean {
  if (!type) return items.length > 0;

  return items.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const candidateType = (entry as { type?: unknown }).type;
    return typeof candidateType === "string" && candidateType.toUpperCase() === type.toUpperCase();
  });
}

export function IndividualList(props: Readonly<IndividualListProps>) {
  const individuals = resolveIndividualListItems(props.item, props.type);

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
