import { db, uid, today, kvGet } from "./db";
import type { Card } from "./types";
import type { Item } from "./catalog";

export type Memory = {
  id: string;
  type: "diary" | "fact";
  day: string;
  grp: string | null;
  layer: "profile" | "episode" | "state" | null;
  tag: string | null;
  text: string;
  source: "said" | "guess";
  hits: number;
  diary_id: string | null;
  usable: number;
  active: number;
  expires_at: number | null;
  created_at: number;
};

/** 写入一条结构化记忆。同一条被反复印证时只累加印证次数。 */
export function addFact(f: {
  text: string;
  grp: string;
  layer?: Memory["layer"];
  tag?: string;
  source?: "said" | "guess";
  diaryId?: string;
  expiresAt?: number;
}) {
  const d = db();
  const exist = d
    .prepare("SELECT id,hits FROM memories WHERE type='fact' AND text=?")
    .get(f.text) as { id: string; hits: number } | undefined;
  if (exist) {
    d.prepare("UPDATE memories SET hits=hits+1, active=1 WHERE id=?").run(exist.id);
    return exist.id;
  }
  const id = uid("m-");
  d.prepare(
    `INSERT INTO memories (id,type,day,grp,layer,tag,text,source,hits,diary_id,active,usable,expires_at,created_at)
     VALUES (?,'fact',?,?,?,?,?,?,1,?,1,1,?,?)`,
  ).run(
    id,
    today(),
    f.grp,
    f.layer ?? "profile",
    f.tag ?? null,
    f.text,
    f.source ?? "said",
    f.diaryId ?? null,
    f.expiresAt ?? null,
    Date.now(),
  );
  return id;
}

export function addDiary(text: string, facts: { text: string; grp: string; tag?: string; source?: "said" | "guess" }[]) {
  const id = uid("dy-");
  db()
    .prepare(
      `INSERT INTO memories (id,type,day,grp,layer,tag,text,source,hits,active,usable,created_at)
       VALUES (?,'diary',?,'diary','episode',NULL,?, 'said',1,1,1,?)`,
    )
    .run(id, today(), text, Date.now());
  facts.forEach((f) => addFact({ ...f, diaryId: id, layer: "episode" }));
  return id;
}

export function listDiaries() {
  const d = db();
  const rows = d
    .prepare("SELECT * FROM memories WHERE type='diary' ORDER BY created_at DESC")
    .all() as Memory[];
  return rows.map((r) => ({
    ...r,
    chips: d
      .prepare("SELECT * FROM memories WHERE diary_id=? AND active=1")
      .all(r.id) as Memory[],
  }));
}

export function listFacts() {
  return db()
    .prepare(
      "SELECT * FROM memories WHERE type='fact' AND active=1 ORDER BY hits DESC, created_at DESC",
    )
    .all() as Memory[];
}

export function factByTag(tag: string) {
  return db()
    .prepare(
      "SELECT * FROM memories WHERE type='fact' AND active=1 AND usable=1 AND tag=? ORDER BY hits DESC LIMIT 1",
    )
    .get(tag) as Memory | undefined;
}

export function removeFact(id: string) {
  db().prepare("UPDATE memories SET active=0 WHERE id=?").run(id);
}

export function toggleUsable(id: string, usable: boolean) {
  db().prepare("UPDATE memories SET usable=? WHERE id=?").run(usable ? 1 : 0, id);
}

const TAG_ANCHOR: Record<string, string> = {
  spicy: "spicy",
  light: "light",
  cheap: "budget",
  near: "area",
  indoor: "weekend",
  outdoor: "weekend",
};

/** 给卡片挂上真实的记忆引用，让推荐理由可以点回记忆册 */
export function attachReason(item: Item, card: Card): Card {
  for (const t of item.tags) {
    const anchor = TAG_ANCHOR[t];
    if (!anchor) continue;
    const m = factByTag(anchor);
    if (m) return { ...card, reason: card.reason ?? m.text, reasonMemoryId: m.id };
  }
  const any = factByTag("area");
  return { ...card, reasonMemoryId: any?.id };
}

/** 冷启动结束时把画像落成第一批记忆，主动消息从此有据可依 */
export function seedFromProfile() {
  const p = kvGet("profile", null as any);
  if (!p) return;
  if (p.area) addFact({ text: `常在${p.area}一带活动`, grp: "位置", tag: "area" });
  if (p.budget) addFact({ text: `一顿饭预算大概 ${p.budget} 元`, grp: "预算", tag: "budget" });
  (p.taste ?? []).forEach((t: string) => {
    if (t.includes("辣") || t.includes("重"))
      addFact({ text: "酸辣口重的更下饭", grp: "饮食", tag: "spicy" });
    if (t.includes("清淡"))
      addFact({ text: "晚上不想吃太重的", grp: "饮食", tag: "light" });
  });
  (p.avoid ?? []).forEach((a: string) =>
    addFact({ text: `忌口：${a}`, grp: "饮食", tag: "avoid" }),
  );
  if ((p.weekend ?? []).length)
    addFact({
      text: `周末更想${p.weekend.join("、")}`,
      grp: "兴趣",
      tag: "weekend",
    });
  if (p.sleep >= "00:00" && p.sleep <= "04:00")
    addFact({
      text: "睡得晚，周末不爱早起",
      grp: "作息",
      tag: "sleep",
      source: "guess",
    });
}
