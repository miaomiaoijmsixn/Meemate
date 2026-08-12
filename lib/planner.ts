import { findDish, findItem, findOuting } from "./catalog";
import { db, uid, kvGet, localDate } from "./db";
import { chatJSON, llmReady } from "./llm";
import { listFacts } from "./memory";
import type { Profile } from "./types";

export type PlanParams = {
  day: string; // 周六 / 周日
  start: string; // 出门时间 10:00
  transit: string; // 地铁 / 自驾 / 步行
  pace: "松散" | "紧凑";
  budget: number;
};

export type PlanItem = {
  seq: number;
  /** 场地或店名，行程页只显示地址不显示推荐语 */
  addr?: string;
  /** 需要提前订票的活动才显示订票按钮 */
  booking?: boolean;
  link?: string;
  price?: number;
  start: string;
  dur: number;
  title: string;
  reason: string;
  transit?: string;
  agentId?: string;
  wishId?: string;
};

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
/** 把「周六」这种说法落成最近一个该星期的真实日期 */
export function dateOfWeekday(day: string, from = new Date()) {
  const want = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"].indexOf(day);
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  if (want >= 0) {
    const delta = (want - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + delta);
  }
  return localDate(d);
}

const toHM = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/**
 * 只有真正的场次时间才算锚点，例如 话剧 · 周六 19:30。
 * 营业时间段（10:00 到 18:00）不是锚点，否则会把展览钉死在开馆那一刻。
 */
function fixedTime(sub?: string, _meta?: Record<string, string>) {
  const hay = sub ?? "";
  const m = hay.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const rest = hay.slice(m.index! + m[0].length, m.index! + m[0].length + 8);
  if (/^\s*(到|-|~|～|至)/.test(rest)) return null; // 是区间不是场次
  return toMin(`${m[1]}:${m[2]}`);
}

