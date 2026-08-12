import { AGENTS } from "./agents";
import {
  CATALOG,
  findDish,
  findItem,
  findOuting,
  type Dish,
  type Item,
  type Outing,
} from "./catalog";
import { db, kvGet, today, uid } from "./db";
import { chatJSON, llmReady } from "./llm";
import { attachReason, factByTag, listFacts, addFact } from "./memory";
import { markShown, shownKeys } from "./outbox";
import {
  SLOT_CATS,
  SLOT_LABEL,
  filterDishes,
  filterOutings,
  slotOf,
  type Slot,
} from "./prefs";
import type { Beat, Card, Profile, RecoItem, TriggerKind } from "./types";

export function logEvent(kind: string, text: string, tag?: string) {
  db()
    .prepare("INSERT INTO events (id,kind,text,tag,created_at) VALUES (?,?,?,?,?)")
    .run(uid("e-"), kind, text, tag ?? null, Date.now());
}

export function todayEvents() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return db()
    .prepare("SELECT * FROM events WHERE created_at>=? ORDER BY created_at ASC")
    .all(start.getTime()) as { kind: string; text: string; tag: string | null }[];
}

export function toCard(item: Item): Card {
  const base: Card = {
    id: item.key,
    kind: item.kind,
    title: item.title,
    subtitle: item.subtitle,
    reason: item.reason,
    meta: item.meta,
    body: item.body,
    price: item.price,
    distance: item.distance,
    eta: item.eta,
    deeplink: item.deeplink,
    platform: item.platform,
    tags: item.tags,
    emoji: item.emoji,
    hue: item.hue,
  };
  return attachReason(item, base);
}

/** 按画像与忌口挑内容，排除已经推过的和被拒过的 */
export function pick(
  kind: Item["kind"],
  opts: { n?: number; exclude?: string[]; drop?: string[] } = {},
) {
  const p = kvGet<Profile>("profile", null as unknown as Profile);
  const shown = new Set([...(opts.exclude ?? []), ...shownKeys()]);
  const drop = new Set(opts.drop ?? []);
  const cheapOnly = drop.has("贵");
  const nearOnly = drop.has("远");
  let pool = CATALOG.filter((i) => i.kind === kind);
  const fit = (i: Item) => {
    if (drop.has("辣") && i.tags.includes("spicy")) return false;
    if (cheapOnly && i.costly) return false;
    if (nearOnly && i.far) return false;
    if (p?.avoid?.some((a) => i.title.includes(a) || i.subtitle?.includes(a)))
      return false;
    return true;
  };
  let out = pool.filter((i) => fit(i) && !shown.has(i.key));
  if (!out.length) out = pool.filter(fit); // 内容池小，兜底允许重复
  if (!out.length) out = pool;
  // 命中画像标签的排前面
  const want = new Set<string>();
  if (factByTag("spicy")) want.add("spicy");
  if (factByTag("light")) want.add("light");
  out = [...out].sort(
    (a, b) =>
      b.tags.filter((t) => want.has(t)).length -
      a.tags.filter((t) => want.has(t)).length,
  );
  return out.slice(0, opts.n ?? 1);
}

const hour = () => new Date().getHours();

// ---------------------------------------------------------------- 主动话题

function mealBeats(kind: "lunch" | "dinner"): Beat[] {
  const isLunch = kind === "lunch";
  const slot = isLunch ? "noon" : "evening";
  // 主动推送里人格是价值：两个人一来一回，但只出一张清单卡，别让用户看不过来
  const { list } = filterDishes("g-eat", { exclude: shownRecoKeys("g-eat") });
  const picked = [...list].sort((a, b) => b.rating - a.rating).slice(0, 3);
  const items = picked.map(dishToReco);
  return [
    {
      speaker: "waimai",
      text: isLunch
        ? "十一点二十啦，再拖下去好评的店就要排队了 🛵"
        : "五点四十了，今天这个点还没吃是打算硬扛？👀",
      gapMs: 440,
    },
    {
      speaker: "laochi",
      text: isLunch
        ? "我跟你讲，楼下走八分钟就有现炒的，何必吃盒子里的东西"
        : "你别急着劝人点外卖；这个点出门正好，锅气这东西外卖送不来",
      gapMs: 500,
    },
    {
      speaker: "waimai",
      text: "行行行，我把能到店也能送的都摆一块儿，你自己挑",
      cards: [
        {
          id: `reco-${slot}-${uid()}`,
          kind: "recoList",
          title: isLunch ? "中午这三个都行" : "晚饭这三个都行",
          subtitle: "能到店的标了导航，能送的标了下单",
          items,
          meta: { slot },
        },
      ],
      gapMs: 520,
    },
    {
      speaker: "waimai",
      text: "挑一个？不然你又要刷半小时",
      mention: true,
      chips: ["就第一个", "太贵了", "想吃辣的", "我出门吃"],
    },
  ];
}

