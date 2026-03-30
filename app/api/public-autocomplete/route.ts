import { NextRequest, NextResponse } from "next/server";
import { readAutocompleteItems } from "@/src/lib/read/autocomplete-read";
import { validatePublicAutocompleteBody } from "@/src/lib/api/public-autocomplete-body";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const body = await validatePublicAutocompleteBody(rawBody);

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
