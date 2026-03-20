import React from "react";
import dateFormat from "dateformat";
import { DetailsRow, toChipList, toShortboxDate } from "../../IssueDetails";

interface IssueDetailsUSDetailsProps {
  issue?: {
    releasedate?: string;
    legacy_number?: string | null;
    cover?: {
      individuals?: Array<{ type?: string } & Record<string, unknown>>;
    } | null;
    individuals?: Array<{ type?: string } & Record<string, unknown>>;
  };
  [key: string]: any;
}

export function IssueDetailsUSDetails(props: Readonly<IssueDetailsUSDetailsProps>) {
  const issue = props.issue || {};
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
        value={toChipList(coverArtists, props as any, "ARTIST")}
      />
      <DetailsRow key="editor" label="Editor" value={toChipList(editors, props as any, "EDITOR")} />
    </React.Fragment>
  );
}