function weekendBeats(): Beat[] {
  const ex = shownRecoKeys("g-weekend");
  const { list } = filterOutings("g-weekend", { exclude: ex });
  const byAgent = (who: string) =>
    [...list].filter((o) => o.by === who).sort((a, b) => b.rating - a.rating)[0];
  const picked = [byAgent("jingshen"), byAgent("majiaxian"), byAgent("lvyou")].filter(Boolean);
  return [
    {
      speaker: "jingshen",
      text: "周四了 ✨ 这周你说的话有点多——我给你留了个不用讲话的地方",
      gapMs: 520,
    },
    {
      speaker: "majiaxian",
      text: "先别急着坐着不动啊，我这儿也有一个（强度不高，放心）💪",
      gapMs: 520,
    },
    {
      speaker: "lvyou",
      text: "想走远点的话我也备了一个。三个都在下面，你自己看 🧭",
      cards: [
        {
          id: `reco-weekend-${uid()}`,
          kind: "recoList",
          title: "周末三个方向",
          subtitle: "一个静的、一个动的、一个远的",
          items: picked.map(outingToReco),
          meta: { slot: "weekend" },
        },
      ],
      gapMs: 520,
    },
    {
      speaker: "jingshen",
      text: "不用现在定。先丢进清单，周五再挑也来得及",
      mention: true,
      chips: ["都加进清单", "只想宅着", "想去远一点的"],
    },
  ];
}

function morningBeats(): Beat[] {
  const todos = db()
    .prepare("SELECT title FROM todos WHERE done=0 ORDER BY created_at DESC LIMIT 3")
    .all() as { title: string }[];
  const card: Card = {
    id: uid("c-"),
    kind: "morning",
    title: `${new Date().getMonth() + 1} 月 ${new Date().getDate()} 日`,
    subtitle: "多云转晴 26 度，风不大",
    meta: { 待办: todos.length ? `${todos.length} 件没做` : "今天是空的" },
    body: todos.length ? todos.map((t) => t.title) : ["今天没安排，想加点什么跟我说"],
    reason: factByTag("sleep")?.text ?? undefined,
  };
  return [
    { speaker: "mimi", text: "早呀 ☁️", gapMs: 380 },
    {
      speaker: "mimi",
      text: "今天的东西都在这儿了",
      cards: [card],
      gapMs: 460,
    },
    { speaker: "mimi", text: "先去洗脸，别躺着刷手机喵" },
  ];
}

const DIARY_SYS = `你是小咪管家，用户的 AI 秘书。任务是给用户写今天的日记。
要求：三到五句短句，偏事实、少抒情，先写做了什么，再写一句你的观察，最后可以有一句关心，止于此。
语气是温柔的橘猫管家：句尾可以用「呀」「啦」，全篇最多一个 emoji（☁️ 🌙 🐾 里选一个），不写鸡汤，不用感叹号堆情绪。
同时从今天的事里抽取 1 到 3 条可长期使用的偏好记忆。
只输出 JSON：{"diary":"...","facts":[{"text":"...","grp":"饮食|预算|位置|作息|兴趣|近况","tag":"spicy|light|budget|area|weekend|sleep|null","source":"said|guess"}]}`;

