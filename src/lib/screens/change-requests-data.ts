import { prisma } from "../prisma/client";

export async function getChangeRequests(input?: {
  order?: string | null;
  direction?: string | null;
}) {
  const direction = String(input?.direction || "asc").toLowerCase() === "desc" ? "desc" : "asc";
  const order = String(input?.order || "createdAt");

  try {
    const rows = await prisma.changeRequest.findMany({
      orderBy: order === "createdAt" ? [{ createdAt: direction }, { id: direction }] : [{ createdAt: direction }, { id: direction }],
    });

    return rows.map((entry) => ({
      id: String(entry.id),
      issueId: String(entry.fkIssue),
      createdAt: entry.createdAt.toISOString(),
      type: entry.type,
      changeRequest: entry.changeRequest,
    }));
  } catch {
    return [];
  }
}
