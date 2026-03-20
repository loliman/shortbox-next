import { ChangeRequestType, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";

type ChangeRequestInput = {
  issue?: Record<string, unknown>;
  item?: Record<string, unknown>;
};

export async function createIssueChangeRequest(input: ChangeRequestInput) {
  const issueId = toIssueId(input.issue);
  if (!issueId) {
    throw new Error("Issue-ID fehlt");
  }

  const created = await prisma.changeRequest.create({
    data: {
      fkIssue: issueId,
      type: ChangeRequestType.ISSUE,
      changeRequest: {
        issue: (input.issue || {}) as Prisma.InputJsonValue,
        item: (input.item || {}) as Prisma.InputJsonValue,
      } as Prisma.InputJsonValue,
      createdAt: new Date(),
    },
  });

  return {
    id: String(created.id),
    issueId: String(created.fkIssue),
    createdAt: created.createdAt.toISOString(),
    type: created.type,
    changeRequest: created.changeRequest,
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

function toIssueId(issue: Record<string, unknown> | undefined) {
  const parsed = Number(issue?.id);
  if (!Number.isFinite(parsed) || Math.trunc(parsed) <= 0) return 0;
  return Math.trunc(parsed);
}