export async function diaryBeats(): Promise<{ beats: Beat[]; diary: string; facts: any[] }> {
  const ev = todayEvents();
  const lines = ev.length
    ? ev.map((e) => `- ${e.text}`).join("\n")
    : "- 今天没什么动作，只是聊了几句";
  let diary =
    ev.length > 0
      ? `今天${ev.map((e) => e.text).slice(0, 3).join("，")}。` +
        "剩下的时间都在屏幕前。看起来你今天还是把吃饭排在最后一位。早点睡。"
      : "今天没怎么出门，也没吃上正经饭。你说话比平常少。明天有空我们出去走一圈。";
  let facts: { text: string; grp: string; tag?: string; source?: "said" | "guess" }[] =
    ev
      .filter((e) => e.tag)
      .slice(0, 2)
      .map((e) => ({
        text: e.text,
        grp: "饮食",
        tag: e.tag ?? undefined,
        source: "guess" as const,
      }));

  if (llmReady()) {
    const out = await chatJSON<{ diary: string; facts: typeof facts }>(
      DIARY_SYS,
      `今天发生的事：\n${lines}\n\n已知的用户画像：${listFacts()
        .slice(0, 8)
        .map((f) => f.text)
        .join("；")}`,
    );
    if (out?.diary) {
      diary = out.diary;
      facts = (out.facts ?? []).filter((f) => f?.text);
    }
  }

  const card: Card = {
    id: uid("c-"),
    kind: "diary",
    title: `${new Date().getMonth() + 1} 月 ${new Date().getDate()} 日`,
    subtitle: "今天的日记",
    body: diary.split(/(?<=。)/).filter(Boolean),
    meta: { 动作: `${ev.length} 件` },
  };
  return {
    beats: [
      { speaker: "mimi", text: "今天就到这儿吧 🌙", gapMs: 420 },
      { speaker: "mimi", text: "我按今天的事写了几句，你看看对不对呀", cards: [card], gapMs: 460 },
      { speaker: "mimi", text: "有想补的直接在上面写，我把记忆改掉 🐾" },
    ],
    diary,
    facts,
  };
}

/* ============================================================
   进群策略：点进群先给结论，不先寒暄。
   三条消息 = 问候语 + 今日推荐（3 条，带下单或导航）+ 想再多看看。
   小咪在群里当主人，每条推荐挂上真正找到它的那个 agent 的头像，
   人格层不丢，信息密度上来。
   ============================================================ */


/* ============================================================
   进群策略：点进群先给结论，不先寒暄。
   三条消息 = 问候语 + 今日推荐 + 想再多看看，末尾留一个问句和快捷回复，
   让用户有明确的一手可接，而不是被一堆卡片盖住。
   每条推荐都标出是谁挑的，人格层不丢。
   ============================================================ */

export function dishToReco(d: Dish): RecoItem {
  return {
    key: d.key,
    dish: d.dish,
    shop: d.shop,
    price: d.price,
    walk: d.walkM >= 1000 ? `${(d.walkM / 1000).toFixed(1)} 公里` : `${d.walkM} 米`,
    eta: d.eta ? `${d.eta} 分钟送达` : undefined,
    reason: d.reason,
    emoji: d.emoji,
    hue: d.hue,
    by: d.by,
    canNav: d.dine,
    canOrder: d.deliver,
    orderPlatform: d.orderPlatform,
    cat: d.cat,
  };
}

export function outingToReco(o: Outing): RecoItem {
  return {
    key: o.key,
    dish: o.name,
    shop: o.place,
    price: o.price,
    walk: o.travel,
    eta: o.dur >= 60 ? `${Math.round((o.dur / 60) * 10) / 10} 小时` : `${o.dur} 分钟`,
    reason: o.reason,
    emoji: o.emoji,
    hue: o.hue,
    by: o.by,
    canNav: true,
    canOrder: o.booking,
    orderPlatform: o.platform,
    cat: o.cat,
  };
}

