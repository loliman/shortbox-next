import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const us = searchParams.get("locale") === "us";
  const pattern = (searchParams.get("pattern") || "").trim();

  if (pattern.length < 2) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await prisma.searchIndex.findMany({
      where: {
        us,
        OR: [
          { label: { contains: pattern, mode: "insensitive" } },
          { searchText: { contains: pattern, mode: "insensitive" } },
        ],
      },
      orderBy: [{ nodeType: "asc" }, { label: "asc" }],
      take: 50,
    });

    return NextResponse.json({
      items: items.map((item) => ({
        type: item.nodeType,
        label: item.label,
        url: item.url,
      })),
    });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
