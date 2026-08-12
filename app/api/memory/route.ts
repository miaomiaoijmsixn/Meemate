import { db } from "@/lib/db";
import { enqueue } from "@/lib/outbox";
import { listDiaries, listFacts, removeFact, toggleUsable } from "@/lib/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ diaries: listDiaries(), facts: listFacts() });
}

/** 改记忆是产品的核心控制点：改完小咪要立刻给一句回执 */
export async function PATCH(req: Request) {
  const { id, action, text } = (await req.json()) as {
    id: string;
    action: "remove" | "unusable" | "usable" | "edit";
    text?: string;
  };
  if (action === "remove") removeFact(id);
  if (action === "unusable") toggleUsable(id, false);
  if (action === "usable") toggleUsable(id, true);
  if (action === "edit" && text)
    db().prepare("UPDATE memories SET text=?, source='said' WHERE id=?").run(text, id);

  const line =
    action === "remove"
      ? "删了，下次不按这条推"
      : action === "unusable"
        ? "留在日记里，但我不拿它推荐了"
        : action === "edit"
          ? "我记错了，改过来了"
          : "好，这条我继续用";
  enqueue("c-mimi", [{ speaker: "mimi", text: line }], Date.now() + 200);
  return Response.json({ ok: true });
}
