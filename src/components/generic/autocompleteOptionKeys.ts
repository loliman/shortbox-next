type OptionValue = Record<string, unknown>;

export function getPublisherOptionKey(option: OptionValue | string) {
  if (typeof option === "string") return option;
  return `${String(option.name || "")}::${String(option.us ?? "")}`;
}

export function getSeriesOptionKey(option: OptionValue | string) {
  if (typeof option === "string") return option;

  const publisher = (option.publisher || {}) as { name?: unknown; us?: unknown };
  return [
    String(option.title || ""),
    String(option.volume || ""),
    String(option.startyear || ""),
    String(publisher.name || ""),
    String(publisher.us ?? ""),
  ].join("::");
}
