import { db, kvGet, kvSet, DEFAULT_SETTINGS } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const states = db().prepare("SELECT * FROM agent_state").all();
  return Response.json({ settings: kvGet("settings", DEFAULT_SETTINGS), states });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as {
    settings?: Record<string, unknown>;
    agentId?: string;
    muted?: boolean;
    silenceDays?: number;
  };
  if (body.settings) kvSet("settings", body.settings);
  if (typeof body.silenceDays === "number") {
    const s = kvGet("settings", DEFAULT_SETTINGS) as any;
    kvSet("settings", {
      ...s,
      silenceUntil: body.silenceDays
        ? Date.now() + body.silenceDays * 86400000
        : 0,
    });
  }
  if (body.agentId)
    db()
      .prepare("UPDATE agent_state SET muted=? WHERE agent_id=?")
      .run(body.muted ? 1 : 0, body.agentId);
  return Response.json({ ok: true });
}
