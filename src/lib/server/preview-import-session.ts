import "server-only";

import { prisma } from "../prisma/client";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./session";
import type { ActivePreviewImportQueue, PreviewImportDraft, PreviewImportQueue } from "../../types/preview-import";
import { findCurrentDraft, findPreviousSkippedDraftIndex } from "./preview-import-session-shared";

type SessionPayload = {
  previewImportQueue?: PreviewImportQueue | null;
  [key: string]: unknown;
};

function nowIso() {
  return new Date().toISOString();
}

function toSessionPayload(data: string | null | undefined): SessionPayload {
  if (!data) return {};

  try {
    const parsed = JSON.parse(data) as SessionPayload;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function readServerSessionId() {
  const cookieStore = await cookies();
  return String(cookieStore.get(SESSION_COOKIE_NAME)?.value || "").trim();
}

async function readSessionPayload() {
  const sid = await readServerSessionId();
  if (!sid) return { sid: "", payload: {} as SessionPayload };

  const session = await prisma.session.findUnique({
    where: { sid },
    select: { data: true },
  });

  return {
    sid,
    payload: toSessionPayload(session?.data),
  };
}

async function writeSessionPayload(sid: string, payload: SessionPayload) {
  const timestamp = new Date();
  await prisma.session.upsert({
    where: { sid },
    create: {
      sid,
      data: JSON.stringify(payload),
      createdAt: timestamp,
      updatedAt: timestamp,
      expires: null,
    },
    update: {
      data: JSON.stringify(payload),
      updatedAt: timestamp,
    },
  });
}

export async function readActivePreviewImportQueue(): Promise<ActivePreviewImportQueue | null> {
  const { payload } = await readSessionPayload();
  const queue = payload.previewImportQueue;
  if (!queue) return null;

  const current = findCurrentDraft(queue);
  if (!current) return null;

  return {
    queue,
    currentDraft: current.draft,
    currentDraftIndex: current.index,
    totalDraftCount: queue.drafts.length,
    canGoBack: findPreviousSkippedDraftIndex(queue) >= 0,
  };
}

export async function replaceActivePreviewImportQueue(queue: PreviewImportQueue) {
  const { sid, payload } = await readSessionPayload();
  if (!sid) throw new Error("Keine aktive Admin-Session gefunden");

  await writeSessionPayload(sid, {
    ...payload,
    previewImportQueue: queue,
  });
}

export async function clearActivePreviewImportQueue() {
  const { sid, payload } = await readSessionPayload();
  if (!sid) return;

  const nextPayload = { ...payload };
  delete nextPayload.previewImportQueue;
  await writeSessionPayload(sid, nextPayload);
}

export async function hasActivePreviewImportQueue() {
  return Boolean(await readActivePreviewImportQueue());
}

export async function advanceActivePreviewImportQueue(
  action: "created" | "skipped",
  draftId: string,
  createdIssueId?: string
) {
  const activeQueue = await readActivePreviewImportQueue();
  if (!activeQueue) throw new Error("Keine aktive Import-Queue gefunden");
  if (activeQueue.currentDraft.id !== draftId) {
    throw new Error("Nur der aktuelle Draft kann weitergeschaltet werden");
  }

  const nextDrafts = activeQueue.queue.drafts.map((draft) => {
    if (draft.id !== draftId) return draft;

    return {
      ...draft,
      status: action,
      createdIssueId: action === "created" ? createdIssueId : undefined,
    };
  });

  const nextQueue: PreviewImportQueue = {
    ...activeQueue.queue,
    drafts: nextDrafts,
    updatedAt: nowIso(),
  };

  if (!findCurrentDraft(nextQueue)) {
    await clearActivePreviewImportQueue();
    return null;
  }

  await replaceActivePreviewImportQueue(nextQueue);
  return readActivePreviewImportQueue();
}

export async function rewindActivePreviewImportQueue() {
  const activeQueue = await readActivePreviewImportQueue();
  if (!activeQueue) throw new Error("Keine aktive Import-Queue gefunden");

  const previousSkippedDraftIndex = findPreviousSkippedDraftIndex(activeQueue.queue);
  if (previousSkippedDraftIndex < 0) {
    throw new Error("Es gibt keinen vorherigen übersprungenen Draft");
  }

  const previousDraft = activeQueue.queue.drafts[previousSkippedDraftIndex];
  if (!previousDraft) {
    throw new Error("Der vorherige Draft konnte nicht gefunden werden");
  }

  const nextDrafts = activeQueue.queue.drafts.map((draft, index) =>
    index === previousSkippedDraftIndex
      ? {
          ...draft,
          status: "pending" as const,
        }
      : draft
  );

  const nextQueue: PreviewImportQueue = {
    ...activeQueue.queue,
    drafts: nextDrafts,
    updatedAt: nowIso(),
  };

  await replaceActivePreviewImportQueue(nextQueue);
  return readActivePreviewImportQueue();
}
