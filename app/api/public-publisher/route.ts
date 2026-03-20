import { NextResponse } from "next/server";
import { PublisherService } from "@/src/services/PublisherService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const us = searchParams.get("locale") === "us";
  const publisher = searchParams.get("publisher") || "";

  try {
    const service = new PublisherService();
    const data = await service.getPublisherDetails({ us, publisher });
    return NextResponse.json({ item: data });
  } catch {
    return NextResponse.json({ item: null });
  }
}
