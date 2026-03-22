import React from "react";
import dateFormat from "dateformat";
import { DetailsRow, toIsbn10, toIsbn13, toShortboxDate } from "../shared";

interface IssueDetailsDEDetailsProps {
  issue?: {
    format?: string;
    limitation?: string | number;
    legacy_number?: string | null;
    pages?: number;
    releasedate?: string;
    price?: number | string;
    currency?: string;
    isbn?: string;
  };
}

export function IssueDetailsDEDetails(props: Readonly<IssueDetailsDEDetailsProps>) {
  const issue = props.issue || {};
  const priceValue = Number(issue.price);
  const limitation = formatLimitation(issue.limitation);
  const releaseDate = issue.releasedate
    ? toShortboxDate(dateFormat(new Date(issue.releasedate), "dd.mm.yyyy"))
    : "";

  return (
    <React.Fragment>
      <DetailsRow key="format" label="Format" value={issue.format} />
      {limitation ? <DetailsRow key="limitation" label="Limitierung" value={limitation} /> : null}

      {issue.pages && issue.pages > 0 ? (
        <DetailsRow key="pages" label="Seiten" value={issue.pages} />
      ) : null}

      <DetailsRow key="releasedate" label="Erscheinungsdatum" value={releaseDate} />

      {!Number.isNaN(priceValue) && priceValue > 0 ? (
        <DetailsRow key="price" label="Preis" value={String(issue.price) + " " + issue.currency} />
      ) : null}

      {issue.isbn && issue.isbn !== "" ? (
        <React.Fragment>
          <DetailsRow key="isbn10" label="ISBN-10" value={toIsbn10(issue.isbn)} />
          <DetailsRow key="isbn13" label="ISBN-13" value={toIsbn13(issue.isbn)} />
        </React.Fragment>
      ) : null}
    </React.Fragment>
  );
}

function formatLimitation(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";

  const raw = String(value).trim();
  if (!raw) return "";

  const parsed = Number(raw);
  if (!Number.isNaN(parsed)) {
    if (parsed <= 0) return "";
    return `${parsed} Exemplare`;
  }

  return raw;
}
