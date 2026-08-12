"use client";

import { useEffect, useState } from "react";
import type { RecoItem } from "@/lib/types";
import type { Agent } from "@/lib/agents";

type MenuItem = RecoItem & {
  rating: number;
  cat: string;
  indoor?: boolean;
  booking?: boolean;
  best?: string;
};
type Serve = { v: string; label: string };

/**
 * 菜单组件。填满聊天区（置顶偏好条以下），受置顶偏好约束。
 * 吃什么给菜品，可按类型和到店/外卖筛；周末去哪给活动，按类型筛。
 */
export function MenuSheet({
  conversationId,
  agents,
  onClose,
  onAct,
}: {
  conversationId: string;
  agents: Record<string, Agent>;
  onClose: () => void;
  onAct: (item: MenuItem, action: "handoff" | "wish", mode?: "nav" | "order") => void;
}) {
  const [cats, setCats] = useState<string[]>(["全部"]);
  const [serves, setServes] = useState<Serve[]>([]);
  const [cat, setCat] = useState("全部");
  const [serve, setServe] = useState("all");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [relaxed, setRelaxed] = useState(false);
  const [loading, setLoading] = useState(true);
  const isEat = conversationId === "g-eat";

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/menu?c=${conversationId}&cat=${encodeURIComponent(cat)}&serve=${serve}`,
    )
      .then((r) => r.json())
      .then((d) => {
        setCats(d.cats);
        setServes(d.serves ?? []);
        setItems(d.items);
        setRelaxed(d.relaxed);
        setLoading(false);
      });
  }, [conversationId, cat, serve]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 6,
        background: "var(--surface)",
        borderTop: "1px solid var(--line-2)",
        borderRadius: "18px 18px 0 0",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 -10px 30px rgba(35,39,30,.12)",
        animation: "up .26s cubic-bezier(.2,.8,.3,1)",
      }}
    >
      <div
        style={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 14px 8px",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.2 }}>
          {isEat ? "菜单" : "去处"}
        </span>
        <span className="t-min" style={{ color: "var(--ink-3)" }}>
          {loading ? "筛选中" : `${items.length} ${isEat ? "道" : "个"} · 已按偏好筛过`}
        </span>
        <span style={{ flex: 1 }} />
        <button
          onClick={onClose}
          style={{
            fontWeight: 400,
            fontSize: 13,
            lineHeight: 1,
            color: "var(--brand)",
            background: "none",
            border: 0,
          }}
        >
          收起
        </button>
      </div>

      {/* 到店还是外卖：当下的视图筛选，跟长期偏好分开 */}
      {!!serves.length && (
        <div style={{ flex: "none", padding: "0 14px 8px" }}>
          <div className="seg">
            {serves.map((s) => (
              <button
                key={s.v}
                data-on={serve === s.v ? "1" : "0"}
                onClick={() => setServe(s.v)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="chips no-scrollbar"
        style={{ flex: "none", flexWrap: "nowrap", overflowX: "auto", paddingBottom: 8 }}
      >
        {cats.map((c) => (
          <button
            key={c}
            className="chip"
            data-on={cat === c ? "1" : "0"}
            style={{ fontSize: 12, padding: "6px 11px" }}
            onClick={() => setCat(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {relaxed && (
        <div
          style={{
            flex: "none",
            margin: "0 14px 8px",
            padding: "8px 11px",
            borderRadius: 10,
            background: "var(--c-chi-b)",
            fontWeight: 400,
            fontSize: 11.5,
            lineHeight: 1.5,
            color: "var(--warn)",
          }}
        >
          按你现在的偏好没找到，我把标签放宽了。要么调价格区间，要么去掉一个标签。
        </div>
      )}

      <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "0 14px 14px" }}>
        {items.map((d) => {
          const by = agents[d.by];
          return (
            <div
              key={d.key}
              style={{
                display: "flex",
                gap: 11,
                padding: "11px 0",
                borderBottom: "1px solid var(--line-2)",
              }}
            >
              <div
                className="img"
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 11,
                  fontSize: 24,
                  flex: "none",
                  background: `linear-gradient(135deg, hsl(${d.hue} 42% 88%), hsl(${(d.hue + 24) % 360} 38% 80%))`,
                }}
              >
                {d.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, flex: 1 }}>
                    {d.dish}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      lineHeight: 1.3,
                      color: "var(--brand)",
                    }}
                  >
                    {d.price ? `¥${d.price}` : "免费"}
                  </span>
                </div>
                <div className="t-min" style={{ color: "var(--brand)", marginTop: 2 }}>
                  {[
                    /米|公里/.test(d.walk) ? `步行 ${d.walk}` : d.walk,
                    d.eta,
                    d.shop,
                    d.rating,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                  {isEat ? (
                    <>
                      {d.canNav && (
                        <span className="tag" style={{ background: "var(--c-chi-b)" }}>
                          可到店
                        </span>
                      )}
                      {d.canOrder && (
                        <span className="tag" style={{ background: "var(--c-wai-b)" }}>
                          可外卖
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span
                        className="tag"
                        style={{ background: d.indoor ? "var(--c-jing-b)" : "var(--c-jia-b)" }}
                      >
                        {d.indoor ? "室内" : "户外"}
                      </span>
                      {d.booking && (
                        <span className="tag" style={{ background: "var(--c-wai-b)" }}>
                          需订票
                        </span>
                      )}
                      {d.best && (
                        <span className="tag" style={{ background: "var(--panel, #f2f2f2)" }}>
                          {d.best}
                        </span>
                      )}
                    </>
                  )}
                </div>
                {/* 头像与推荐语在同一横轴居中，不靠 vertical-align 估位置 */}
                <div
                  className="t-min"
                  style={{
                    color: "var(--ink-3)",
                    marginTop: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {by && (
                    <span
                      className="av"
                      style={{
                        width: 15,
                        height: 15,
                        fontSize: 9,
                        flex: "none",
                        background: by.color,
                      }}
                    >
                      {by.emoji}
                    </span>
                  )}
                  <span>{d.reason}</span>
                </div>
                <div style={{ display: "flex", gap: 7, marginTop: 7 }}>
                  {d.canOrder && (
                    <button
                      className="btn p"
                      style={{ flex: "none", width: 70, height: 28, fontSize: 12 }}
                      onClick={() => onAct(d, "handoff", "order")}
                    >
                      {isEat ? "下单" : "订票"}
                    </button>
                  )}
                  {d.canNav && (
                    <button
                      className={d.canOrder ? "btn s" : "btn p"}
                      style={{ flex: "none", width: 70, height: 28, fontSize: 12 }}
                      onClick={() => onAct(d, "handoff", "nav")}
                    >
                      导航
                    </button>
                  )}
                  <button
                    className="btn s"
                    style={{ flex: "none", width: 76, height: 28, fontSize: 12 }}
                    onClick={() => onAct(d, "wish")}
                  >
                    {isEat ? "加入想吃" : "加入清单"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {!loading && !items.length && (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              fontWeight: 400,
              fontSize: 13,
              lineHeight: 1.7,
              color: "var(--ink-3)",
            }}
          >
            这个筛选下没有符合偏好的。换个类型，或者把价格上限往右拉一点。
          </div>
        )}
      </div>
    </div>
  );
}
