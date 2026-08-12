import { all, first, run, uid, today, kvGet } from "./db";
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
export async function addFact(f: {
  text: string;
  grp: string;
  layer?: Memory["layer"];
  tag?: string;
  source?: "said" | "guess";
  diaryId?: string;
  expiresAt?: number;
}): Promise<string> {
  const exist = await first<{ id: string; hits: number }>(
    "SELECT id,hits FROM memories WHERE type='fact' AND text=?",
    [f.text],
  );
  if (exist) {
    await run("UPDATE memories SET hits=hits+1, active=1 WHERE id=?", [exist.id]);
    return exist.id;
  }
  const id = uid("m-");
  await run(
    `INSERT INTO memories (id,type,day,grp,layer,tag,text,source,hits,diary_id,active,usable,expires_at,created_at)
     VALUES (?,'fact',?,?,?,?,?,?,1,?,1,1,?,?)`,
    [
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
    ],
  );
  return id;
}

export async function addDiary(
  text: string,
  facts: { text: string; grp: string; tag?: string; source?: "said" | "guess" }[],
): Promise<string> {
  const id = uid("dy-");
  await run(
    `INSERT INTO memories (id,type,day,grp,layer,tag,text,source,hits,active,usable,created_at)
     VALUES (?,'diary',?,'diary','episode',NULL,?, 'said',1,1,1,?)`,
    [id, today(), text, Date.now()],
  );
  for (const f of facts) await addFact({ ...f, diaryId: id, layer: "episode" });
  return id;
}

export async function listDiaries() {
  const rows = await all<Memory>(
    "SELECT * FROM memories WHERE type='diary' ORDER BY created_at DESC",
  );
  const out = [];
  for (const r of rows) {
    const chips = await all<Memory>(
      "SELECT * FROM memories WHERE diary_id=? AND active=1",
      [r.id],
    );
    out.push({ ...r, chips });
  }
  return out;
}

export async function listFacts(): Promise<Memory[]> {
  return all<Memory>(
    "SELECT * FROM memories WHERE type='fact' AND active=1 ORDER BY hits DESC, created_at DESC",
  );
}

export async function factByTag(tag: string): Promise<Memory | undefined> {
  return first<Memory>(
    "SELECT * FROM memories WHERE type='fact' AND active=1 AND usable=1 AND tag=? ORDER BY hits DESC LIMIT 1",
    [tag],
  );
}

export async function removeFact(id: string): Promise<void> {
  await run("UPDATE memories SET active=0 WHERE id=?", [id]);
}

export async function toggleUsable(id: string, usable: boolean): Promise<void> {
  await run("UPDATE memories SET usable=? WHERE id=?", [usable ? 1 : 0, id]);
}

const TAG_ANCHOR: Record<string, string> = {
  spicy: "spicy",
  light: "light",
  cheap: "budget",
  near: "area",
  indoor: "weekend",
  outdoor: "weekend",
};

/** 给卡片挂上真实的记忆引用,让推荐理由可以点回记忆册 */
export async function attachReason(item: Item, card: Card): Promise<Card> {
  for (const t of item.tags) {
    const anchor = TAG_ANCHOR[t];
    if (!anchor) continue;
    const m = await factByTag(anchor);
    if (m) return { ...card, reason: card.reason ?? m.text, reasonMemoryId: m.id };
  }
  const any = await factByTag("area");
  return { ...card, reasonMemoryId: any?.id };
}

/** 冷启动结束时把画像落成第一批记忆,主动消息从此有据可依 */
export async function seedFromProfile(): Promise<void> {
  const p = await kvGet("profile", null as any);
  if (!p) return;
  if (p.area) await addFact({ text: `常在${p.area}一带活动`, grp: "位置", tag: "area" });
  if (p.budget)
    await addFact({ text: `一顿饭预算大概 ${p.budget} 元`, grp: "预算", tag: "budget" });
  for (const t of p.taste ?? []) {
    if (t.includes("辣") || t.includes("重"))
      await addFact({ text: "酸辣口重的更下饭", grp: "饮食", tag: "spicy" });
    if (t.includes("清淡"))
      await addFact({ text: "晚上不想吃太重的", grp: "饮食", tag: "light" });
  }
  for (const a of p.avoid ?? []) {
    await addFact({ text: `忌口:${a}`, grp: "饮食", tag: "avoid" });
  }
  if ((p.weekend ?? []).length)
    await addFact({
      text: `周末更想${p.weekend.join("、")}`,
      grp: "兴趣",
      tag: "weekend",
    });
  if (p.sleep >= "00:00" && p.sleep <= "04:00")
    await addFact({
      text: "睡得晚,周末不爱早起",
      grp: "作息",
      tag: "sleep",
      source: "guess",
    });
}
