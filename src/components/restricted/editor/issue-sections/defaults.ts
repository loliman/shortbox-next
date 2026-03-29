import type { FieldItem } from "./types";

function createClientItemId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `story-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const storyDefault: FieldItem = {
  parent: {
    issue: {
      series: {
        title: "",
        volume: 1,
        publisher: {
          name: "",
        },
      },
      number: 0,
    },
    number: 0,
  },
  individuals: [],
  addinfo: "",
  part: "",
  exclusive: false,
};

export function cloneFieldItem<T>(item: T): T {
  return structuredClone(item);
}

export function ensureFieldItemClientId<T extends FieldItem>(item: T): T {
  if (item.id || item._id || item.uuid) return item;

  return {
    ...item,
    uuid: createClientItemId(),
  };
}
