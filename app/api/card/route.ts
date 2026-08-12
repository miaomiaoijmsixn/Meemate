import { findDish, findItem, findOuting } from "@/lib/catalog";
import { db, uid } from "@/lib/db";
import {
  handoffBeats,
  logEvent,
  replaceBeats,
  similarBeats,
  wishAckBeats,
} from "@/lib/director";
import { AGENTS } from "@/lib/agents";
import { enqueue } from "@/lib/outbox";
import type { Item } from "@/lib/catalog";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const b = (await req.json()) as {
    action: "replace" | "wish" | "handoff";
    conversationId: string;
    agentId: string;
    cardId: string;
    reason?: string;
    /** 一样东西同时支持到店与外卖时，由前端指定这次要哪个 */
    mode?: "nav" | "order";
  };

  // 菜品与活动粒度：一样东西可能既能到店又能外卖，动作由前端指定
  const dish = findDish(b.cardId);
  const outing = findOuting(b.cardId);
  if (dish || outing) {
    if (b.action === "replace") {
      const beats = similarBeats(b.conversationId, b.cardId);
      if (beats.length) enqueue(b.conversationId, beats, Date.now() + 320);
      return Response.json({ ok: true });
    }
    if (b.action === "handoff") {
      const nav = b.mode !== "order";
      const name = dish ? `${dish.shop}的${dish.dish}` : outing!.name;
      const link = dish
        ? nav
          ? dish.navLink
          : (dish.orderLink ?? dish.navLink)
        : outing!.deeplink;
      const platform = dish
        ? nav
          ? "高德地图"
          : (dish.orderPlatform ?? "外卖平台")
        : outing!.platform;
      const who = b.agentId || (dish ? dish.by : outing!.by);
      logEvent(
        nav ? "navigate" : "order",
        nav ? `导航去${name}` : `在${platform}下单了${name}`,
        dish?.tags.includes("spicy") ? "spicy" : dish?.tags.includes("light") ? "light" : undefined,
      );
      const dry = AGENTS[who]?.emojiUse === "none";
      enqueue(
        b.conversationId,
        [
          {
            speaker: who,
            text: nav ? `${name}，去吧` : `下好了记我一功 ${dry ? "" : "🛵"}`.trim(),
            gapMs: 420,
          },
          {
            speaker: who,
            text: nav
              ? dry
                ? "到了跟我说好不好吃，我记一笔"
                : "到了拍张图给我看看"
              : dry
                ? "吃完回来说一句，下次我照这个口径推"
                : "吃完回来说一句，下次我照这个口径给你挑 👀",
          },
        ],
        Date.now() + 340,
      );
      return Response.json({ ok: true, deeplink: link, platform });
    }
    if (b.action === "wish") {
      const title = dish ? `${dish.shop} · ${dish.dish}` : outing!.name;
      const exist = db()
        .prepare("SELECT id FROM wishes WHERE title=? AND status='open'")
        .get(title) as { id: string } | undefined;
      if (!exist) {
        db()
          .prepare(
            "INSERT INTO wishes (id,title,type,subtitle,meta,source_agent,status,created_at) VALUES (?,?,?,?,?,?, 'open',?)",
          )
          .run(
            uid("w-"),
            title,
            dish ? (dish.dine ? "restaurant" : "delivery") : outingType(outing!.cat),
            dish ? `¥${dish.price} · ${dish.cat}` : `${outing!.cat} · ${outing!.place}`,
            JSON.stringify(
              dish
                ? { dish: dish.key, 距离: `${dish.walkM} 米` }
                : { outing: outing!.key, 交通: outing!.travel },
            ),
            dish ? dish.by : outing!.by,
            Date.now(),
          );
        logEvent("wish", `把${title}加进了清单`);
      }
      enqueue(
        b.conversationId,
        wishAckBeats(b.agentId || (dish ? dish.by : outing!.by), dish ? dish.dish : outing!.name),
        Date.now() + 300,
      );
      return Response.json({ ok: true });
    }
  }

  const item = findItem(b.cardId);

  if (b.action === "replace") {
    const kind = (item?.kind ?? "delivery") as Item["kind"];
    const beats = replaceBeats(b.agentId, kind, b.reason ?? "换一个");
    enqueue(b.conversationId, beats, Date.now() + 300);
    return Response.json({ ok: true });
  }

  if (b.action === "wish") {
    if (!item) return Response.json({ ok: false }, { status: 404 });
    const exist = db()
      .prepare("SELECT id FROM wishes WHERE title=? AND status='open'")
      .get(item.title) as { id: string } | undefined;
    if (!exist) {
      db()
        .prepare(
          "INSERT INTO wishes (id,title,type,subtitle,meta,source_agent,deadline,status,created_at) VALUES (?,?,?,?,?,?,?, 'open',?)",
        )
        .run(
          uid("w-"),
          item.title,
          item.kind,
          item.subtitle ?? null,
          JSON.stringify({ key: item.key, ...item.meta }),
          b.agentId,
          item.meta?.["展至"] ?? null,
          Date.now(),
        );
      logEvent("wish", `把《${item.title}》加进了愿望清单`);
    }
    enqueue(b.conversationId, wishAckBeats(b.agentId, item.title), Date.now() + 300);
    return Response.json({ ok: true });
  }

  if (b.action === "handoff") {
    if (!item) return Response.json({ ok: false }, { status: 404 });
    logEvent(
      item.kind === "restaurant" ? "navigate" : "order",
      item.kind === "restaurant"
        ? `导航去了${item.title}`
        : `在${item.platform}下单了${item.title}`,
      item.tags.includes("spicy") ? "spicy" : item.tags.includes("light") ? "light" : undefined,
    );
    enqueue(
      b.conversationId,
      handoffBeats(b.agentId, item.title, item.kind),
      Date.now() + 400,
    );
    return Response.json({ ok: true, deeplink: item.deeplink, platform: item.platform });
  }

  return Response.json({ ok: false }, { status: 400 });
}

/** 活动类型映射到愿望清单的图标类型 */
function outingType(cat: string) {
  if (cat === "户外" || cat === "运动") return "sport";
  if (cat === "周边游") return "trip";
  return "activity";
}
