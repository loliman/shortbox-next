import type { IssueEditorFormValues } from "./types";

export const formats = [
  "Heft",
  "Mini Heft",
  "Magazin",
  "Prestige",
  "Softcover",
  "Hardcover",
  "Taschenbuch",
  "Album",
  "Album Hardcover",
];

export const currencies = ["EUR", "DEM"];

export function createEmptyIssueValues(): IssueEditorFormValues {
  return {
    title: "",
    series: {
      title: "",
      volume: 0,
      publisher: {
        name: "",
        us: false,
      },
    },
    number: "",
    variant: "",
    cover: "",
    format: formats[0],
    limitation: "",
    pages: 0,
    releasedate: "1900-01-01",
    price: "0",
    currency: currencies[0],
    individuals: [],
    addinfo: "",
    comicguideid: 0,
    isbn: "",
    arcs: [],
    stories: [],
    copyBatch: {
      enabled: false,
      count: 1,
      prefix: "",
    },
  };
}
