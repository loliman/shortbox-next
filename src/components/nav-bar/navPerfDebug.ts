"use client";

type NavPerfDetail = Record<string, unknown> | undefined;

type NavPerfEvent = {
  name: string;
  at: number;
  duration?: number;
  detail?: NavPerfDetail;
};

type NavPerfStore = {
  sessionKey: string;
  events: NavPerfEvent[];
};

declare global {
  interface Window {
    __SHORTBOX_NAV_DEBUG__?: NavPerfStore;
  }
}

const QUERY_FLAG = "navDebug";
const STORAGE_KEY = "shortbox_nav_debug";
const EVENT_LIMIT = 300;
const MARK_PREFIX = "shortbox-nav:";

export function isNavPerfDebugEnabled() {
  if (globalThis.window === undefined) return false;

  try {
    const params = new URLSearchParams(globalThis.location.search);
    if (params.get(QUERY_FLAG) === "1") return true;
  } catch {
    // Ignore URL parsing issues in debug helper.
  }

  try {
    return globalThis.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function resetNavPerfSession(sessionKey: string, detail?: NavPerfDetail) {
  if (!isNavPerfDebugEnabled() || globalThis.window === undefined) return;

  globalThis.__SHORTBOX_NAV_DEBUG__ = {
    sessionKey,
    events: [],
  };

  safeClearPerformanceEntries();
  pushNavPerfEvent("session:start", detail);
}

export function markNavPerf(name: string, detail?: NavPerfDetail) {
  if (!isNavPerfDebugEnabled() || globalThis.window === undefined) return;

  const markName = `${MARK_PREFIX}${name}`;
  try {
    globalThis.performance.mark(markName);
  } catch {
    // Ignore unsupported performance API issues in debug helper.
  }

  pushNavPerfEvent(name, detail);
}

export function measureNavPerf(name: string, start: string, end: string, detail?: NavPerfDetail) {
  if (!isNavPerfDebugEnabled() || globalThis.window === undefined) return null;

  const measureName = `${MARK_PREFIX}${name}`;
  try {
    globalThis.performance.measure(measureName, `${MARK_PREFIX}${start}`, `${MARK_PREFIX}${end}`);
    const entries = globalThis.performance.getEntriesByName(measureName, "measure");
    const duration = entries.at(-1)?.duration ?? null;
    pushNavPerfEvent(`${name}:measure`, duration == null ? detail : { ...detail, duration });
    return duration;
  } catch {
    return null;
  }
}

export function observeNavLongTasks() {
  if (!isNavPerfDebugEnabled() || globalThis.window === undefined) return () => {};
  if (typeof PerformanceObserver === "undefined") return () => {};

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        pushNavPerfEvent("longtask", {
          duration: Math.round(entry.duration),
          startTime: Math.round(entry.startTime),
          name: entry.name,
        });
      }
    });

    observer.observe({ type: "longtask", buffered: true });
    return () => observer.disconnect();
  } catch {
    return () => {};
  }
}

export function printNavPerfSummary(label = "sidebar") {
  if (!isNavPerfDebugEnabled() || globalThis.window === undefined) return;

  const store = globalThis.__SHORTBOX_NAV_DEBUG__;
  if (!store) return;

  const rows = store.events.map((event) => ({
    name: event.name,
    at: Math.round(event.at),
    duration:
      typeof event.duration === "number" ? Math.round(event.duration * 10) / 10 : undefined,
    detail: event.detail,
  }));

  console.groupCollapsed(`[nav-perf] ${label} (${store.sessionKey})`);
  console.table(rows);
  console.groupEnd();
}

function pushNavPerfEvent(name: string, detail?: NavPerfDetail) {
  if (globalThis.window === undefined) return;

  const store = globalThis.__SHORTBOX_NAV_DEBUG__ ??= {
    sessionKey: "unknown",
    events: [],
  };

  const at = typeof performance !== "undefined" ? performance.now() : Date.now();
  store.events.push({ name, at, detail });
  if (store.events.length > EVENT_LIMIT) {
    store.events.splice(0, store.events.length - EVENT_LIMIT);
  }

  console.info(`[nav-perf] ${name}`, detail ?? "");
}

function safeClearPerformanceEntries() {
  try {
    globalThis.performance.clearMarks();
    globalThis.performance.clearMeasures();
  } catch {
    // Ignore unsupported performance API issues in debug helper.
  }
}
