import { UserService } from "../../services/UserService";
import { readSessionBySessionId } from "./session";

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
import "server-only";
