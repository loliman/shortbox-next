export const isMockMode =
  String(process.env.NEXT_PUBLIC_MOCK_MODE || "").toLowerCase() === "true";
