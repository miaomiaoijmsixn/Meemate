import { withTenant } from "@/lib/api";
import { addFact } from "@/lib/memory";
import { getPref, setPref, priceCeil, type Pref } from "@/lib/prefs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = (req: Request) =>
  withTenant(async () => {
    const c = new URL(req.url).searchParams.get("c") ?? "g-eat";
    return Response.json({ pref: await getPref(c), ceil: priceCeil(c) });
  });

/** 改置顶偏好即改记忆:价格区间是画像里的一条,不是临时筛选条件 */
export const PATCH = (req: Request) =>
  withTenant(async () => {
    const { conversationId, pref } = (await req.json()) as {
      conversationId: string;
      pref: Pref;
    };
    const ceil = priceCeil(conversationId);
    const clean: Pref = {
      min: Math.max(0, Math.min(pref.min, pref.max)),
      max: Math.min(ceil, Math.max(pref.min, pref.max)),
      tags: (pref.tags ?? []).slice(0, 12).map((t) => ({
        name: String(t.name).slice(0, 8),
        on: !!t.on,
        custom: !!t.custom,
      })),
    };
    await setPref(conversationId, clean);
    if (conversationId === "g-eat")
      await addFact({
        text: `一顿饭预算 ${clean.min} 到 ${clean.max} 元`,
        grp: "预算",
        tag: "budget",
        source: "said",
      });
    if (conversationId === "g-weekend")
      await addFact({
        text: `周末活动预算 ${clean.min} 到 ${clean.max} 元`,
        grp: "预算",
        source: "said",
      });
    return Response.json({ ok: true, pref: clean });
  });
