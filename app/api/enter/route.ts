import { entryBeats, hasEntrySet } from "@/lib/director";
import { enqueue } from "@/lib/outbox";
import { slotOf } from "@/lib/prefs";

export const runtime = "nodejs";

/**
 * 进群。同一个时段只给一次今日推荐,换了时段(早/中/下午/晚/深夜)再给新的,
 * 否则每点一次群就刷三条,反而更吵。
 */
export async function POST(req: Request) {
  const { conversationId, force } = (await req.json()) as {
    conversationId: string;
    force?: boolean;
  };
  const slot = slotOf();
  if (!force && (await hasEntrySet(conversationId, slot)))
    return Response.json({ ok: true, fresh: false, slot });
  const beats = await entryBeats(conversationId);
  if (!beats.length) return Response.json({ ok: true, fresh: false, slot });
  await enqueue(conversationId, beats, Date.now() + 260);
  return Response.json({ ok: true, fresh: true, slot });
}
