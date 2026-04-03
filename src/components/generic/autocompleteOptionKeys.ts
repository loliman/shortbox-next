type OptionValue = Record<string, unknown>;
const toOptionKeyPart = (value: unknown) => String(value ?? "");

export function getPublisherOptionKey(option: OptionValue | string) {
  if (typeof option === "string") return option;
  return `${toOptionKeyPart(option.name)}::${toOptionKeyPart(option.us)}`;
}

export function getSeriesOptionKey(option: OptionValue | string) {
  if (typeof option === "string") return option;

  const publisher = (option.publisher || {}) as { name?: unknown; us?: unknown };
  return [
    toOptionKeyPart(option.title),
    toOptionKeyPart(option.volume),
    toOptionKeyPart(option.startyear),
    toOptionKeyPart(publisher.name),
    toOptionKeyPart(publisher.us),
  ].join("::");
}
