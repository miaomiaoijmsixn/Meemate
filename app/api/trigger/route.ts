import { diaryBeats, triggerBeats } from "@/lib/director";
import { db, kvGet } from "@/lib/db";
import { addDiary } from "@/lib/memory";
import { enqueue } from "@/lib/outbox";
import type { TriggerKind } from "@/lib/types";

export const runtime = "nodejs";

const QUOTA = 4; // 全局每日主动推送上限

function pushedToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const r = db()
    .prepare(
      "SELECT count(DISTINCT typing_at) n FROM messages WHERE sender!='user' AND typing_at>=?",
    )
    .get(start.getTime()) as { n: number };
  return r.n;
}

/**
 * 主动消息触发。真上线时由 cron 打，demo 里由时间机器手动打，
 * 但配额、免打扰、静默这几道闸门是同一套。
 */
export async function POST(req: Request) {
  const { kind, force } = (await req.json()) as { kind: TriggerKind; force?: boolean };
  const settings = kvGet("settings", { silenceUntil: 0, quiet: ["23:30", "07:30"] } as any);

  if (!force) {
    if (settings.silenceUntil && Date.now() < settings.silenceUntil)
      return Response.json({ ok: false, reason: "你让我最近别找你，我先憋着" });
    const hm = new Date().toTimeString().slice(0, 5);
    const [qs, qe] = settings.quiet;
    const inQuiet = qs < qe ? hm >= qs && hm < qe : hm >= qs || hm < qe;
    if (inQuiet) return Response.json({ ok: false, reason: "现在是免打扰时段" });
    if (pushedToday() >= QUOTA * 6)
      return Response.json({ ok: false, reason: "今天的主动消息配额用完了" });
  }

  if (kind === "diary") {
    const { beats, diary, facts } = await diaryBeats();
    addDiary(diary, facts);
    enqueue("c-mimi", beats);
    return Response.json({ ok: true, conversationId: "c-mimi" });
  }

  const out = await triggerBeats(kind);
  if (!out) return Response.json({ ok: false });
  enqueue(out.conversationId, out.beats);
  return Response.json({ ok: true, conversationId: out.conversationId });
}
