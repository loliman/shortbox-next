import { prisma } from "../prisma/client";
import { normalizeIssueReleaseDate, normalizeRecordString } from "./issue-read-shared";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeForDiff(value: unknown): unknown {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForDiff(entry));
  }

  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(input).sort()) {
      normalized[key] = normalizeForDiff(input[key]);
    }
    return normalized;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

function extractChangeRequestItem(value: unknown): Record<string, unknown> | null {
  const payload = asRecord(value);
  if (!payload) return null;

  const wrappedItem = asRecord(payload.item);
  if (wrappedItem) return wrappedItem;

  if (hasOwn(payload, "item")) return null;
  return payload;
}

function mergeRecords(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };

  for (const [key, patchValue] of Object.entries(patch)) {
    const baseValue = merged[key];

    if (Array.isArray(patchValue)) {
      merged[key] = patchValue;
      continue;
    }

    if (isPlainObject(baseValue) && isPlainObject(patchValue)) {
      merged[key] = mergeRecords(baseValue, patchValue);
      continue;
    }

    merged[key] = patchValue;
  }

  return merged;
}

function resolveChangeRequestItem(
  value: unknown,
  issue: Record<string, unknown> | null
): Record<string, unknown> | null {
  const changeItem = extractChangeRequestItem(value);
  if (!changeItem && !issue) return null;
  if (!changeItem) return issue ? (normalizeForDiff(issue) as Record<string, unknown>) : null;
  if (!issue) return normalizeForDiff(changeItem) as Record<string, unknown>;

  return normalizeForDiff(mergeRecords(issue, changeItem)) as Record<string, unknown>;
}

function normalizeChangeRequestPayload(
  value: unknown,
  issue: Record<string, unknown> | null
): Record<string, unknown> {
  const payload = asRecord(value) || {};
  const normalizedItem = resolveChangeRequestItem(payload, issue) || {};

  const nextPayload: Record<string, unknown> = {
    ...payload,
    item: normalizedItem,
  };

  if (issue) nextPayload.issue = issue;
  return nextPayload;
}

async function loadIssueForChangeRequest(issueId: number): Promise<Record<string, unknown> | null> {
  const row = await prisma.issue.findFirst({
    where: {
      id: BigInt(issueId),
    },
    include: {
      series: {
        include: {
          publisher: true,
        },
      },
      stories: {
        orderBy: [{ number: "asc" }, { id: "asc" }],
        include: {
          individuals: {
            include: {
              individual: true,
            },
          },
          appearances: {
            include: {
              appearance: true,
            },
          },
          parent: {
            include: {
              issue: {
                include: {
                  series: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!row) return null;

  return {
    id: Number(row.id),
    title: normalizeRecordString(row.title),
    number: normalizeRecordString(row.number),
    format: normalizeRecordString(row.format),
    variant: normalizeRecordString(row.variant),
    releasedate: normalizeIssueReleaseDate(row.releaseDate),
    pages: Number(row.pages || 0),
    price: Number(row.price || 0),
    currency: normalizeRecordString(row.currency),
    isbn: normalizeRecordString(row.isbn),
    limitation: normalizeRecordString(row.limitation),
    comicguideid: Number(row.comicGuideId || 0),
    addinfo: normalizeRecordString(row.addInfo),
    series: {
      title: normalizeRecordString(row.series?.title),
      volume: Number(row.series?.volume || 0),
      startyear: Number(row.series?.startYear || 0),
      publisher: {
        name: normalizeRecordString(row.series?.publisher?.name),
        us: Boolean(row.series?.publisher?.original),
      },
    },
    stories: row.stories.map((story) => {
      const parent = story.parent;
      const parentIssue = parent?.issue;
      const parentSeries = parentIssue?.series;
      const mapped: Record<string, unknown> = {
        title: normalizeRecordString(story.title),
        addinfo: normalizeRecordString(story.addInfo),
        part: normalizeRecordString(story.part),
        number: Number(story.number || 0),
        exclusive: !parent,
        individuals: story.individuals.map((entry) => ({
          name: normalizeRecordString(entry.individual?.name),
          type: normalizeRecordString(entry.type) ? [normalizeRecordString(entry.type)] : [],
        })),
        appearances: story.appearances.map((entry) => ({
          name: normalizeRecordString(entry.appearance?.name),
          type: normalizeRecordString(entry.appearance?.type),
          role: normalizeRecordString(entry.role),
        })),
      };

      if (parent) {
        mapped.parent = {
          title: normalizeRecordString(parent.title),
          addinfo: normalizeRecordString(parent.addInfo),
          part: normalizeRecordString(parent.part),
          number: Number(parent.number || 0),
          issue: parentIssue
            ? {
                number: normalizeRecordString(parentIssue.number),
                series: parentSeries
                  ? {
                      title: normalizeRecordString(parentSeries.title),
                      volume: Number(parentSeries.volume || 0),
                    }
                  : null,
              }
            : null,
        };
      }

      return mapped;
    }),
  };
}

export async function readChangeRequests(options?: { order?: string | null; direction?: string | null }) {
  const direction = String(options?.direction || "asc").toLowerCase() === "desc" ? "desc" : "asc";
  const rows = await prisma.changeRequest.findMany({
    orderBy:
      String(options?.order || "createdAt") === "createdAt"
        ? [{ createdAt: direction }, { id: direction }]
        : [{ createdAt: direction }, { id: direction }],
  });

  if (rows.length === 0) return [];

  const loadedIssuesByChangeRequestId = new Map<number, Record<string, unknown> | null>();
  await Promise.all(
    rows.map(async (entry) => {
      const loadedIssue = await loadIssueForChangeRequest(entry.fkIssue);
      loadedIssuesByChangeRequestId.set(entry.id, loadedIssue);
    })
  );

  return rows.map((entry) => {
    const loadedIssue = loadedIssuesByChangeRequestId.get(entry.id) || null;
    return {
      id: String(entry.id),
      issueId: String(entry.fkIssue),
      createdAt: entry.createdAt.toISOString(),
      type: entry.type,
      changeRequest: normalizeChangeRequestPayload(entry.changeRequest, loadedIssue),
    };
  });
}

export async function countChangeRequests() {
  return prisma.changeRequest.count();
}
