"use client";

import React from "react";
import dateFormat from "dateformat";
import { DetailsRow } from "../DetailsRow";
import { toChipList } from "../contains/toChipList";
import { toShortboxDate } from "../utils/issueMetaFormatters";

interface IssueDetailsUSDetailsProps {
  issue?: {
    releasedate?: string;
    legacy_number?: string | null;
    cover?: {
      individuals?: Array<{ type?: string } & Record<string, unknown>>;
    } | null;
    individuals?: Array<{ type?: string } & Record<string, unknown>>;
  };
  [key: string]: unknown;
}

export function IssueDetailsUSDetails(props: Readonly<IssueDetailsUSDetailsProps>) {
  const issue = props.issue || {};
  const us = Boolean(props.us);
  const releaseDate = issue.releasedate
    ? toShortboxDate(dateFormat(new Date(issue.releasedate), "dd.mm.yyyy"))
    : "";
  const coverArtists = (issue.cover?.individuals || []).filter((item) =>
    (item.type || "").includes("ARTIST")
  );
  const editors = (issue.individuals || []).filter((item) => (item.type || "").includes("EDITOR"));

  return (
    <React.Fragment>
      <DetailsRow key="releasedate" label="Erscheinungsdatum" value={releaseDate} />
      <DetailsRow
        key="coverartists"
        label="Cover Artists"
        value={toChipList(coverArtists, { us }, "ARTIST")}
      />
      <DetailsRow key="editor" label="Editor" value={toChipList(editors, { us }, "EDITOR")} />
    </React.Fragment>
  );
}
