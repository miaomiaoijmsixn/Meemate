import { all, first, run, uid } from "./db";
import type { Beat, Message, MessageRow } from "./types";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** 正在输入的时长与字数正相关,约每 12 字 300 毫秒 */
export const typingMs = (text?: string) =>
  clamp(Math.round(((text?.length ?? 0) / 12) * 300), 400, 2500);

async function nextSeq(): Promise<number> {
  const r = await first<{ s: number }>("SELECT COALESCE(MAX(seq),0) s FROM messages");
  return Number(r?.s ?? 0) + 1;
}

/**
 * 把一整场剧本写进消息表,按 typing_at / deliver_at 排好时间。
 * 分条节奏是数据驱动的:用户切走再回来,看到的仍是逐条到达的完整对话。
 */
export async function enqueue(
  conversationId: string,
  beats: Beat[],
  startAt = Date.now(),
): Promise<string[]> {
  let t = startAt;
  let seq = await nextSeq();
  const ids: string[] = [];
  let prevSpeaker: string | null = null;
  for (const b of beats) {
    // 换人说话时多留一拍:读起来是"回了一句",不是几个人同时冒出来
    if (prevSpeaker && prevSpeaker !== b.speaker) t += 620;
    prevSpeaker = b.speaker;
    const think = typingMs(b.text ?? "");
    const typingAt = t;
    const deliverAt = t + think;
    const id = uid("x-");
    await run(
      `INSERT INTO messages (id,seq,conversation_id,sender,kind,text,payload,mention,chips,typing_at,deliver_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        seq++,
        conversationId,
        b.speaker,
        b.cards?.length ? "cards" : "text",
        b.text ?? null,
        b.cards?.length ? JSON.stringify(b.cards) : null,
        b.mention ? 1 : 0,
        b.chips?.length ? JSON.stringify(b.chips) : null,
        typingAt,
        deliverAt,
      ],
    );
    ids.push(id);
    t = deliverAt + (b.gapMs ?? 520);
  }
  return ids;
}

/** 用户自己发的消息,立即到达 */
export async function pushUser(conversationId: string, text: string): Promise<string> {
  const now = Date.now();
  const id = uid("u-");
  const seq = await nextSeq();
  await run(
    `INSERT INTO messages (id,seq,conversation_id,sender,kind,text,typing_at,deliver_at)
     VALUES (?,?,?,'user','text',?,?,?)`,
    [id, seq, conversationId, text, now, now],
  );
  return id;
}

const hydrate = (r: MessageRow): Message => ({
  id: r.id,
  conversationId: r.conversation_id,
  sender: r.sender,
  kind: r.kind,
  text: r.text ?? undefined,
  cards: r.payload ? JSON.parse(r.payload) : undefined,
  mention: !!r.mention,
  chips: r.chips ? JSON.parse(r.chips) : undefined,
  deliverAt: r.deliver_at,
  seq: r.seq,
});

/** 已经到点的消息 */
export async function delivered(conversationId: string, afterSeq = 0): Promise<Message[]> {
  const rows = await all<MessageRow>(
    `SELECT * FROM messages WHERE conversation_id=? AND deliver_at<=? AND seq>?
     ORDER BY seq ASC`,
    [conversationId, Date.now(), afterSeq],
  );
  return rows.map(hydrate);
}

/** 当前正在输入的人(已开始打字但还没发出的那一条) */
export async function typingNow(conversationId: string): Promise<string | null> {
  const now = Date.now();
  const r = await first<{ sender: string }>(
    `SELECT sender FROM messages WHERE conversation_id=? AND typing_at<=? AND deliver_at>?
     ORDER BY seq ASC LIMIT 1`,
    [conversationId, now, now],
  );
  return r?.sender ?? null;
}

export async function lastPreview(conversationId: string): Promise<Message | null> {
  const r = await first<MessageRow>(
    `SELECT * FROM messages WHERE conversation_id=? AND deliver_at<=?
     ORDER BY seq DESC LIMIT 1`,
    [conversationId, Date.now()],
  );
  if (!r) return null;
  return hydrate(r);
}

/** 还没到点的消息数,用来判断这场还没说完 */
export async function pending(conversationId: string): Promise<number> {
  const r = await first<{ n: number }>(
    "SELECT count(*) n FROM messages WHERE conversation_id=? AND deliver_at>?",
    [conversationId, Date.now()],
  );
  return Number(r?.n ?? 0);
}

export async function markShown(keys: string[], conversationId: string): Promise<void> {
  for (const k of keys) {
    await run(
      "INSERT OR REPLACE INTO shown (id,conversation_id,created_at) VALUES (?,?,?)",
      [k, conversationId, Date.now()],
    );
  }
}

export async function shownKeys(): Promise<string[]> {
  const rows = await all<{ id: string }>("SELECT id FROM shown");
  return rows.map((r) => r.id);
}
