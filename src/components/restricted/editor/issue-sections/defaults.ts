import type { FieldItem } from "./types";

function createClientItemId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `story-${Date.now()}-${createPseudoRandomToken()}`;
}

function createPseudoRandomToken() {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const values = crypto.getRandomValues(new Uint32Array(2));
    return Array.from(values, (value) => value.toString(36)).join("");
  }

  return `${Date.now().toString(36)}-fallback`;
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
