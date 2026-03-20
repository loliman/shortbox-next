import { issue, issues } from "../../../../graphql/queriesTyped";
import { stripItem, wrapItem } from "../../../../util/util";
import { addToCache, removeFromCache, updateInCache } from "../Editor";
import type { IssueEditorFormValues } from "./types";
import type { ApolloCache } from "@apollo/client";

interface IssueMutationData {
  [key: string]: Record<string, unknown>;
}

interface IssueCacheMutationResult extends Record<string, unknown> {
  title?: unknown;
  number?: unknown;
  format?: unknown;
  variant?: unknown;
  series: {
    publisher?: { us?: boolean };
  } & Record<string, unknown>;
}

export function updateIssueEditorCache(
  cache: ApolloCache<unknown>,
  data: IssueMutationData,
  mutationName: string,
  edit: boolean | undefined,
  defaultValues: IssueEditorFormValues
) {
  const res = structuredClone(data[mutationName]) as IssueCacheMutationResult;
  if (!res.series.publisher) {
    res.series.publisher = {};
  }

  if (edit) {
    const defVariables: { issue: Record<string, unknown> } = { issue: {} };
    const defSeries = stripItem(defaultValues.series) as {
      publisher?: { us?: boolean };
    } & Record<string, unknown>;

    defVariables.issue.series = defSeries;
    if (defSeries.publisher) defSeries.publisher.us = undefined;
    defVariables.issue.number = defaultValues.number;
    if (defaultValues.format !== "") defVariables.issue.format = defaultValues.format;
    if (defaultValues.variant !== "") defVariables.issue.variant = defaultValues.variant;

    res.series.publisher.us = false;

    try {
      updateInCache(
        cache,
        issue,
        defVariables,
        defVariables,
        wrapItem(res as Record<string, unknown>)
      );
    } catch {
      // ignore cache exception
    }

    try {
      const variables = structuredClone(defVariables.issue);
      variables.__typename = "Issue";
      removeFromCache(cache, issues, { series: defVariables.issue.series }, variables);
    } catch {
      // ignore cache exception
    }

    try {
      const variables = structuredClone(defVariables) as Record<string, unknown>;
      variables.edit = true;
      updateInCache(cache, issue, variables, variables, wrapItem(res as Record<string, unknown>));
    } catch {
      // ignore cache exception
    }
  }

  try {
    const item: Record<string, unknown> = {
      title: res.title,
      number: res.number,
      series: res.series,
      format: res.format,
      variant: res.variant,
      __typename: "Issue",
    };

    const itemSeries = item.series as { publisher?: { us?: boolean } };
    if (itemSeries.publisher) itemSeries.publisher.us = undefined;

    addToCache(cache, issues, stripItem(wrapItem(res.series as Record<string, unknown>)), item);
  } catch {
    // ignore cache exception
  }
}
