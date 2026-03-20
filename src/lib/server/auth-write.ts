import { UserService } from "../../services/UserService";

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

  return {
    id: String(user.id),
    loggedIn: true,
  };
}

export async function logoutUser(userId?: string | number | bigint | null) {
  if (userId == null) return true;
  return new UserService().logout(userId);
}
