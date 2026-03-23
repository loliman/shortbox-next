"use client";

const STORAGE_PREFIX = "shortbox.nav";

function readStorage(key: string) {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage.getItem(`${STORAGE_PREFIX}.${key}`);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}.${key}`, value);
  } catch {
    // Ignore storage failures and keep state local.
  }
}

export function clearAllNavState() {
  if (typeof window === "undefined") return;

  try {
    const keysToDelete: string[] = [];
    for (let idx = 0; idx < window.sessionStorage.length; idx += 1) {
      const key = window.sessionStorage.key(idx);
      if (key?.startsWith(`${STORAGE_PREFIX}.`)) keysToDelete.push(key);
    }
    for (const key of keysToDelete) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore storage failures and keep state local.
  }
}

export function readNavExpansionState(key: string): Record<string, boolean> {
  const raw = readStorage(`expanded.${key}`);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeNavExpansionState(key: string, value: Record<string, boolean>) {
  writeStorage(`expanded.${key}`, JSON.stringify(value));
}

export function hasNavExpansionState(key: string) {
  return readStorage(`expanded.${key}`) !== null;
}

export function readNavScrollTop(key: string) {
  const raw = readStorage(`scroll.${key}`);
  const parsed = Number(raw || "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

export function writeNavScrollTop(key: string, value: number) {
  writeStorage(`scroll.${key}`, String(Number.isFinite(value) ? value : 0));
}
