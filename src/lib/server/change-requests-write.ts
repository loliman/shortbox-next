import { Prisma } from "@prisma/client";
import "server-only";

import { prisma } from "../prisma/client";
import { editIssue } from "./issues-write";

type ChangeRequestInput = {
  issue?: Record<string, unknown>;
  item?: Record<string, unknown>;
};

export async function createIssueChangeRequest(input: ChangeRequestInput) {
  const issueId = toIssueId(input.issue);
  if (!issueId) {
    throw new Error("Issue-ID fehlt");
  }

  const payload = {
    issue: (input.issue || {}) as Prisma.InputJsonValue,
    item: (input.item || {}) as Prisma.InputJsonValue,
  } as Prisma.InputJsonValue;

  const rows = await prisma.$queryRaw<
    Array<{
      id: number;
      fk_issue: number;
      createdat: Date;
      type: string;
      changerequest: Prisma.JsonValue;
    }>
  >(Prisma.sql`
    INSERT INTO shortbox.changerequests (fk_issue, createdat, type, changerequest)
    VALUES (${issueId}, ${new Date()}, ${"ISSUE"}, ${JSON.stringify(payload)}::jsonb)
    RETURNING id, fk_issue, createdat, type, changerequest
  `);

  const created = rows[0];
  if (!created) {
    throw new Error("Change Request konnte nicht erstellt werden");
  }

  return {
    id: String(created.id),
    issueId: String(created.fk_issue),
    createdAt: created.createdat.toISOString(),
    type: created.type,
    changeRequest: created.changerequest,
  };
}

export async function discardChangeRequestById(id: unknown) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || Math.trunc(numericId) <= 0) {
    throw new Error("Ungültige Change-Request-ID");
  }

  await prisma.changeRequest.delete({
    where: {
      id: Math.trunc(numericId),
    },
  });

  return true;
}

export async function acceptChangeRequestById(id: unknown) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || Math.trunc(numericId) <= 0) {
    throw new Error("Ungültige Change-Request-ID");
  }

  const entry = await prisma.changeRequest.findUnique({
    where: {
      id: Math.trunc(numericId),
    },
  });
  if (!entry) {
    throw new Error("Change Request nicht gefunden");
  }

  const parsed = parseChangeRequestPayload(entry.changeRequest);
  if (!parsed.issue || !parsed.item) {
    throw new Error("Change Request enthält keine gültigen Issue-Daten");
  }

  const updatedIssue = await editIssue(parsed.issue, parsed.item);

  await prisma.changeRequest.delete({
    where: {
      id: entry.id,
    },
  });

  return updatedIssue;
}

function toIssueId(issue: Record<string, unknown> | undefined) {
  const parsed = Number(issue?.id);
  if (!Number.isFinite(parsed) || Math.trunc(parsed) <= 0) return 0;
  return Math.trunc(parsed);
}

function parseChangeRequestPayload(value: unknown): {
  issue?: Record<string, unknown>;
  item?: Record<string, unknown>;
} {
  const parsed = asRecord(typeof value === "string" ? safeJsonParse(value) : value);
  return {
    issue: asRecord(parsed?.issue) || undefined,
    item: asRecord(parsed?.item) || undefined,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
