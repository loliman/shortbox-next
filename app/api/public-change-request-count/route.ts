import { NextResponse } from "next/server";
import { IssueService } from "@/src/services/IssueService";

export async function GET() {
  try {
    const count = await new IssueService().countChangeRequests();
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
