import { all, run, uid } from "@/lib/db";

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

export async function GET() {
  const rows = await all<TodoRow>(
    "SELECT * FROM todos ORDER BY done ASC, created_at DESC",
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
}

export async function POST(req: Request) {
  const { title, due, source, sourceMsg } = (await req.json()) as {
    title: string;
    due?: string;
    source?: string;
    sourceMsg?: string;
  };
  if (!title?.trim()) return Response.json({ ok: false }, { status: 400 });
  await run(
    "INSERT INTO todos (id,title,due,source,source_msg,done,created_at) VALUES (?,?,?,?,?,0,?)",
    [uid("t-"), title.trim(), due ?? null, source ?? "manual", sourceMsg ?? null, Date.now()],
  );
  return Response.json({ ok: true });
}

export async function PATCH(req: Request) {
  const { id, done } = (await req.json()) as { id: string; done: boolean };
  await run("UPDATE todos SET done=? WHERE id=?", [done ? 1 : 0, id]);
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { id } = (await req.json()) as { id: string };
  await run("DELETE FROM todos WHERE id=?", [id]);
  return Response.json({ ok: true });
}