/** 这个群里已经推过的东西，换一批时排除掉 */
export function shownRecoKeys(conversationId: string) {
  const rows = db()
    .prepare(
      "SELECT payload FROM messages WHERE conversation_id=? AND kind='cards' AND payload LIKE ?",
    )
    .all(conversationId, '%"recoList"%') as { payload: string }[];
  const keys = new Set<string>();
  for (const r of rows) {
    try {
      for (const c of JSON.parse(r.payload) as Card[])
        for (const i of c.items ?? []) keys.add(i.key);
    } catch {}
  }
  return [...keys];
}
export const shownDishKeys = shownRecoKeys;

/** 这个时段是不是已经给过今日推荐了，避免每次点进来都刷一遍 */
export function hasEntrySet(conversationId: string, slot: string) {
  const r = db()
    .prepare(
      `SELECT count(*) n FROM messages
       WHERE conversation_id=? AND kind='cards' AND payload LIKE ? AND payload LIKE ?`,
    )
    .get(conversationId, '%"recoList"%', `%"slot":"${slot}"%`) as { n: number };
  return r.n > 0;
}

/* ---------------- 吃什么 ---------------- */

const EAT_GREETING: Record<Slot, string> = {
  morning: "早安呀 ☁️ 新的一天从香喷喷的早餐开始，今天想吃点什么垫垫肚子？",
  noon: "中午干饭时间到！想吃点什么犒劳自己呀",
  afternoon: "下午啦，来点甜的还是垫一口咸的？离晚饭还早，别吃太撑喵",
  evening: "晚上好呀，这顿别将就。今天想吃点什么？",
  late: "这个点还没吃？来点热的，别硬扛着 🐾",
};

const EAT_ASK: Record<Slot, string> = {
  morning: "挑一个？不想吃这些也直说，我再翻",
  noon: "看上哪个了？说一声我就记住你今天的口味",
  afternoon: "要哪个？不饿的话我就不吵你了",
  evening: "选一个吧，不然你又要刷半小时",
  late: "随便挑一个，吃完早点睡",
};

export function eatEntryBeats(): Beat[] {
  const slot = slotOf();
  const cats = SLOT_CATS[slot];
  const picked: Dish[] = [];
  const best = (l: Dish[]) => [...l].sort((a, b) => b.rating - a.rating)[0];

  // 1 先按时段优先的类型挑，只收严格符合偏好的
  for (const c of cats) {
    const { list, relaxed } = filterDishes("g-eat", {
      cat: c,
      exclude: picked.map((p) => p.key),
    });
    if (!relaxed && list.length) picked.push(best(list));
    if (picked.length >= 3) break;
  }
  // 2 不够就在全类型里补，仍然只要严格符合的
  if (picked.length < 3) {
    const { list, relaxed } = filterDishes("g-eat", { exclude: picked.map((p) => p.key) });
    if (!relaxed)
      picked.push(...[...list].sort((a, b) => b.rating - a.rating).slice(0, 3 - picked.length));
  }
  // 3 还不够才放宽，并在卡上如实说明
  let relaxed = false;
  if (picked.length < 3) {
    relaxed = true;
    const { list } = filterDishes("g-eat", { exclude: picked.map((p) => p.key) });
    picked.push(...[...list].sort((a, b) => b.rating - a.rating).slice(0, 3 - picked.length));
  }

  const items = picked.slice(0, 3).map(dishToReco);
  const card: Card = {
    id: `reco-${slot}-${uid()}`,
    kind: "recoList",
    title: `${SLOT_LABEL[slot]}给你挑了 ${items.length} 个`,
    subtitle: "按你顶上那几个偏好筛过的",
    items,
    relaxed,
    meta: { slot },
  };

  return [
    { speaker: "mimi", text: EAT_GREETING[slot], gapMs: 620 },
    { speaker: "mimi", cards: [card], gapMs: 560 },
    {
      speaker: "mimi",
      text: EAT_ASK[slot],
      cards: [{ id: `more-${uid()}`, kind: "action", title: "想再多看看", label: "打开菜单" }],
      mention: true,
      chips: ["就第一个", "太贵了", "想吃辣的", "都不想"],
    },
  ];
}

/* ---------------- 周末去哪 ---------------- */

