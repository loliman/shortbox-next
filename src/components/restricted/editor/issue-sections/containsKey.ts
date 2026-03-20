import type { FieldItem } from "./types";

function keyValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function getContainsKey(type: string, item: FieldItem, index: number) {
  const stableId = keyValue(item.id || item._id || item.uuid);
  if (stableId) return `${type}|${stableId}`;

  return `${type}|${String(index)}`;
}
