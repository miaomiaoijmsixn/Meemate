import { db, uid } from "@/lib/db";
import { logEvent } from "@/lib/director";
import { enqueue } from "@/lib/outbox";
import { generatePlan, getPlan, reorderPlan, type PlanParams } from "@/lib/planner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    const rows = db()
      .prepare("SELECT id,day,created_at FROM plans ORDER BY created_at DESC")
      .all();
    return Response.json(rows);
  }
  const p = getPlan(id);
  return p ? Response.json(p) : Response.json({ ok: false }, { status: 404 });
}

export async function POST(req: Request) {
  const { wishIds, params } = (await req.json()) as {
    wishIds: string[];
    params: PlanParams;
  };
  const out = await generatePlan(wishIds, params);
  logEvent("todo", `让小咪排了${params.day}的行程`);
  // 编排过程在小咪单聊里可见
  enqueue(
    "c-mimi",
    [
      { speaker: "mimi", text: `我在给你排${params.day}`, gapMs: 420 },
      {
        speaker: "mimi",
        text: "排好了，你去看看要不要调",
        cards: [
          {
            id: out.planId,
            kind: "planSummary",
            title: `${params.day}的行程`,
            subtitle: `${out.items.length} 站 · ${params.start} 出门`,
            body: out.items.slice(0, 3).map((i) => `${i.start} ${i.title}`),
            meta: { 提示: out.notes[0] ?? "没有冲突" },
          },
        ],
      },
    ],
    Date.now() + 600,
  );
  return Response.json({ ok: true, planId: out.planId });
}

export async function PATCH(req: Request) {
  const { id, order, confirm } = (await req.json()) as {
    id: string;
    order?: string[];
    confirm?: boolean;
  };
  if (order?.length) {
    const p = reorderPlan(id, order);
    return Response.json(p);
  }
  if (confirm) {
    const p = getPlan(id);
    if (!p) return Response.json({ ok: false }, { status: 404 });
    // 提醒默认开启：页面一进来就自动确认，所以必须幂等，不能每次都再写一遍待办
    if (p.confirmed) return Response.json({ ok: true, already: true, todos: p.items.length });
    const ins = db().prepare(
      "INSERT INTO todos (id,title,due,source,done,created_at) VALUES (?,?,?, 'plan',0,?)",
    );
    p.items.forEach((i) =>
      ins.run(uid("t-"), i.title, `${p.day} ${i.start}`, Date.now()),
    );
    db().prepare("UPDATE plans SET confirmed=1 WHERE id=?").run(id);
    enqueue("c-mimi", [
      {
        speaker: "mimi",
        text: `${p.day}的安排都写进待办了，${p.items[0].start} 出门，我提前一小时叫你喵`,
      },
    ]);
    return Response.json({ ok: true, todos: p.items.length });
  }
  return Response.json({ ok: false }, { status: 400 });
}