const WEEKEND_GREETING: Record<Slot, string> = {
  morning: "早安呀 ☁️ 今天要是不想窝着，我这儿有几个不费劲的去处",
  noon: "中午好，趁着还有半天，下午出门走走？",
  afternoon: "下午啦，现在出门刚好赶上人少的时候",
  evening: "晚上好呀，明天的安排要不要现在就定下来？",
  late: "这个点适合定计划，不适合出门。明天想干点什么喵",
};

export function weekendEntryBeats(): Beat[] {
  const slot = slotOf();
  const ex = shownRecoKeys("g-weekend");
  const picked: Outing[] = [];
  let relaxed = false;
  // 一个静的、一个动的、一个远的：正好对应三个 agent，谁挑的一目了然
  for (const who of ["jingshen", "majiaxian", "lvyou"]) {
    const { list, relaxed: r } = filterOutings("g-weekend", {
      exclude: [...ex, ...picked.map((p) => p.key)],
    });
    const mine = list.filter((o) => o.by === who);
    const pool = mine.length ? mine : [];
    if (pool.length) {
      picked.push([...pool].sort((a, b) => b.rating - a.rating)[0]);
      relaxed = relaxed || r;
    }
  }
  // 三个 agent 里有人挑不出来，就从全池补齐到 3 个
  if (picked.length < 3) {
    const { list, relaxed: r } = filterOutings("g-weekend", {
      exclude: [...ex, ...picked.map((p) => p.key)],
    });
    relaxed = relaxed || r;
    picked.push(...[...list].sort((a, b) => b.rating - a.rating).slice(0, 3 - picked.length));
  }

  const items = picked.slice(0, 3).map(outingToReco);
  return [
    { speaker: "mimi", text: WEEKEND_GREETING[slot], gapMs: 620 },
    {
      speaker: "mimi",
      cards: [
        {
          id: `reco-${slot}-${uid()}`,
          kind: "recoList",
          title: `周末挑了 ${items.length} 个`,
          subtitle: "一个静的、一个动的、一个远的",
          items,
          relaxed,
          meta: { slot },
        },
      ],
      gapMs: 560,
    },
    {
      speaker: "mimi",
      text: "先扔进清单就行，不用现在定。挑好了我给你排时间 🐾",
      cards: [{ id: `more-${uid()}`, kind: "action", title: "想再多看看", label: "打开清单" }],
      mention: true,
      chips: ["都加进清单", "只想宅着", "想去远一点的"],
    },
  ];
}

export function entryBeats(conversationId: string) {
  if (conversationId === "g-eat") return eatEntryBeats();
  if (conversationId === "g-weekend") return weekendEntryBeats();
  return [];
}

/* ---------------- 同品类相似推荐 ---------------- */

/**
 * 相似推荐：至少 3 个，且必须同品类（甜品换甜品，展览换展览）。
 * 同品类里凑不够就如实说，不跨品类硬凑。
 */
export function similarBeats(conversationId: string, key: string): Beat[] {
  const ex = shownRecoKeys(conversationId);
  const isEat = conversationId === "g-eat";
  const src = isEat ? findDish(key) : findOuting(key);
  if (!src) return [];
  const cat = src.cat;
  const by = src.by;
  const label = isEat ? "道" : "个";

  // 品类是硬约束，凑不够 3 个就依次放宽：先允许推过的、再放宽标签，但绝不换品类
  const run = (exclude: string[], minCount: number) =>
    isEat
      ? filterDishes(conversationId, { cat, exclude, minCount })
      : filterOutings(conversationId, { cat, exclude, minCount });
  const gather = () => {
    const a = run([key, ...ex], 3);
    if (a.list.length >= 3) return { list: a.list.slice(0, 3), relaxed: a.relaxed };
    // 池子小的时候会把推过的拿回来凑数，那就让没见过的排前面
    const b = run([key], 3);
    const seen = new Set(ex);
    const sorted = [...b.list].sort(
      (x: any, y: any) => Number(seen.has(x.key)) - Number(seen.has(y.key)),
    );
    return { list: sorted.slice(0, 3), relaxed: b.relaxed };
  };
  const { list, relaxed } = gather();
  const items = list.map((x: any) => (isEat ? dishToReco(x) : outingToReco(x)));

  if (!items.length)
    return [
      {
        speaker: by,
        text: `${cat}这一类里，按你现在的偏好只有刚那个了。把价格放宽一点或者去掉一个标签？`,
      },
    ];

  const lead = AGENTS[by];
  const line =
    items.length < 3
      ? `同是${cat}的就剩这 ${items.length} ${label}了，别的都不在你的偏好里`
      : lead?.emojiUse === "none"
        ? `不喜欢那个？同样是${cat}，这几个也拿得出手`
        : `不喜欢那个就换 👀 同是${cat}，这 3 ${label}也行`;

  return [
    { speaker: by, text: line, gapMs: 480 },
    {
      speaker: by,
      cards: [
        {
          id: `sim-${uid()}`,
          kind: "recoList",
          title: `同是${cat}`,
          subtitle: `跟刚那个一个类型 · ${items.length} ${label}`,
          items,
          relaxed,
        },
      ],
    },
  ];
}



