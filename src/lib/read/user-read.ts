import "server-only";

import { prisma } from "../prisma/client";

export async function readUserByName(name: string) {
  return prisma.user.findFirst({
    where: {
      name,
    },
  });
}
