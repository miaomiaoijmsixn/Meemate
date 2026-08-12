import { all, run, kvGet, kvSet, DEFAULT_SETTINGS } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const states = await all("SELECT * FROM agent_state");
  return Response.json({ settings: await kvGet("settings", DEFAULT_SETTINGS), states });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as {
    settings?: Record<string, unknown>;
    agentId?: string;
    muted?: boolean;
    silenceDays?: number;
  };
  if (body.settings) await kvSet("settings", body.settings);
  if (typeof body.silenceDays === "number") {
    const s = (await kvGet("settings", DEFAULT_SETTINGS)) as any;
    await kvSet("settings", {
      ...s,
      silenceUntil: body.silenceDays
        ? Date.now() + body.silenceDays * 86400000
        : 0,
    });
  }
  if (body.agentId)
    await run("UPDATE agent_state SET muted=? WHERE agent_id=?", [
      body.muted ? 1 : 0,
      body.agentId,
    ]);
  return Response.json({ ok: true });
}
