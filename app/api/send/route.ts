import { respondBeats } from "@/lib/director";
import { enqueue, pushUser } from "@/lib/outbox";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { conversationId, text } = (await req.json()) as {
    conversationId: string;
    text: string;
  };
  if (!text?.trim()) return Response.json({ ok: false }, { status: 400 });
  await pushUser(conversationId, text.trim());
  const beats = await respondBeats(conversationId, text.trim());
  // 用户发完到对方开口之间留一点反应时间
  await enqueue(conversationId, beats, Date.now() + 500);
  return Response.json({ ok: true, beats: beats.length });
}
