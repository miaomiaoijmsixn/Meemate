import { withTenant } from "@/lib/api";
import { DISH_CATS, OUTING_CATS } from "@/lib/catalog";
import { dishToReco, outingToReco } from "@/lib/director";
import { filterDishes, filterOutings, type Serve } from "@/lib/prefs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 菜单组件的数据。吃什么给菜品,周末去哪给活动,
 * 两边都受置顶偏好约束,类型与就餐方式是当下的视图筛选。
 */
export const GET = (req: Request) =>
  withTenant(async () => {
    const u = new URL(req.url);
    const c = u.searchParams.get("c") ?? "g-eat";
    const cat = u.searchParams.get("cat") ?? "全部";
    const serve = (u.searchParams.get("serve") ?? "all") as Serve;

    if (c === "g-weekend") {
      const { list, relaxed } = await filterOutings(c, { cat });
      return Response.json({
        kind: "outing",
        cats: OUTING_CATS,
        serves: [],
        relaxed,
        items: list
          .sort((a, b) => b.rating - a.rating)
          .map((o) => ({
            ...outingToReco(o),
            rating: o.rating,
            cat: o.cat,
            indoor: o.indoor,
            booking: o.booking,
            best: o.best,
          })),
      });
    }

    const { list, relaxed } = await filterDishes(c, { cat, serve });
    return Response.json({
      kind: "dish",
      cats: DISH_CATS,
      serves: [
        { v: "all", label: "不限" },
        { v: "dine", label: "到店" },
        { v: "deliver", label: "外卖" },
      ],
      relaxed,
      items: list
        .sort((a, b) => b.rating - a.rating)
        .map((d) => ({ ...dishToReco(d), rating: d.rating, cat: d.cat })),
    });
  });
