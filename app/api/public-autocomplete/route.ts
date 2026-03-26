import { NextRequest, NextResponse } from "next/server";
import { readAutocompleteItems } from "@/src/lib/read/autocomplete-read";
import * as Yup from "yup";

const AutocompleteBodySchema = Yup.object({
  source: Yup.string()
    .oneOf(["publishers", "series", "genres", "arcs", "individuals", "apps", "realities"])
    .required(),
  variables: Yup.object().optional(),
  offset: Yup.number().optional(),
  limit: Yup.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const body = await AutocompleteBodySchema.validate(rawBody, { stripUnknown: true });

    const data = await readAutocompleteItems({
      source: body.source as "publishers" | "series" | "genres" | "arcs" | "individuals" | "apps" | "realities",
      variables: body.variables as Record<string, unknown> | undefined,
      offset: body.offset,
      limit: body.limit,
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { items: [], hasMore: false },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
