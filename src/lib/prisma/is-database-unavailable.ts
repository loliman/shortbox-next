export function isDatabaseUnavailable(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "P1001") return true;
  if ("message" in error && typeof error.message === "string") {
    return error.message.includes("Can't reach database server");
  }
  return false;
}
