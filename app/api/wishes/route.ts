import { all, first, run, uid } from "@/lib/db";
import { logEvent } from "@/lib/director";
import { addFact } from "@/lib/memory";

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

export async function GET() {
  const rows = await all<WishRow>(
    "SELECT * FROM wishes ORDER BY status ASC, created_at DESC",
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
}

export async function POST(req: Request) {
  const { title, type } = (await req.json()) as { title: string; type?: string };
  if (!title?.trim()) return Response.json({ ok: false }, { status: 400 });
  await run(
    "INSERT INTO wishes (id,title,type,subtitle,meta,source_agent,status,created_at) VALUES (?,?,?,?,?,?, 'open',?)",
    [uid("w-"), title.trim(), type ?? "other", "自己加的", "{}", null, Date.now()],
  );
  return Response.json({ ok: true });
}

export async function PATCH(req: Request) {
  const { id, status } = (await req.json()) as { id: string; status: "open" | "done" };
  const w = await first<WishRow>("SELECT * FROM wishes WHERE id=?", [id]);
  await run("UPDATE wishes SET status=? WHERE id=?", [status, id]);
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
}

export async function DELETE(req: Request) {
  const { id } = (await req.json()) as { id: string };
  await run("DELETE FROM wishes WHERE id=?", [id]);
  return Response.json({ ok: true });
}