export async function triggerBeats(kind: TriggerKind) {
  switch (kind) {
    case "lunch":
      return { conversationId: "g-eat", beats: mealBeats("lunch") };
    case "dinner":
      return { conversationId: "g-eat", beats: mealBeats("dinner") };
    case "weekend":
      return { conversationId: "g-weekend", beats: weekendBeats() };
    case "morning":
      return { conversationId: "c-mimi", beats: morningBeats() };
    case "diary": {
      const { beats } = await diaryBeats();
      return { conversationId: "c-mimi", beats };
    }
  }
}

// ---------------------------------------------------------------- 反应

/** 点了不感兴趣并给了原因，发卡的 agent 追问一句并换一张 */
export function replaceBeats(agentId: string, kind: Item["kind"], reason: string): Beat[] {
  const next = pick(kind, { drop: [reason], n: 1 });
  markShown(next.map((i) => i.key), "g-eat");
  const line: Record<string, string> = {
    贵: "行，那我按你平时的价位来",
    辣: "不吃辣就早说啊，我记住了",
    远: "太远就算了，给你换个近的",
    吃过了: "吃过了那没意思，换一个",
  };
  addFact({
    text:
      reason === "贵"
        ? "预算敏感，超过日常价位的会拒"
        : reason === "辣"
          ? "这段时间不想吃辣"
          : reason === "远"
            ? "不愿意为吃饭跑远"
            : "重复的店不想再吃",
    grp: reason === "贵" ? "预算" : "饮食",
    tag: reason === "贵" ? "budget" : reason === "辣" ? "light" : undefined,
    source: "guess",
  });
  logEvent("reject", `拒了一个推荐，原因是${reason}`, reason === "贵" ? "budget" : undefined);
  return [
    { speaker: agentId, text: line[reason] ?? "行，换一个", gapMs: 420 },
    { speaker: agentId, text: "这个呢", cards: next.map(toCard) },
  ];
}

/** 加入清单后发卡的人回一句 */
export function wishAckBeats(agentId: string, title: string): Beat[] {
  return [
    {
      speaker: agentId,
      text: `《${title}》放进你的清单了，周五让小咪一起排`,
    },
  ];
}

/** 跳转外部平台时留的钩子 */
export function handoffBeats(agentId: string, title: string, kind: string): Beat[] {
  const t =
    kind === "restaurant"
      ? "到了跟我说好不好吃，我记一笔"
      : kind === "delivery"
        ? "吃完回来说一句，下次我照这个口径推"
        : "去了拍张图给我，我写进今天的日记";
  return [
    { speaker: agentId, text: `${title}，去吧`, gapMs: 400 },
    { speaker: agentId, text: t },
  ];
}

