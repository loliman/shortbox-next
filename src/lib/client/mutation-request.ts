export async function mutationRequest<T>(
  input: {
    url: string;
    method?: "POST" | "PATCH" | "DELETE";
    body?: Record<string, unknown>;
  }
) {
  const response = await fetch(input.url, {
    method: input.method || "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.body || {}),
  });

  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}
