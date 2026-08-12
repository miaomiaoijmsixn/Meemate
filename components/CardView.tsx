"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Card } from "@/lib/types";
import { AGENTS } from "@/lib/agents";

const REASONS = ["太贵了", "不吃辣", "太远", "吃过了"];
const REASON_MAP: Record<string, string> = {
  太贵了: "贵",
  不吃辣: "辣",
  太远: "远",
  吃过了: "吃过了",
};

const CTA: Record<string, { main: string; second?: string }> = {
  delivery: { main: "去下单", second: "相似推荐" },
  restaurant: { main: "导航前往", second: "加入想去" },
  activity: { main: "加入清单", second: "看详情" },
  sport: { main: "加入清单", second: "相似推荐" },
  trip: { main: "加入清单", second: "看详情" },
  morning: { main: "看今天" },
  diary: { main: "保存", second: "补充一句" },
  planSummary: { main: "查看完整行程" },
  reminder: { main: "完成", second: "稍后" },
};

const KIND_TAG: Record<string, { t: string; bg: string }> = {
  delivery: { t: "外卖", bg: "var(--c-wai-b)" },
  restaurant: { t: "线下", bg: "var(--c-chi-b)" },
  activity: { t: "演出展览", bg: "var(--c-jing-b)" },
  sport: { t: "运动", bg: "var(--c-jia-b)" },
  trip: { t: "周边游", bg: "var(--c-lv-b)" },
};

const PLAIN = new Set(["diary", "morning", "reminder", "planSummary"]);

/** 今日推荐：一条消息里三行，菜名、价格、步行、配送、一句理由、一个主按钮 */
function RecoList({
  card,
  conversationId,
  onToast,
}: {
  card: Card;
  conversationId: string;
  onToast?: (t: string) => void;
}) {
  const [gone, setGone] = useState<string[]>([]);
  const items = (card.items ?? []).filter((i) => !gone.includes(i.key));

  async function go(key: string, agentId: string, mode: "nav" | "order") {
    const r = await fetch("/api/card", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "handoff", conversationId, agentId, cardId: key, mode }),
    }).then((x) => x.json());
    if (r.deeplink) window.open(r.deeplink, "_blank", "noopener");
    onToast?.(`已跳转${r.platform ?? "平台"}，回来跟我说一声`);
  }

  return (
    <div className="card" style={{ width: 306 }}>
      <div style={{ padding: "11px 13px 4px" }}>
        <div style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.3 }}>{card.title}</div>
        {card.subtitle && (
          <div style={{ fontWeight: 400, fontSize: 11.5, lineHeight: 1.4, color: "var(--ink-3)", marginTop: 3 }}>
            {card.subtitle}
          </div>
        )}
      </div>

      {card.relaxed && (
        <div
          style={{
            margin: "4px 13px 0",
            padding: "6px 9px",
            borderRadius: 8,
            background: "var(--c-chi-b)",
            fontWeight: 400, fontSize: 11, lineHeight: 1.5,
            color: "var(--warn)",
          }}
        >
          你的偏好比较紧，这几个是放宽标签后的结果
        </div>
      )}

      {items.map((it, i) => {
        const both = it.canNav && it.canOrder;
        return (
        <div
          key={it.key}
          style={{
            display: "flex",
            gap: 9,
            padding: "9px 12px",
            alignItems: "center",
            borderTop: "1px solid var(--line-2)",
          }}
        >
          <div
            className="img"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              fontSize: 18,
              flex: "none",
              background: `linear-gradient(135deg, hsl(${it.hue} 42% 88%), hsl(${(it.hue + 24) % 360} 38% 80%))`,
            }}
          >
            {it.emoji}
          </div>
          {/* 三行固定高度：菜名加价格、距离与配送、一句理由 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
              <span
                style={{
                  fontWeight: 600, fontSize: 13.5, lineHeight: 1.35,
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {it.dish}
              </span>
              <span style={{ fontWeight: 600, fontSize: 13, lineHeight: 1, color: "var(--brand)" }}>
                {it.price ? `¥${it.price}` : "免费"}
              </span>
            </div>
            <div
              className="t-min"
              style={{
                color: "var(--brand)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {/* 步行与配送必须露出，店名放最后，空间不够时先截它。
                  周末群里 walk 装的是地点不是距离，不能硬加「步行」。 */}
              {[
                it.walk && (/米|公里/.test(it.walk) ? `步行 ${it.walk}` : it.walk),
                it.eta,
                it.shop,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
            {/* 推荐理由前标注是哪个 agent 挑的 */}
            {/* 头像与推荐语在同一横轴居中，不靠 vertical-align 估位置 */}
            <div
              className="t-min"
              style={{
                color: "var(--ink-3)",
                display: "flex",
                alignItems: "center",
                gap: 4,
                minWidth: 0,
              }}
            >
              {AGENTS[it.by] && (
                <span
                  className="av"
                  style={{
                    width: 15,
                    height: 15,
                    fontSize: 9,
                    flex: "none",
                    background: AGENTS[it.by].color,
                  }}
                >
                  {AGENTS[it.by].emoji}
                </span>
              )}
              <span
                style={{
                  minWidth: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {it.reason}
              </span>
            </div>
          </div>
          <div
            style={{
              flex: "none",
              display: "flex",
              flexDirection: "column",
              gap: 3,
              justifyContent: "center",
            }}
          >
            {/* 下单是主动作，放前面并用主按钮；导航退成次按钮。只有一个动作时它就是主按钮 */}
            {it.canOrder && (
              <button
                className="btn p"
                style={{
                  flex: "none",
                  width: 52,
                  height: both ? 23 : 26,
                  fontSize: 11.5,
                  borderRadius: 8,
                }}
                onClick={() => go(it.key, it.by, "order")}
              >
                {conversationId === "g-weekend" ? "订票" : "下单"}
              </button>
            )}
            {it.canNav && (
              <button
                className={it.canOrder ? "btn s" : "btn p"}
                style={{
                  flex: "none",
                  width: 52,
                  height: both ? 23 : 26,
                  fontSize: 11.5,
                  borderRadius: 8,
                }}
                onClick={() => go(it.key, it.by, "nav")}
              >
                导航
              </button>
            )}
            <button
              className="t-min"
              style={{
                flex: "none",
                width: 52,
                height: 16,
                lineHeight: 1,
                color: "var(--ink-3)",
                background: "none",
                border: 0,
                padding: 0,
              }}
              onClick={async () => {
                setGone((g) => [...g, it.key]);
                await fetch("/api/card", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    action: "replace",
                    conversationId,
                    agentId: it.by,
                    cardId: it.key,
                    reason: "换一个",
                  }),
                });
              }}
            >
              相似推荐
            </button>
          </div>
        </div>
        );
      })}
      {!items.length && (
        <div
          style={{
            padding: "14px 13px",
            fontWeight: 400, fontSize: 12, lineHeight: 1.5,
            color: "var(--ink-3)",
            borderTop: "1px solid var(--line-2)",
          }}
        >
          都不要的话，打开菜单自己挑吧
        </div>
      )}
    </div>
  );
}

