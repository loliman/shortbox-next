import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action?: "run" | "release-locks";
      input?: Record<string, unknown>;
    };

    if (body.action === "release-locks") {
      return NextResponse.json(
        { removedJobs: 0 },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const taskKey = String(body.input?.taskKey || "").trim();
    const dryRun = Boolean(body.input?.dryRun);

    return NextResponse.json(
      {
        run: {
          id: `${taskKey || "task"}-${Date.now()}`,
          taskKey,
          taskName: taskKey || "Task",
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          dryRun,
          status: "SUCCESS",
          summary: dryRun ? "Dry-Run gestartet (Stub)." : "Task gestartet (Stub).",
          details: JSON.stringify(
            {
              state: "queued",
              stub: true,
              input: body.input || {},
            },
            null,
            2
          ),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return NextResponse.json({ error: "Admin-Task-Aktion fehlgeschlagen" }, { status: 400 });
  }
}
