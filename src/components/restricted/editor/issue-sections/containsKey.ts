import type { FieldItem } from "./types";

function keyValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

export function getContainsKey(type: string, item: FieldItem, index: number) {
  const stableId = keyValue(item.id || item._id || item.uuid);
  if (stableId) return `${type}|${stableId}`;

  return `${type}|${String(index)}`;
}
