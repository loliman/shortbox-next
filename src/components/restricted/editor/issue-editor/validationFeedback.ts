import type { FormikErrors, FormikTouched } from "formik";

export function buildTouchedFromErrors<T>(errors: FormikErrors<T>): FormikTouched<T> {
  if (Array.isArray(errors)) {
    return errors.map((entry) =>
      isNestedError(entry) ? buildTouchedFromErrors(entry as FormikErrors<unknown>) : true
    ) as unknown as FormikTouched<T>;
  }

  if (isNestedError(errors)) {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(errors)) {
      result[key] = isNestedError(value)
        ? buildTouchedFromErrors(value as FormikErrors<unknown>)
        : true;
    }

    return result as FormikTouched<T>;
  }

  return true as unknown as FormikTouched<T>;
}

export function findFirstErrorPath(errors: unknown, prefix = ""): string {
  if (typeof errors === "string") return prefix;

  if (Array.isArray(errors)) {
    for (let index = 0; index < errors.length; index += 1) {
      const nextPrefix = prefix ? `${prefix}.${index}` : String(index);
      const path = findFirstErrorPath(errors[index], nextPrefix);
      if (path) return path;
    }
    return "";
  }

  if (errors && typeof errors === "object") {
    for (const [key, value] of Object.entries(errors)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      const path = findFirstErrorPath(value, nextPrefix);
      if (path) return path;
    }
  }

  return "";
}

export function focusEditorErrorField(errorPath: string) {
  if (!errorPath || typeof globalThis.window === "undefined") return;

  globalThis.requestAnimationFrame(() => {
    revealStoryErrorPanel(errorPath);

    globalThis.requestAnimationFrame(() => {
      const escapedId = typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(errorPath)
        : errorPath.replaceAll(/[ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, "\\$&");

      const target = document.getElementById(errorPath)
        || document.querySelector<HTMLElement>(`#${escapedId}`)
        || document.querySelector<HTMLElement>(`[name="${errorPath}"]`);

      if (!target) return;

      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.focus?.();
    });
  });
}

function isNestedError(value: unknown) {
  return Boolean(value) && (Array.isArray(value) || typeof value === "object");
}

function revealStoryErrorPanel(errorPath: string) {
  const storyIndexPattern = /^stories(?:\.|\[)(\d+)/;
  const match = storyIndexPattern.exec(errorPath);
  if (!match) return;

  const storyIndex = match[1];
  if (!storyIndex) return;

  const card = document.querySelector<HTMLElement>(`[data-story-card="true"][data-story-index="${storyIndex}"]`);
  if (!card) return;

  const summary = card.querySelector<HTMLElement>(".MuiAccordionSummary-root");
  const expanded = summary?.getAttribute("aria-expanded") === "true";
  if (expanded !== true) {
    summary?.click();
  }
}