const REPLY_SYS = `你在一个 iMessage 风格的聊天产品里扮演 AI 朋友，回复用户。
硬性要求：
1 只输出 JSON：{"beats":[{"speaker":"<agent id>","text":"...","gapMs":500,"mention":false,"chips":["..."],"cardKey":"<可选，从候选内容里选一个 key>"}]}
2 一次回复拆成 2 到 4 拍，每拍一句短话，像真人分开发消息。不要在一拍里塞一整段。
3 严格按每个 agent 的语言指纹说话，不同 agent 风格必须能分辨。
4 群聊里默认只让一个 agent 回复用户，读起来要像"回了一句"而不是几个人同时冒出来。只有用户明确问了两个人，才让第二个接一句。
4b 每个 agent 的 emoji 用量按它的人设来：有人一个都不用（这是他的脾气），有人爱用。不要所有人都一样。
5 不编造不存在的店铺或活动。要给具体推荐时，只能从候选内容里挑 cardKey。
6 不用感叹号堆情绪，不说作为AI之类的话。`;

export async function respondBeats(
  conversationId: string,
  userText: string,
): Promise<Beat[]> {
  const conv = db()
    .prepare("SELECT * FROM conversations WHERE id=?")
    .get(conversationId) as
    | { id: string; kind: string; agent_id: string | null; members: string }
    | undefined;
  if (!conv) return [];
  const members: string[] =
    conv.kind === "single" ? [conv.agent_id!] : JSON.parse(conv.members);

  logEvent("chat", `跟${members.map((m) => AGENTS[m].name).join("、")}说了：${userText}`);

  // @ 点名了谁，就只由谁回答
  const mentioned = members.find(
    (m) =>
      userText.includes(`@${AGENTS[m].short}`) || userText.includes(`@${AGENTS[m].name}`),
  );
  const responders = mentioned ? [mentioned] : members;

  if (llmReady()) {
    const recent = db()
      .prepare(
        `SELECT sender,text FROM messages WHERE conversation_id=? AND deliver_at<=?
         ORDER BY seq DESC LIMIT 8`,
      )
      .all(conversationId, Date.now()) as { sender: string; text: string | null }[];
    const cands = CATALOG.filter((i) =>
      members.some((m) => AGENTS[m].domain.includes(i.kind)),
    ).slice(0, 12);
    const out = await chatJSON<{ beats: (Beat & { cardKey?: string })[] }>(
      REPLY_SYS,
      [
        `场景：${conv.kind === "single" ? "单聊" : "群聊"}`,
        `在场的 agent：`,
        ...members.map(
          (m) =>
            `- ${m}（${AGENTS[m].name}，${AGENTS[m].role}）语言指纹：${AGENTS[m].voice}`,
        ),
        `用户画像与记忆：${listFacts().slice(0, 10).map((f) => f.text).join("；") || "还很少"}`,
        `候选内容：${cands.map((c) => `${c.key}=${c.title}`).join("；")}`,
        `最近的对话（倒序）：${recent
          .map((r) => `${r.sender}: ${r.text ?? "[卡片]"}`)
          .join(" / ")}`,
        mentioned
          ? `用户点名了 ${AGENTS[mentioned].name}，这一轮必须只由他回复。`
          : "用户没有点名，只让最相关的那一个回复。",
        `用户刚说：${userText}`,
      ].join("\n"),
    );
    if (out?.beats?.length) {
      return out.beats
        .filter((b) => responders.includes(b.speaker))
        .slice(0, 4)
        .map((b) => {
          const item = b.cardKey ? findItem(b.cardKey) : undefined;
          return {
            speaker: b.speaker,
            text: b.text,
            gapMs: b.gapMs ?? 520,
            mention: b.mention,
            chips: b.chips,
            cards: item ? [toCard(item)] : undefined,
          } satisfies Beat;
        });
    }
  }
  return ruleReply(responders, userText);
}

/**
 * 没有 key 时的规则回复。两条硬规则：
 * 1 一次只让一个人接话，读起来才像回复而不是几个人同时冒出来
 * 2 每个人按自己的语言指纹说话，emoji 用量也是人设的一部分
 */
