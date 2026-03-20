import type { ChangePayload, FieldItem } from "./types";

function normalizeTypeList(typeValue: string | string[] | undefined): string[] {
  if (Array.isArray(typeValue)) return typeValue.filter(Boolean);
  if (!typeValue) return [];
  return [typeValue];
}

function normalizeRoleList(roleValue: string | string[] | undefined): string[] {
  if (Array.isArray(roleValue)) return roleValue.filter(Boolean);
  if (!roleValue) return [];
  return [roleValue];
}

function isAppearanceField(name?: string) {
  return (name || "").indexOf("appearances") > -1;
}

function cloneValues(values: FieldItem[] | undefined) {
  return structuredClone(values || []) as FieldItem[];
}

function stripPlaceholderEntries(entries: FieldItem[], appearanceMode: boolean) {
  return entries.filter((entry) => {
    if (entry.pattern) return false;

    if (appearanceMode) {
      return typeof entry.type === "string" ? entry.type.trim().length > 0 : false;
    }

    return normalizeTypeList(entry.type).length > 0;
  });
}

function mergeIndividualType(entry: FieldItem, payload: ChangePayload) {
  if (!payload.type) return;

  const existingTypes = normalizeTypeList(entry.type);
  const existingRoles = normalizeRoleList(entry.role);

  if (!existingTypes.includes(payload.type)) {
    existingTypes.push(payload.type);
    if (payload.role) existingRoles.push(payload.role);
    else if (existingRoles.length > 0) existingRoles.push(payload.type);
  }

  entry.type = existingTypes;
  if (existingRoles.length > 0) entry.role = existingRoles;
}

function removeIndividualType(entry: FieldItem, payloadType?: string) {
  if (!payloadType) return;

  const existingTypes = normalizeTypeList(entry.type);
  const existingRoles = normalizeRoleList(entry.role);
  const nextTypes: string[] = [];
  const nextRoles: string[] = [];

  existingTypes.forEach((typeValue, index) => {
    if (typeValue === payloadType) return;

    nextTypes.push(typeValue);
    if (existingRoles[index]) nextRoles.push(existingRoles[index]);
  });

  entry.type = nextTypes;
  if (existingRoles.length > 0) entry.role = nextRoles;
}

function upsertSelectedEntry(
  selected: FieldItem[],
  payload: ChangePayload,
  appearanceMode: boolean
) {
  const optionName = (payload.option?.name || "").trim();
  if (!optionName) return;

  if (appearanceMode) {
    const type = payload.type || "";
    if (!type) return;

    const previous = selected.find((entry) => entry.name === optionName && entry.type === type);
    if (previous) {
      previous.role = payload.role || type;
      return;
    }

    const value = structuredClone(payload.option || {}) as FieldItem;
    value.name = optionName;
    value.type = type;
    value.role = payload.role || type;
    selected.push(value);
    return;
  }

  const previous = selected.find((entry) => entry.name === optionName);
  if (previous) {
    mergeIndividualType(previous, payload);
    return;
  }

  if (!payload.type) return;

  const value = structuredClone(payload.option || {}) as FieldItem;
  value.name = optionName;
  value.type = [payload.type];
  if (payload.role) value.role = [payload.role];
  selected.push(value);
}

export function updateField(
  option: string | ChangePayload | null | undefined,
  live: boolean,
  values: FieldItem[] | undefined,
  setFieldValue: (field: string, value: unknown) => void,
  field: string,
  pattern: string
) {
  if (typeof option !== "string" || option.trim() !== "") {
    if (live) {
      const nextValues = cloneValues(values);

      if (nextValues.length === 0 || !nextValues[nextValues.length - 1].pattern) {
        const dummy: FieldItem = { pattern: true };
        dummy[pattern] = option;
        nextValues.push(dummy);
      } else {
        const updated = { ...nextValues[nextValues.length - 1] };
        updated[pattern] = option;
        nextValues[nextValues.length - 1] = updated;
      }

      setFieldValue(field, nextValues);
      return;
    }

    let selected = cloneValues(values);
    const payload = option as ChangePayload;
    const appearanceMode = isAppearanceField(payload.name);

    switch (payload.action) {
      case "deselect-option":
      case "select-option":
      case "create-option":
        upsertSelectedEntry(selected, payload, appearanceMode);
        break;

      case "remove-value":
        if (appearanceMode) {
          selected = selected.filter(
            (entry) =>
              `${entry.name}${entry.type}` !== `${payload.removedValue?.name}${payload.type}`
          );
        } else {
          const previous = selected.find((entry) => entry.name === payload.removedValue?.name);
          if (previous) removeIndividualType(previous, payload.type);
        }
        break;

      case "clear":
        if (appearanceMode) {
          selected = selected.filter((entry) => entry.type !== payload.type);
        } else {
          selected.forEach((entry) => removeIndividualType(entry, payload.type));
        }
        break;

      default:
        return;
    }

    setFieldValue(field, stripPlaceholderEntries(selected, appearanceMode));
  }
}

export function getPattern(arr: FieldItem[] | null | undefined, pattern: string) {
  if (!arr || arr.length === 0 || !arr[arr.length - 1].pattern) return null;
  return arr[arr.length - 1][pattern];
}
