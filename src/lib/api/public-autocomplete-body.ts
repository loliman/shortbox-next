import * as Yup from "yup";

const AutocompleteBaseSchema = Yup.object({
  source: Yup.string()
    .oneOf(["publishers", "series", "genres", "arcs", "individuals", "apps", "realities"])
    .required(),
  offset: Yup.number().optional(),
  limit: Yup.number().optional(),
});

type AutocompleteBody = {
  source: "publishers" | "series" | "genres" | "arcs" | "individuals" | "apps" | "realities";
  variables?: Record<string, unknown>;
  offset?: number;
  limit?: number;
};

export async function validatePublicAutocompleteBody(rawBody: unknown): Promise<AutocompleteBody> {
  const body = await AutocompleteBaseSchema.validate(rawBody, { stripUnknown: true });
  const rawVariables = isRecord((rawBody as { variables?: unknown } | null | undefined)?.variables)
    ? ((rawBody as { variables?: Record<string, unknown> }).variables ?? undefined)
    : undefined;

  return {
    source: body.source as AutocompleteBody["source"],
    variables: rawVariables,
    offset: body.offset,
    limit: body.limit,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
