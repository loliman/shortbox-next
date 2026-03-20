import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma/client";

export async function GET() {
  try {
    const count = await prisma.changeRequest.count();
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
