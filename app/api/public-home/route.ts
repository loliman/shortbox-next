import { NextResponse } from "next/server";
import { readHomeFeed } from "@/src/lib/read/home-read";
import { parseFilter } from "@/src/components/nav-bar/listUtils";
import { readServerSession } from "@/src/lib/server/session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const us = searchParams.get("locale") === "us";
  const offset = Number(searchParams.get("offset") || "0");
  const limit = Number(searchParams.get("limit") || "50");
  const cursor = searchParams.get("cursor");
  const order = searchParams.get("order");
  const direction = searchParams.get("direction");
  const filter = parseFilter(searchParams.get("filter"));
  const session = await readServerSession();

  const data = await readHomeFeed({
    us,
    offset,
    limit,
    cursor,
    order,
    direction,
    filter,
    loggedIn: Boolean(session?.loggedIn),
  });

  return NextResponse.json(data);
}
