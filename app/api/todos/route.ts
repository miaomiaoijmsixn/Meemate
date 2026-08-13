import { withTenant } from "@/lib/api";
import { all, run, uid } from "@/lib/db";
import { tenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TodoRow = {
  id: string;
  title: string;
  due: string | null;
  source: string;
  source_msg: string | null;
  done: number;
};

export const GET = () =>
  withTenant(async () => {
    const rows = await all<TodoRow>(
      "SELECT * FROM todos WHERE tenant=? ORDER BY done ASC, created_at DESC",
      [tenantId()],
    );
    return Response.json(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        due: r.due,
        source: r.source,
        sourceMsg: r.source_msg,
        done: !!r.done,
      })),
    );
  });

export const POST = (req: Request) =>
  withTenant(async () => {
    const { title, due, source, sourceMsg } = (await req.json()) as {
      title: string;
      due?: string;
      source?: string;
      sourceMsg?: string;
    };
    if (!title?.trim()) return Response.json({ ok: false }, { status: 400 });
    await run(
      "INSERT INTO todos (tenant,id,title,due,source,source_msg,done,created_at) VALUES (?,?,?,?,?,?,0,?)",
      [
        tenantId(),
        uid("t-"),
        title.trim(),
        due ?? null,
        source ?? "manual",
        sourceMsg ?? null,
        Date.now(),
      ],
    );
    return Response.json({ ok: true });
  });

export const PATCH = (req: Request) =>
  withTenant(async () => {
    const { id, done } = (await req.json()) as { id: string; done: boolean };
    await run("UPDATE todos SET done=? WHERE tenant=? AND id=?", [
      done ? 1 : 0,
      tenantId(),
      id,
    ]);
    return Response.json({ ok: true });
  });

export const DELETE = (req: Request) =>
  withTenant(async () => {
    const { id } = (await req.json()) as { id: string };
    await run("DELETE FROM todos WHERE tenant=? AND id=?", [tenantId(), id]);
    return Response.json({ ok: true });
  });
