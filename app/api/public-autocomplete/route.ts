import { NextRequest, NextResponse } from "next/server";
import { readAutocompleteItems } from "@/src/lib/read/autocomplete-read";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      source?: "publishers" | "series" | "genres" | "arcs" | "individuals" | "apps" | "realities";
      variables?: Record<string, unknown>;
      offset?: number;
      limit?: number;
    };

    if (!body?.source) {
      return NextResponse.json({ items: [], hasMore: false }, { status: 400 });
    }

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
