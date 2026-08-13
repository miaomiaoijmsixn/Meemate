import { withTenant } from "@/lib/api";
import { all, run, kvGet, kvSet, DEFAULT_SETTINGS } from "@/lib/db";
import { tenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = () =>
  withTenant(async () => {
    const states = await all("SELECT * FROM agent_state WHERE tenant=?", [tenantId()]);
    return Response.json({ settings: await kvGet("settings", DEFAULT_SETTINGS), states });
  });

export const PATCH = (req: Request) =>
  withTenant(async () => {
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
      await run("UPDATE agent_state SET muted=? WHERE tenant=? AND agent_id=?", [
        body.muted ? 1 : 0,
        tenantId(),
        body.agentId,
      ]);
    return Response.json({ ok: true });
  });
