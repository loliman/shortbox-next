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

  const rawText = await response.text().catch(() => "");
  let payload: (T & { error?: string }) = {} as T & { error?: string };

  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      if (!response.ok) {
        throw new Error(
          response.status === 504
            ? "Server-Timeout (504 Gateway Timeout). Der Vorgang dauert länger als das Proxy-Limit."
            : `Serverfehler (${response.status}): Die Anfrage konnte nicht verarbeitet werden.`
        );
      }
    }
  }

  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}
