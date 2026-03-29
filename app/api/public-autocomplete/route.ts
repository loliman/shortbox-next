import { NextRequest, NextResponse } from "next/server";
import { readAutocompleteItems } from "@/src/lib/read/autocomplete-read";
import * as Yup from "yup";
import { InferType } from "yup";

const AutocompleteBodySchema = Yup.object({
  source: Yup.string()
    .oneOf(["publishers", "series", "genres", "arcs", "individuals", "apps", "realities"])
    .required(),
  variables: Yup.object().optional(),
  offset: Yup.number().optional(),
  limit: Yup.number().optional(),
});

type AutocompleteBody = InferType<typeof AutocompleteBodySchema>;

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const body: AutocompleteBody = await AutocompleteBodySchema.validate(rawBody, {
      stripUnknown: true,
    });

    const data = await readAutocompleteItems({
      source: body.source,
      variables: body.variables,
      offset: body.offset,
      limit: body.limit,
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Yup.ValidationError) {
      return NextResponse.json(
        { error: error.errors.join(", ") },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

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
