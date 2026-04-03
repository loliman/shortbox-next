export interface ChangePayload {
  action?: string;
  option?: FieldItem;
  removedValue?: FieldItem;
  type?: string;
  role?: string;
  name?: string;
}

export interface FieldItem {
  __typename?: string;
  pattern?: boolean;
  name?: string;
  title?: string;
  volume?: string | number;
  us?: boolean;
  publisher?: { name?: string; us?: boolean; [key: string]: unknown };
  type?: string[] | string;
  role?: string[] | string;
  [key: string]: unknown;
}

export type UpdateFieldOption = string | ChangePayload | null | undefined | FieldItem[];

export function updateField(
  option: UpdateFieldOption,
  live: boolean,
  values: FieldItem[] | undefined,
  setFieldValue: (field: string, value: unknown) => void,
  field: string,
  pattern: string
) {
  if (Array.isArray(option)) {
    setFieldValue(
      field,
      option.filter((entry) => Boolean(entry) && !entry.pattern)
    );
    return;
  }

  if (typeof option !== "string" || option.trim() !== "") {
    if (live) {
      const sourceValues = values || [];
      const nextValues = sourceValues.map((entry) => ({ ...entry }));
      const lastValue = nextValues.at(-1);

      if (lastValue?.pattern) {
        nextValues[nextValues.length - 1] = {
          ...lastValue,
          [pattern]: option,
        };
      } else {
        const dummy: FieldItem = { pattern: true };
        dummy[pattern] = option;
        nextValues.push(dummy);
      }

      setFieldValue(field, nextValues);
      return;
    }

    let selected = (values || []).map((entry) => ({ ...entry }));
    let previous: FieldItem[] | undefined;
    const payload = option as ChangePayload;

    switch (payload.action) {
      case "deselect-option":
      case "select-option":
        previous = selected.filter((v: FieldItem) => v.name === payload.option?.name);

        if (previous.length > 0) {
          if (payload.option?.__typename === "Appearance") {
            previous[0].type = payload.type;
            previous[0].role = payload.role;
          } else if (
            Array.isArray(previous[0].type) &&
            previous[0].type.filter((v: string) => v === payload.type).length === 0
          ) {
            previous[0].type.push(payload.type || "");
            if (Array.isArray(previous[0].role)) previous[0].role.push(payload.role || "");
          }
        } else {
          const value = structuredClone(payload.option || {}) as FieldItem;

          if (payload.option?.__typename === "Appearance") {
            value.type = payload.type;
            value.role = payload.role;
          } else {
            value.type = payload.type ? [payload.type] : [];
            value.role = payload.role ? [payload.role] : [];
          }

          selected.push(value);
        }
        break;

      case "remove-value":
        if ((payload.name || "").indexOf("appearances") > 0) {
          selected = selected.filter(
            (v: FieldItem) =>
              `${v.name}${v.type}` !== `${payload.removedValue?.name}${payload.type}`
          );
        } else {
          previous = selected.filter((v: FieldItem) => v.name === payload.removedValue?.name);
          if (previous.length > 0 && Array.isArray(previous[0].type)) {
            previous[0].type = previous[0].type.filter((v: string) => v !== payload.type);
          }
        }
        break;

      case "clear":
        if ((payload.name || "").indexOf("appearances") > 0) {
          selected = selected.filter((v: FieldItem) => v.type !== payload.type);
        } else {
          selected.forEach((entry: FieldItem) => {
            if (Array.isArray(entry.type)) {
              entry.type = entry.type.filter((v: string) => v !== payload.type);
            }
          });
        }
        break;

      case "create-option":
        selected.push({
          name: payload.option?.name || values?.at(-1)?.name || "",
          type: payload.type ? [payload.type] : [],
          role: payload.role ? [payload.role] : [],
        });
        break;

      default:
        return;
    }

    selected = selected.filter(
      (entry: FieldItem) => !entry.pattern && Array.isArray(entry.type) && entry.type.length > 0
    );
    setFieldValue(field, selected);
  }
}

export function getPattern(arr: FieldItem[] | null | undefined, pattern: string) {
  const lastEntry = arr?.at(-1);
  if (!lastEntry?.pattern) return null;
  return lastEntry[pattern];
}
