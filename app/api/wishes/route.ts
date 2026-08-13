import { withTenant } from "@/lib/api";
import { all, first, run, uid } from "@/lib/db";
import { logEvent } from "@/lib/director";
import { addFact } from "@/lib/memory";
import { tenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WishRow = {
  id: string;
  title: string;
  type: string;
  subtitle: string | null;
  meta: string | null;
  source_agent: string | null;
  deadline: string | null;
  status: string;
};

export const GET = () =>
  withTenant(async () => {
    const rows = await all<WishRow>(
      "SELECT * FROM wishes WHERE tenant=? ORDER BY status ASC, created_at DESC",
      [tenantId()],
    );
    return Response.json(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        subtitle: r.subtitle,
        meta: r.meta ? JSON.parse(r.meta) : {},
        sourceAgent: r.source_agent,
        deadline: r.deadline,
        status: r.status,
      })),
    );
  });

export const POST = (req: Request) =>
  withTenant(async () => {
    const { title, type } = (await req.json()) as { title: string; type?: string };
    if (!title?.trim()) return Response.json({ ok: false }, { status: 400 });
    await run(
      "INSERT INTO wishes (tenant,id,title,type,subtitle,meta,source_agent,status,created_at) VALUES (?,?,?,?,?,?,?, 'open',?)",
      [tenantId(), uid("w-"), title.trim(), type ?? "other", "自己加的", "{}", null, Date.now()],
    );
    return Response.json({ ok: true });
  });

export const PATCH = (req: Request) =>
  withTenant(async () => {
    const { id, status } = (await req.json()) as { id: string; status: "open" | "done" };
    const t = tenantId();
    const w = await first<WishRow>("SELECT * FROM wishes WHERE tenant=? AND id=?", [t, id]);
    await run("UPDATE wishes SET status=? WHERE tenant=? AND id=?", [status, t, id]);
    if (status === "done" && w) {
      await logEvent("wish", `去了${w.title}`);
      await addFact({
        text: `去过${w.title}`,
        grp: "经历",
        layer: "episode",
        source: "said",
      });
    }
    return Response.json({ ok: true });
  });

export const DELETE = (req: Request) =>
  withTenant(async () => {
    const { id } = (await req.json()) as { id: string };
    await run("DELETE FROM wishes WHERE tenant=? AND id=?", [tenantId(), id]);
    return Response.json({ ok: true });
  });
