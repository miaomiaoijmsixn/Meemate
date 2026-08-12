import { kvGet, kvSet } from "./db";
import { DISHES, OUTINGS, type Dish, type Outing } from "./catalog";
import type { Profile } from "./types";

export type Tag = { name: string; on: boolean; custom?: boolean };
export type Pref = { min: number; max: number; tags: Tag[] };

/** 就餐方式：菜单里的当下视图筛选，跟长期偏好分开 */
export type Serve = "all" | "dine" | "deliver";

/** 每个群一套置顶偏好，冷启动的答案是它的初值 */
const DEFAULTS: Record<string, () => Pref> = {
  "g-eat": () => {
    const p = kvGet<Profile>("profile", null as unknown as Profile);
    const nums = (p?.budget ?? "25 到 40").match(/\d+/g)?.map(Number) ?? [25, 40];
    return {
      min: 0,
      max: Math.max(20, nums[nums.length - 1] ?? 40),
      tags: [
        { name: "堂食店", on: false },
        { name: "点评高分", on: true },
        { name: "2公里内", on: true },
      ],
    };
  },
  // 周末的决策维度跟吃饭完全不同：室内还是户外、要花多久、几点出门、要不要门票
  "g-weekend": () => ({
    min: 0,
    max: 300,
    tags: [
      { name: "半天以内", on: true },
      { name: "不用早起", on: true },
      { name: "免门票", on: false },
      { name: "室内", on: false },
      { name: "5公里内", on: false },
    ],
  }),
};

export const CEIL: Record<string, number> = { "g-eat": 120, "g-weekend": 300 };
export const priceCeil = (convId: string) => CEIL[convId] ?? 120;

export function getPref(convId: string): Pref {
  const key = `prefs:${convId}`;
  const saved = kvGet<Pref | null>(key, null);
  if (saved?.tags) return saved;
  const def = (DEFAULTS[convId] ?? DEFAULTS["g-eat"])();
  kvSet(key, def);
  return def;
}

export function setPref(convId: string, pref: Pref) {
  kvSet(`prefs:${convId}`, pref);
  return pref;
}

/* ---------------- 吃什么 ---------------- */

function hitDish(d: Dish, tag: string) {
  switch (tag) {
    case "堂食店":
      return d.dine;
    case "点评高分":
      return d.rating >= 4.6;
    case "2公里内":
      return d.walkM <= 2000;
    default:
      return (
        d.cat.includes(tag) || d.dish.includes(tag) || d.shop.includes(tag) || d.tags.includes(tag)
      );
  }
}

export function filterDishes(
  convId: string,
  opts: { cat?: string; serve?: Serve; exclude?: string[]; minCount?: number } = {},
) {
  const pref = getPref(convId);
  const on = pref.tags.filter((t) => t.on).map((t) => t.name);
  const ex = new Set(opts.exclude ?? []);
  const base = (d: Dish) =>
    d.price >= pref.min &&
    d.price <= pref.max &&
    (!opts.cat || opts.cat === "全部" || d.cat === opts.cat) &&
    (!opts.serve || opts.serve === "all" || (opts.serve === "dine" ? d.dine : d.deliver)) &&
    !ex.has(d.key);
  const strict = DISHES.filter((d) => base(d) && on.every((t) => hitDish(d, t)));
  // 够数就用严格结果；不够（相似推荐要求至少 3 个）才放宽标签
  if (strict.length >= (opts.minCount ?? 1)) return { list: strict, relaxed: false as const };
  // 只放宽标签，价格与就餐方式是用户明确设的，绝不悄悄越过
  const loose = DISHES.filter(base);
  return { list: loose, relaxed: loose.length > strict.length };
}

/* ---------------- 周末去哪 ---------------- */

function hitOuting(o: Outing, tag: string) {
  switch (tag) {
    case "半天以内":
      return o.dur <= 240;
    case "不用早起":
      return !o.early;
    case "免门票":
      return o.price === 0;
    case "室内":
      return o.indoor;
    case "户外":
      return !o.indoor;
    case "5公里内":
      return o.distM <= 5000;
    case "不用订票":
      return !o.booking;
    default:
      return o.cat.includes(tag) || o.name.includes(tag) || o.place.includes(tag);
  }
}

export function filterOutings(
  convId: string,
  opts: { cat?: string; exclude?: string[]; minCount?: number } = {},
) {
  const pref = getPref(convId);
  const on = pref.tags.filter((t) => t.on).map((t) => t.name);
  const ex = new Set(opts.exclude ?? []);
  const base = (o: Outing) =>
    o.price >= pref.min &&
    o.price <= pref.max &&
    (!opts.cat || opts.cat === "全部" || o.cat === opts.cat) &&
    !ex.has(o.key);
  const strict = OUTINGS.filter((o) => base(o) && on.every((t) => hitOuting(o, t)));
  if (strict.length >= (opts.minCount ?? 1)) return { list: strict, relaxed: false as const };
  const loose = OUTINGS.filter(base);
  return { list: loose, relaxed: loose.length > strict.length };
}

/* ---------------- 时段 ---------------- */

export type Slot = "morning" | "noon" | "afternoon" | "evening" | "late";

export function slotOf(d = new Date()): Slot {
  const h = d.getHours();
  if (h >= 5 && h < 10) return "morning";
  if (h >= 10 && h < 14) return "noon";
  if (h >= 14 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "late";
}

export const SLOT_LABEL: Record<Slot, string> = {
  morning: "早上",
  noon: "中午",
  afternoon: "下午",
  evening: "晚上",
  late: "深夜",
};

/** 各时段优先推的菜品类型 */
export const SLOT_CATS: Record<Slot, string[]> = {
  morning: ["早餐", "轻食", "面食"],
  noon: ["快餐", "面食", "川湘", "粤菜"],
  afternoon: ["甜品", "轻食"],
  evening: ["川湘", "粤菜", "烧烤", "粥汤", "面食"],
  late: ["烧烤", "粥汤", "快餐"],
};