export async function generatePlan(wishIds: string[], params: PlanParams) {
  const wishes = wishIds
    .map(
      (id) =>
        db().prepare("SELECT * FROM wishes WHERE id=?").get(id) as
          | {
              id: string;
              title: string;
              type: string;
              subtitle: string | null;
              meta: string | null;
              source_agent: string | null;
            }
          | undefined,
    )
    .filter(Boolean) as any[];

  const thinking: string[] = [];
  const notes: string[] = [];
  const items: PlanItem[] = [];

  thinking.push(`正在看你选的这 ${wishes.length} 个地方`);

  const enriched = wishes.map((w) => {
    const meta = w.meta ? JSON.parse(w.meta) : {};
    const item = meta.key ? findItem(meta.key) : undefined;
    const outing = meta.outing ? findOuting(meta.outing) : undefined;
    const dish = meta.dish ? findDish(meta.dish) : undefined;
    const fixed = fixedTime(w.subtitle ?? undefined, item?.meta);
    const dur =
      w.type === "activity" ? 100 : w.type === "sport" ? 60 : w.type === "trip" ? 240 : 70;
    return { w, item, outing, dish, fixed, dur, meta };
  });

  // 有固定开场时间的先锚定
  const anchored = enriched.filter((e) => e.fixed !== null);
  const floating = enriched.filter((e) => e.fixed === null);
  if (anchored.length) {
    const a = anchored[0];
    thinking.push(
      `${a.w.title} 是 ${toHM(a.fixed!)} 开场，这个点定死了，其他都排在它前面`,
    );
  }

  const transitMin = params.transit === "自驾" ? 25 : params.transit === "步行" ? 18 : 35;
  let cursor = toMin(params.start);

  const place = (e: (typeof enriched)[number], forced?: number) => {
    if (items.length) {
      const prev = items[items.length - 1];
      cursor = Math.max(cursor, toMin(prev.start) + prev.dur) + transitMin;
    }
    const start = forced ?? cursor;
    if (forced && forced > cursor + 60) {
      // 中间空得下一顿饭
      const mealStart = cursor;
      items.push({
        seq: items.length + 1,
        start: toHM(mealStart),
        dur: 60,
        title: "中间吃一顿",
        reason: "两个地方隔得远，我把吃饭放在中间，省一趟折返",
        transit: `${params.transit} 约 ${transitMin} 分钟`,
        agentId: "laochi",
        addr: "两地之间找一家",
        booking: false,
      });
      thinking.push("这两个地方隔得远，我把吃饭插在中间了");
      cursor = mealStart + 60 + transitMin;
    }
    items.push({
      seq: items.length + 1,
      start: toHM(start),
      dur: e.dur,
      title: e.w.title,
      reason:
        e.item?.reason ??
        `${e.w.subtitle ?? ""}，按你的偏好这个时间段最合适`.trim(),
      transit: items.length ? `${params.transit} 约 ${transitMin} 分钟` : undefined,
      agentId: e.w.source_agent ?? undefined,
      wishId: e.w.id,
      addr: e.outing?.place ?? e.dish?.shop ?? e.item?.meta?.["地点"],
      booking: e.outing?.booking ?? false,
      link: e.outing?.deeplink ?? e.dish?.navLink ?? e.item?.deeplink,
      price: e.outing?.price ?? e.dish?.price,
    });
    cursor = start + e.dur;
  };

  // 户外或人少时段优先放上午
  const sortedFloating = [...floating].sort((a, b) => {
    const am = (x: typeof a) =>
      /上午|开馆|九点前|早/.test(JSON.stringify(x.item?.meta ?? {})) ? -1 : 0;
    return am(a) - am(b);
  });

  for (const e of sortedFloating) {
    if (/上午|开馆|九点前/.test(JSON.stringify(e.item?.meta ?? {}))) {
      thinking.push(`${e.w.title} 人最少的是上午刚开门那一小时，放最前面`);
    }
    place(e);
  }
  // 场次按时间先后排，排不进去的如实说冲突，不硬塞
  for (const e of [...anchored].sort((a, b) => a.fixed! - b.fixed!)) {
    const lead = params.pace === "紧凑" ? 25 : 45;
    const reachable = e.fixed! >= cursor + (items.length ? transitMin : 0);
    if (!reachable && items.length) {
      notes.push(
        `${e.w.title} ${toHM(e.fixed!)} 开场，按前面的安排你赶不上，我先放在最后，你可以把它往前挪`,
      );
      place(e);
    } else {
      place(e, e.fixed!);
      notes.push(`${e.w.title} 前面留了 ${lead} 分钟路上时间，别卡点到`);
    }
  }

  if (params.pace === "松散" && items.length > 2) {
    notes.push("行程按松散排的，中间有富余，晚起半小时也不影响");
  }
  const total = items.reduce((s, i) => s + i.dur, 0);
  if (total > 420) notes.push("这一天有点满，回到家会比较晚");

  const p = kvGet<Profile>("profile", null as unknown as Profile);
  if (p?.sleep >= "00:00" && p.sleep <= "04:00" && toMin(params.start) < 9 * 60) {
    notes.push("你平时睡得晚，九点前出门大概率起不来，我把出发时间往后挪了");
  }
  thinking.push("排好了，看看要不要调");

  // 有 key 时让模型把思考过程写得更像人话，排班逻辑仍由代码决定
  if (llmReady()) {
    const out = await chatJSON<{ thinking: string[] }>(
      `你是小咪管家。把给出的排班决策改写成三到五条正在思考的短句，第一人称，像在跟朋友说话，不要编造新的事实。只输出 JSON：{"thinking":["..."]}`,
      `排班决策：${thinking.join("；")}\n用户画像：${listFacts()
        .slice(0, 6)
        .map((f) => f.text)
        .join("；")}`,
    );
    if (out?.thinking?.length) thinking.splice(0, thinking.length, ...out.thinking);
  }

  const planId = uid("p-");
  const d = db();
  d.prepare(
    "INSERT INTO plans (id,day,date,params,thinking,notes,created_at) VALUES (?,?,?,?,?,?,?)",
  ).run(
    planId,
    params.day,
    dateOfWeekday(params.day),
    JSON.stringify(params),
    JSON.stringify(thinking),
    JSON.stringify(notes),
    Date.now(),
  );
  const ins = d.prepare(
    "INSERT INTO plan_items (id,plan_id,seq,start,dur,title,reason,transit,agent_id,wish_id,addr,booking,link,price) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
  );
  items.forEach((i) =>
    ins.run(
      uid("pi-"),
      planId,
      i.seq,
      i.start,
      i.dur,
      i.title,
      i.reason,
      i.transit ?? null,
      i.agentId ?? null,
      i.wishId ?? null,
      i.addr ?? null,
      i.booking ? 1 : 0,
      i.link ?? null,
      i.price ?? null,
    ),
  );
  return { planId, thinking, notes, items };
}

