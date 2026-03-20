import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "../prisma/client";

type LoginInput = {
  name?: string;
  password?: string;
};

export async function loginUser(credentials: LoginInput) {
  const name = String(credentials.name || "").trim();
  const password = String(credentials.password || "");

  if (!name || !password) {
    throw new Error("Benutzername und Passwort werden benötigt");
  }

  const user = await prisma.user.findFirst({
    where: {
      name,
    },
  });

  if (!user || !verifyPassword(password, user.password || "")) {
    throw new Error("Ungültige Zugangsdaten");
  }

  const nextSessionId = randomBytes(18).toString("hex");
  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      sessionId: nextSessionId,
      updatedAt: new Date(),
    },
  });

  return {
    id: String(user.id),
    loggedIn: true,
  };
}

export async function logoutUser() {
  return true;
}

function verifyPassword(inputPassword: string, storedPassword: string) {
  if (storedPassword.startsWith("scrypt$")) {
    const [, salt, expectedHash] = storedPassword.split("$");
    if (!salt || !expectedHash) return false;
    const calculatedHash = scryptSync(inputPassword, salt, 64).toString("base64url");
    return safeEqual(expectedHash, calculatedHash);
  }

  return safeEqual(storedPassword, inputPassword);
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
