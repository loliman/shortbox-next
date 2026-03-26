import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";

type FilterIssueReadPayload = Prisma.IssueGetPayload<{
  include: Prisma.IssueInclude;
}>;

export async function readFilterIssues(where: Prisma.IssueWhereInput, include: Prisma.IssueInclude) {
  return prisma.issue.findMany({
    where,
    include,
  }) as Promise<FilterIssueReadPayload[]>;
}