function ruleReply(members: string[], text: string): Beat[] {
  const has = (...k: string[]) => k.some((x) => text.includes(x));
  const pickWho = (want: string) => (members.includes(want) ? want : members[0]);
  const isEat = members.includes("waimai") || members.includes("laochi");

  const dishCard = (opts: { cat?: string; serve?: any } = {}, who: string, title: string) => {
    const { list } = filterDishes("g-eat", { ...opts, exclude: shownRecoKeys("g-eat") });
    const items = [...list].sort((a, b) => b.rating - a.rating).slice(0, 3).map(dishToReco);
    return {
      id: `reco-${uid()}`,
      kind: "recoList" as const,
      title,
      subtitle: `${AGENTS[who]?.short}按你的偏好筛的`,
      items,
    };
  };

  // 价格
  if (has("贵", "便宜", "省", "穷")) {
    const who = pickWho("waimai");
    return [
      { speaker: who, text: "懂了，钱要紧 💸 我按你平时的价位来", gapMs: 460 },
      { speaker: who, cards: [dishCard({}, who, "便宜好吃的三个")] },
    ];
  }
  // 口味
  if (has("辣", "清淡", "减脂", "油")) {
    const light = has("清淡", "减脂", "油");
    const who = pickWho("waimai");
    addFact({
      text: light ? "这段时间想吃清淡的" : "现在想吃辣的",
      grp: "近况",
      tag: light ? "light" : "spicy",
      source: "said",
    });
    return [
      { speaker: who, text: light ? "行，把重口的放一边 🥗" : "要辣的是吧，那我不客气了 🔥", gapMs: 440 },
      { speaker: who, cards: [dishCard({ cat: light ? "轻食" : "川湘" }, who, light ? "清淡的三个" : "够辣的三个")] },
    ];
  }
  // 想出门
  if (has("出门", "到店", "去店", "堂食")) {
    const who = pickWho("laochi");
    return [
      { speaker: who, text: "这就对了。我跟你讲，坐下来吃跟塑料盒里刨是两件事", gapMs: 520 },
      { speaker: who, cards: [dishCard({ serve: "dine" }, who, "走过去就能吃的三家")] },
    ];
  }
  // 懒得动
  if (has("累", "烦", "不想", "懒")) {
    const who = pickWho("waimai");
    return [
      { speaker: who, text: "那就别折腾了，今天躺平也没什么 🛵", gapMs: 460 },
      { speaker: who, cards: [dishCard({ serve: "deliver" }, who, "送到门口的三个")] },
    ];
  }
  // 周末相关
  if (has("周末", "去哪", "玩", "展", "演出", "运动", "爬山")) {
    const who = members.includes("jingshen") ? "jingshen" : members[0];
    const { list } = filterOutings("g-weekend", { exclude: shownRecoKeys("g-weekend") });
    const items = [...list].sort((a, b) => b.rating - a.rating).slice(0, 3).map(outingToReco);
    return [
      { speaker: who, text: "有几个安静的——不用赶时间那种 ✨", gapMs: 520 },
      {
        speaker: who,
        cards: [
          {
            id: `reco-${uid()}`,
            kind: "recoList",
            title: "这几个可以考虑",
            subtitle: "按你顶上的偏好筛过",
            items,
          },
        ],
      },
    ];
  }
  // 记忆相关
  if (has("记", "别推", "忘", "改")) {
    return [
      { speaker: "mimi", text: "记下啦 🐾", gapMs: 420 },
      { speaker: "mimi", text: "你随时能在我的页面里改，改完我下次就按新的来" },
    ];
  }
  // 兜底：只让一个人接，并且给出可点的下一步
  const who = members[0];
  const dry = AGENTS[who]?.emojiUse === "none";
  return [
    { speaker: who, text: dry ? "嗯，我在" : "在的在的 👀", gapMs: 420 },
    {
      speaker: who,
      text:
        who === "mimi"
          ? "要不要我把这件事记下来，明早提醒你呀"
          : isEat
            ? "你直说想吃什么口，我照这个筛"
            : "想室内还是户外？我按这个找",
      chips: isEat ? ["便宜点的", "想吃辣的", "我想出门吃"] : ["室内的", "户外的", "别太远"],
    },
  ];
}

export const TODAY = today;
