import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/src/lib/server/auth-write";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      credentials?: { name?: string; password?: string };
    };

    const user = await loginUser(body.credentials || {});
    return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login fehlgeschlagen" },
      { status: 400 }
    );
  }
}