export function CardView({
  card,
  agentId,
  conversationId,
  small,
  onDetail,
  onToast,
  onMenu,
}: {
  card: Card;
  agentId: string;
  conversationId: string;
  small?: boolean;
  onDetail?: (c: Card) => void;
  onToast?: (t: string) => void;
  onMenu?: () => void;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [gone, setGone] = useState(false);

  if (card.kind === "recoList")
    return <RecoList card={card} conversationId={conversationId} onToast={onToast} />;

  // 想再多看看：一条消息就是一个按钮，点开菜单组件
  if (card.kind === "action")
    return (
      <button
        onClick={onMenu}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "10px 14px",
          borderRadius: 14,
          background: "#fff",
          border: "1px solid var(--brand)",
          color: "var(--brand)",
          fontWeight: 500, fontSize: 13.5, lineHeight: 1,
          boxShadow: "var(--shadow-card)",
        }}
      >
        <span style={{ fontSize: 14 }}>☰</span>
        {card.title}
        <span style={{ color: "var(--ink-3)", fontSize: 11 }}>{card.label}</span>
      </button>
    );

  const cta = CTA[card.kind] ?? { main: "看看" };
  const tag = KIND_TAG[card.kind];
  const plain = PLAIN.has(card.kind);

  const post = (body: Record<string, unknown>) =>
    fetch("/api/card", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId, agentId, cardId: card.id, ...body }),
    }).then((r) => r.json());

  async function main() {
    if (card.kind === "morning") return router.push("/life");
    if (card.kind === "planSummary") return router.push(`/plan/${card.id}`);
    if (card.kind === "diary") {
      onToast?.("已经在我的页面里了");
      return router.push("/me");
    }
    if (card.kind === "reminder") return onToast?.("完成");
    if (card.kind === "delivery" || card.kind === "restaurant") return onDetail?.(card);
    await post({ action: "wish" });
    onToast?.("加进愿望清单了");
  }

  async function second() {
    if (card.kind === "restaurant") {
      await post({ action: "wish" });
      return onToast?.("放进想去了");
    }
    if (card.kind === "activity" || card.kind === "trip") return onDetail?.(card);
    if (card.kind === "diary") return router.push("/me");
    setGone(true);
    await post({ action: "replace", reason: "换一个" });
  }

  if (gone)
    return (
      <div
        style={{
          borderRadius: 14,
          padding: "9px 12px",
          background: "rgba(35,39,30,.05)",
          fontWeight: 400, fontSize: 12.5, lineHeight: 1,
          color: "var(--ink-3)",
        }}
      >
        已经换掉了
      </div>
    );

  const meta = [card.price, card.eta, card.distance, ...Object.values(card.meta ?? {}).slice(0, 1)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={small ? "card sm" : "card"}>
      {!plain && (
        <div className="img" style={{ height: small ? 58 : 76, fontSize: 26 }}>
          {card.emoji ?? "✳"}
        </div>
      )}

      <div className="pad" style={small ? { padding: "9px 11px 10px" } : undefined}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ font: `600 ${small ? 14 : 14.5}px/1.3 inherit`, flex: 1 }}>
            {card.title}
          </span>
          {tag && (
            <span className="tag" style={{ background: tag.bg, color: "var(--ink-2)" }}>
              {tag.t}
            </span>
          )}
        </div>

        {plain && card.subtitle && (
          <div style={{ fontWeight: 500, fontSize: 11, lineHeight: 1, color: "var(--ink-3)", marginTop: 5 }}>
            {card.subtitle}
          </div>
        )}
        {!plain && (
          <div
            style={{
              fontWeight: 400, fontSize: 12, lineHeight: 1.45,
              color: "var(--ink-2)",
              marginTop: 3,
            }}
          >
            {card.subtitle ? `${card.subtitle}` : ""}
            {meta && (
              <>
                <br />
                {meta}
              </>
            )}
          </div>
        )}

        {plain && card.body && (
          <div
            style={{
              fontWeight: 400, fontSize: 14, lineHeight: 1.7,
              color: "var(--ink-2)",
              marginTop: 7,
            }}
          >
            {card.body.map((b, i) => (
              <div key={i}>{b}</div>
            ))}
          </div>
        )}
      </div>

      {/* 记忆引用行：可点回记忆册 */}
      {card.reason && (
        <button
          className="memo"
          onClick={() =>
            router.push(card.reasonMemoryId ? `/me?m=${card.reasonMemoryId}` : "/me")
          }
          style={small ? { padding: "6px 11px", fontSize: 11 } : undefined}
        >
          <span>▸</span>
          <span>{card.reason}</span>
        </button>
      )}

      <div
        className="cta"
        style={small ? { padding: "0 11px 11px", gap: 6 } : { paddingTop: card.reason ? 11 : 0 }}
      >
        <button className="btn p" style={small ? { height: 30, fontSize: 12.5 } : undefined} onClick={main}>
          {cta.main}
        </button>
        {cta.second && (
          <button
            className="btn s"
            style={small ? { height: 30, fontSize: 12.5 } : undefined}
            onClick={second}
          >
            {cta.second}
          </button>
        )}
      </div>

      {!plain && (
        <div style={{ padding: "0 13px 11px" }}>
          {!asking ? (
            <button
              onClick={() => setAsking(true)}
              style={{
                fontWeight: 400, fontSize: 11.5, lineHeight: 1,
                color: "var(--ink-3)",
                background: "none",
                border: 0,
                padding: 0,
              }}
            >
              不感兴趣
            </button>
          ) : (
            <div>
              <div style={{ fontWeight: 400, fontSize: 11, lineHeight: 1.4, color: "var(--ink-3)", marginBottom: 6 }}>
                哪儿不对？说一个我就记住
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {REASONS.map((r) => (
                  <button
                    key={r}
                    className="chip"
                    style={{ fontSize: 11.5, padding: "5px 10px" }}
                    onClick={async () => {
                      setGone(true);
                      await post({ action: "replace", reason: REASON_MAP[r] });
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
