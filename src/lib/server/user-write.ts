import "server-only";

import { prisma } from "../prisma/client";

type LoginSessionUpdateInput = {
  userId: bigint;
  sessionId: string;
  updatedAt: Date;
  password?: string;
};

export async function updateUserLoginSession(input: LoginSessionUpdateInput) {
  const { userId, sessionId, updatedAt, password } = input;

  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      sessionId,
      updatedAt,
      ...(password ? { password } : {}),
    },
  });
}

export async function clearUserSession(userId: number | bigint | string, updatedAt = new Date()) {
  await prisma.user.update({
    where: {
      id: BigInt(userId),
    },
    data: {
      sessionId: null,
      updatedAt,
    },
  });
}
