import { UserService } from "../../services/user-service";
import { readSessionBySessionId } from "./session";
import "server-only";

type LoginInput = {
  name?: string;
  password?: string;
};

export async function loginUser(credentials: LoginInput) {
  if (!String(credentials.name || "").trim() || !String(credentials.password || "")) {
    throw new Error("Benutzername und Passwort werden benötigt");
  }

  const user = await new UserService().login(credentials);
  if (!user) {
    throw new Error("Ungültige Zugangsdaten");
  }

  const session = await readSessionBySessionId(user.sessionId);

  return {
    id: String(user.id),
    loggedIn: true,
    userId: String(user.id),
    userName: user.name || undefined,
    canWrite: Boolean(session?.canWrite),
    canAdmin: Boolean(session?.canAdmin),
    sessionId: user.sessionId || undefined,
  };
}

export async function logoutUser(userId?: string | number | bigint | null) {
  if (userId == null) return true;
  return new UserService().logout(userId);
}

export async function logoutUserBySessionId(sessionId?: string | null) {
  const session = await readSessionBySessionId(sessionId);
  return logoutUser(session?.userId ?? null);
}
