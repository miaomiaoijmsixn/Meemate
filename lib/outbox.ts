import { db, uid } from "./db";
import type { Beat, Message, MessageRow } from "./types";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** 正在输入的时长与字数正相关，约每 12 字 300 毫秒 */
export const typingMs = (text?: string) =>
  clamp(Math.round(((text?.length ?? 0) / 12) * 300), 400, 2500);

function nextSeq() {
  const r = db().prepare("SELECT COALESCE(MAX(seq),0) s FROM messages").get() as {
    s: number;
  };
  return r.s + 1;
}

/**
 * 把一整场剧本写进消息表，按 typing_at / deliver_at 排好时间。
 * 分条节奏是数据驱动的：用户切走再回来，看到的仍是逐条到达的完整对话。
 */
export function enqueue(conversationId: string, beats: Beat[], startAt = Date.now()) {
  const d = db();
  let t = startAt;
  let seq = nextSeq();
  const ins = d.prepare(
    `INSERT INTO messages (id,seq,conversation_id,sender,kind,text,payload,mention,chips,typing_at,deliver_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const ids: string[] = [];
  let prevSpeaker: string | null = null;
  for (const b of beats) {
    // 换人说话时多留一拍：读起来是"回了一句"，不是几个人同时冒出来
    if (prevSpeaker && prevSpeaker !== b.speaker) t += 620;
    prevSpeaker = b.speaker;
    const think = typingMs(b.text ?? "");
    const typingAt = t;
    const deliverAt = t + think;
    const id = uid("x-");
    ins.run(
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
    );
    ids.push(id);
    t = deliverAt + (b.gapMs ?? 520);
  }
  return ids;
}

/** 用户自己发的消息，立即到达 */
export function pushUser(conversationId: string, text: string) {
  const now = Date.now();
  const id = uid("u-");
  db()
    .prepare(
      `INSERT INTO messages (id,seq,conversation_id,sender,kind,text,typing_at,deliver_at)
       VALUES (?,?,?,'user','text',?,?,?)`,
    )
    .run(id, nextSeq(), conversationId, text, now, now);
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
export function delivered(conversationId: string, afterSeq = 0) {
  const rows = db()
    .prepare(
      `SELECT * FROM messages WHERE conversation_id=? AND deliver_at<=? AND seq>?
       ORDER BY seq ASC`,
    )
    .all(conversationId, Date.now(), afterSeq) as MessageRow[];
  return rows.map(hydrate);
}

/** 当前正在输入的人（已开始打字但还没发出的那一条） */
export function typingNow(conversationId: string) {
  const now = Date.now();
  const r = db()
    .prepare(
      `SELECT sender FROM messages WHERE conversation_id=? AND typing_at<=? AND deliver_at>?
       ORDER BY seq ASC LIMIT 1`,
    )
    .get(conversationId, now, now) as { sender: string } | undefined;
  return r?.sender ?? null;
}

export function lastPreview(conversationId: string) {
  const r = db()
    .prepare(
      `SELECT * FROM messages WHERE conversation_id=? AND deliver_at<=?
       ORDER BY seq DESC LIMIT 1`,
    )
    .get(conversationId, Date.now()) as MessageRow | undefined;
  if (!r) return null;
  return hydrate(r);
}

/** 还没到点的消息数，用来判断这场还没说完 */
export function pending(conversationId: string) {
  const r = db()
    .prepare("SELECT count(*) n FROM messages WHERE conversation_id=? AND deliver_at>?")
    .get(conversationId, Date.now()) as { n: number };
  return r.n;
}

export function markShown(keys: string[], conversationId: string) {
  const ins = db().prepare(
    "INSERT OR REPLACE INTO shown (id,conversation_id,created_at) VALUES (?,?,?)",
  );
  keys.forEach((k) => ins.run(k, conversationId, Date.now()));
}

export function shownKeys() {
  return (db().prepare("SELECT id FROM shown").all() as { id: string }[]).map(
    (r) => r.id,
  );
}