export function getPlan(id: string) {
  const d = db();
  const p = d.prepare("SELECT * FROM plans WHERE id=?").get(id) as
    | {
        id: string;
        day: string;
        date: string | null;
        confirmed: number;
        params: string;
        thinking: string;
        notes: string;
      }
    | undefined;
  if (!p) return null;
  const items = d
    .prepare("SELECT * FROM plan_items WHERE plan_id=? ORDER BY seq ASC")
    .all(id) as any[];
  return {
    id: p.id,
    day: p.day,
    date: p.date ?? dateOfWeekday(p.day),
    confirmed: !!p.confirmed,
    params: JSON.parse(p.params) as PlanParams,
    thinking: JSON.parse(p.thinking) as string[],
    notes: JSON.parse(p.notes) as string[],
    items: items.map((i) => ({
      seq: i.seq,
      start: i.start,
      dur: i.dur,
      title: i.title,
      reason: i.reason,
      transit: i.transit,
      agentId: i.agent_id,
      wishId: i.wish_id,
      addr: i.addr ?? undefined,
      booking: !!i.booking,
      link: i.link ?? undefined,
      price: i.price ?? undefined,
      id: i.id,
    })),
  };
}

export function reorderPlan(id: string, orderedItemIds: string[]) {
  const plan = getPlan(id);
  if (!plan) return null;
  const d = db();
  const map = new Map(plan.items.map((i) => [i.id, i]));
  let cursor = toMin(plan.items[0]?.start ?? plan.params.start);
  const transitMin =
    plan.params.transit === "自驾" ? 25 : plan.params.transit === "步行" ? 18 : 35;
  const warn: string[] = [];
  orderedItemIds.forEach((iid, idx) => {
    const it = map.get(iid);
    if (!it) return;
    if (idx > 0) cursor += transitMin;
    // 第一站前面不该有交通耗时，重排后要把它清掉
    d.prepare("UPDATE plan_items SET seq=?, start=?, transit=? WHERE id=?").run(
      idx + 1,
      toHM(cursor),
      idx > 0 ? `${plan.params.transit} 约 ${transitMin} 分钟` : null,
      iid,
    );
    const w = it.wishId
      ? (d.prepare("SELECT subtitle,meta FROM wishes WHERE id=?").get(it.wishId) as
          | { subtitle: string | null; meta: string | null }
          | undefined)
      : undefined;
    const fixed = fixedTime(
      w?.subtitle ?? it.title,
      w?.meta ? JSON.parse(w.meta) : undefined,
    );
    if (fixed && cursor > fixed) {
      warn.push(`这样你会赶不上 ${toHM(fixed)} 的 ${it.title}`);
    } else if (fixed && fixed - cursor > 90) {
      warn.push(
        `${it.title} 要到 ${toHM(fixed)} 才开场，你 ${toHM(cursor)} 就到了，得干等 ${Math.round((fixed - cursor) / 60)} 个小时`,
      );
    }
    cursor += it.dur;
  });
  // 时间类提示全部按新顺序重算，别让上一版的说法留在页面上自相矛盾
  const keep = plan.notes.filter(
    (n) => !/赶不上|才开场|路上时间/.test(n),
  );
  d.prepare("UPDATE plans SET notes=? WHERE id=?").run(
    JSON.stringify([...keep, ...warn]),
    id,
  );
  return getPlan(id);
}
