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
  return (name || "").includes("appearances");
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

function applyLiveFieldUpdate(
  option: string | ChangePayload | null | undefined,
  values: FieldItem[] | undefined,
  pattern: string,
  scope?: string
) {
  const nextValues = cloneValues(values).filter((entry) => {
    if (!entry.pattern) return true;
    return scope ? !matchesPatternScope(entry, scope) : false;
  });

  const liveValue = typeof option === "string" ? option : "";
  if (liveValue.trim() === "") return nextValues;

  const dummy: FieldItem = { pattern: true };
  dummy[pattern] = liveValue;
  if (scope) {
    dummy.type = scope;
    dummy.role = scope;
  }
  nextValues.push(dummy);
  return nextValues;
}

function applySelectionAction(
  selected: FieldItem[],
  payload: ChangePayload,
  appearanceMode: boolean
) {
  switch (payload.action) {
    case "deselect-option":
    case "select-option":
    case "create-option":
      upsertSelectedEntry(selected, payload, appearanceMode);
      return selected;
    case "remove-value":
      if (appearanceMode) {
        return selected.filter(
          (entry) => `${entry.name}${entry.type}` !== `${payload.removedValue?.name}${payload.type}`
        );
      } else {
        const previous = selected.find((entry) => entry.name === payload.removedValue?.name);
        if (previous) removeIndividualType(previous, payload.type);
        return selected;
      }
    case "clear":
      if (appearanceMode) return selected.filter((entry) => entry.type !== payload.type);
      selected.forEach((entry) => removeIndividualType(entry, payload.type));
      return selected;
    default:
      return null;
  }
}

export function updateField(
  option: string | ChangePayload | null | undefined,
  live: boolean,
  values: FieldItem[] | undefined,
  setFieldValue: (field: string, value: unknown) => void,
  field: string,
  pattern: string,
  scope?: string
) {
  if (live) {
    setFieldValue(field, applyLiveFieldUpdate(option, values, pattern, scope));
    return;
  }

  if (typeof option === "string" && option.trim() === "") return;

  const selected = cloneValues(values);
  const payload = option as ChangePayload;
  const appearanceMode = isAppearanceField(payload.name);
  const nextSelected = applySelectionAction(selected, payload, appearanceMode);
  if (!nextSelected) return;
  setFieldValue(field, stripPlaceholderEntries(nextSelected, appearanceMode));
}

export function getPattern(
  arr: FieldItem[] | null | undefined,
  pattern: string,
  scope?: string
) {
  if (!arr || arr.length === 0) return null;

  for (let index = arr.length - 1; index >= 0; index -= 1) {
    const entry = arr[index];
    if (!entry?.pattern) continue;
    if (scope && !matchesPatternScope(entry, scope)) continue;
    return entry[pattern];
  }

  return null;
}

function matchesPatternScope(entry: FieldItem, scope: string) {
  return entry.type === scope || entry.role === scope;
}
