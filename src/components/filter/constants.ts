export const FORMAT_OPTIONS = [
  { name: "Heft" },
  { name: "Mini Heft" },
  { name: "Magazin" },
  { name: "Prestige" },
  { name: "Softcover" },
  { name: "Hardcover" },
  { name: "Taschenbuch" },
  { name: "Album" },
  { name: "Album Hardcover" },
];

export const COMPARE_OPTIONS = [">", "<", "=", ">=", "<="];

export const CONTRIBUTOR_FIELDS = [
  { type: "WRITER", label: "Autor" },
  { type: "PENCILER", label: "Zeichner" },
  { type: "INKER", label: "Inker" },
  { type: "COLORIST", label: "Kolorist" },
  { type: "LETTERER", label: "Letterer" },
  { type: "EDITOR", label: "Editor" },
] as const;

export const TRANSLATOR_FIELD = { type: "TRANSLATOR", label: "Übersetzer" } as const;

export const FILTER_MULTI_VALUE_SEPARATOR = " || ";
