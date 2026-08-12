"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar, BottomTabs, Nav, Segmented, Sheet, Toast, useToast } from "./ui";
import type { Agent } from "@/lib/agents";

type Wish = {
  id: string;
  title: string;
  type: string;
  subtitle?: string;
  meta: Record<string, string>;
  sourceAgent?: string;
  deadline?: string;
  status: "open" | "done";
};
type Todo = { id: string; title: string; due?: string; source: string; done: boolean };

const LABEL: Record<string, string> = {
  activity: "想看",
  sport: "想动",
  trip: "想去",
  restaurant: "想吃",
  delivery: "想吃",
  other: "其他",
};
const EMOJI: Record<string, string> = {
  activity: "🎨",
  sport: "🏃",
  trip: "🧭",
  restaurant: "🍜",
  delivery: "🛵",
  other: "✳",
};
const FILTERS = ["全部", "想吃", "想去", "想看", "想动"];

export function Life() {
  const initialTab = useSearchParams().get("tab") === "plan" ? "plan" : "wish";
  const [tab, setTab] = useState<"wish" | "plan">(initialTab);
  const [filter, setFilter] = useState("全部");
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [sel, setSel] = useState<string[]>([]);
  const [params, setParams] = useState(false);
  const [day, setDay] = useState("周六");
  const [start, setStart] = useState("10:00");
  const [transit, setTransit] = useState("地铁");
  const [pace, setPace] = useState<"松散" | "紧凑">("松散");
  const [busy, setBusy] = useState(false);
  const [latestPlan, setLatestPlan] = useState<string | null>(null);
  /** 已加入待安排清单的项（参考购物车：先攒着，再一次生成） */
  const [cart, setCart] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const load = () => {
    fetch("/api/wishes").then((r) => r.json()).then(setWishes);
    fetch("/api/todos").then((r) => r.json()).then(setTodos);
  };
  useEffect(() => {
    load();
    fetch("/api/state")
      .then((r) => r.json())
      .then((s) => {
        setAgents(s.agents);
        setLatestPlan(s.latestPlan ?? null);
      });
  }, []);

  const open = useMemo(() => wishes.filter((w) => w.status === "open"), [wishes]);
  // 已去过的不从列表里消失，勾上之后还看得到划掉的样子
  const shown = wishes.filter((w) => filter === "全部" || LABEL[w.type] === filter);
  const undone = todos.filter((t) => !t.done);

  async function generate() {
    setBusy(true);
    const r = await fetch("/api/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wishIds: sel, params: { day, start, transit, pace, budget: 300 } }),
    }).then((x) => x.json());
    setBusy(false);
    setParams(false);
    if (r.planId) router.push(`/plan/${r.planId}?fresh=1`);
  }

  const today = new Date();
  const week = ["日", "一", "二", "三", "四", "五", "六"][today.getDay()];

  return (
    <>
      <Nav title="生活" />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { v: "wish", label: "愿望清单" },
          { v: "plan", label: "行程与待办" },
        ]}
      />

      {tab === "wish" && (
        <>
          <div className="chips" style={{ padding: "0 16px 10px", flex: "none" }}>
            {FILTERS.map((f) => (
              <button
                key={f}
                className="chip"
                data-on={filter === f ? "1" : "0"}
                onClick={() => setFilter(f)}
              >
                {f === "全部" ? `全部 ${wishes.length}` : f}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto" }} className="no-scrollbar">
            {!shown.length && (
              <div style={{ padding: "56px 32px", textAlign: "center" }}>
                <div style={{ fontSize: 30 }}>🗂</div>
                <div
                  style={{
                    fontWeight: 400, fontSize: 13.5, lineHeight: 1.7,
                    color: "var(--ink-3)",
                    margin: "10px 0 14px",
                  }}
                >
                  清单还是空的。去群里逛逛，看到喜欢的点一下加入清单
                </div>
                <button
                  className="btn p"
                  style={{ height: 40, borderRadius: 12, width: 160, margin: "0 auto" }}
                  onClick={() => router.push("/chat/g-weekend")}
                >
                  去周末去哪
                </button>
              </div>
            )}

            <div
              style={{
                padding: "0 16px",
                display: "flex",
                flexDirection: "column",
                gap: 9,
              }}
            >
              {shown.map((w) => {
                const inCart = sel.includes(w.id);
                const went = w.status === "done";
                const ag = w.sourceAgent ? agents[w.sourceAgent] : undefined;
                return (
                  <div
                    key={w.id}
                    style={{
                      display: "flex",
                      gap: 11,
                      padding: 11,
                      borderRadius: 14,
                      background: "#fff",
                      alignItems: "center",
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    {/* 勾选框跟待办一致：勾上显示 ✓、文字变灰并划掉 */}
                    <button
                      className="cbox"
                      data-on={went ? "1" : "0"}
                      aria-label={went ? "取消去过" : "标记去过"}
                      title={went ? "取消去过" : "标记去过"}
                      onClick={async () => {
                        await fetch("/api/wishes", {
                          method: "PATCH",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({
                            id: w.id,
                            status: went ? "open" : "done",
                          }),
                        });
                        if (!went) {
                          setSel((prev) => prev.filter((x) => x !== w.id));
                          toast.show("标记去过了，我记一笔");
                        }
                        load();
                      }}
                    >
                      {went ? "✓" : ""}
                    </button>
                    <div
                      className="img"
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        fontSize: 19,
                        flex: "none",
                        opacity: went ? 0.5 : 1,
                      }}
                    >
                      {EMOJI[w.type] ?? "✳"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          lineHeight: 1.3,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          color: went ? "var(--ink-3)" : undefined,
                          textDecoration: went ? "line-through" : undefined,
                        }}
                      >
                        {w.title}
                      </div>
                      <div
                        style={{
                          fontWeight: 400,
                          fontSize: 11.5,
                          lineHeight: 1.5,
                          color: "var(--ink-3)",
                          marginTop: 3,
                          textDecoration: went ? "line-through" : undefined,
                        }}
                      >
                        {LABEL[w.type] ?? "其他"}
                        {ag ? ` · ${ag.name}推荐` : " · 自己加的"}
                        {w.meta?.距离 ? ` · ${w.meta.距离}` : ""}
                      </div>
                      {w.deadline && !went && (
                        <div
                          style={{
                            fontWeight: 500,
                            fontSize: 11.5,
                            lineHeight: 1.4,
                            color: "#7A3F3F",
                            marginTop: 2,
                          }}
                        >
                          票期 {w.deadline}
                        </div>
                      )}
                    </div>
                    {/* 加入待安排清单：图标恒定为 ＋，重复点不会撤回，移出在清单里做 */}
                    {!went && (
                      <button
                        aria-label="加入待安排清单"
                        onClick={() => {
                          if (inCart) return toast.show("已经在清单里了");
                          setSel((p) => [...p, w.id]);
                          toast.show("加进待安排清单了");
                        }}
                        style={{
                          flex: "none",
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          border: "1.5px solid var(--brand)",
                          background: "transparent",
                          color: "var(--brand)",
                          fontSize: 19,
                          lineHeight: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ＋
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ height: 18 }} />
          </div>

          {/* 底部：左边待安排清单入口（角标显示已加入数量），右边生成规划 */}
          <div
            style={{
              flex: "none",
              padding: "10px 16px",
              paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
              borderTop: "1px solid var(--line-2)",
              background: "rgba(255,255,255,.94)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <button
              onClick={() => setCart(true)}
              aria-label={`待安排清单，已加入 ${sel.length} 项`}
              style={{
                position: "relative",
                flex: "none",
                width: 44,
                height: 44,
                borderRadius: 13,
                border: "1px solid var(--line)",
                background: "#fff",
                fontSize: 19,
                lineHeight: 1,
              }}
            >
              🧾
              {!!sel.length && (
                <span
                  style={{
                    position: "absolute",
                    top: -5,
                    right: -5,
                    minWidth: 19,
                    height: 19,
                    padding: "0 5px",
                    borderRadius: 999,
                    background: "var(--brand)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 11,
                    lineHeight: "19px",
                    boxShadow: "0 0 0 2px #fff",
                  }}
                >
                  {sel.length}
                </span>
              )}
            </button>
            <button
              className="btn p"
              disabled={!sel.length}
              style={{ flex: 1, height: 44, borderRadius: 13, fontSize: 15 }}
              onClick={() => setParams(true)}
            >
              {sel.length ? `生成规划 · ${sel.length} 项` : "先加几项再生成"}
            </button>
          </div>

          {/* 待安排清单：像购物车一样先看一眼再下单 */}
          <Sheet open={cart} onClose={() => setCart(false)}>
            <div style={{ padding: "8px 20px 26px" }}>
              <div style={{ display: "flex", alignItems: "baseline", marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 17, lineHeight: 1.3 }}>待安排清单</span>
                <span style={{ flex: 1 }} />
                <span className="t-min" style={{ color: "var(--ink-3)" }}>
                  共 {sel.length} 项
                </span>
              </div>

              {!sel.length && (
                <div
                  style={{
                    padding: "28px 10px",
                    textAlign: "center",
                    fontWeight: 400, fontSize: 13, lineHeight: 1.7,
                    color: "var(--ink-3)",
                  }}
                >
                  还没加东西。在清单里点右边的 ＋ 把想去的攒起来，再一次交给小咪排。
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sel.map((id) => {
                  const w = wishes.find((x) => x.id === id);
                  if (!w) return null;
                  const ag = w.sourceAgent ? agents[w.sourceAgent] : undefined;
                  return (
                    <div
                      key={id}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        padding: "8px 10px",
                        borderRadius: 12,
                        background: "var(--cream)",
                      }}
                    >
                      <div
                        className="img"
                        style={{ width: 38, height: 38, borderRadius: 9, fontSize: 16, flex: "none" }}
                      >
                        {EMOJI[w.type] ?? "✳"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 500, fontSize: 13.5, lineHeight: 1.35,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {w.title}
                        </div>
                        <div className="t-min" style={{ color: "var(--ink-3)" }}>
                          {LABEL[w.type] ?? "其他"}
                          {ag ? ` · ${ag.name}推荐` : ""}
                        </div>
                      </div>
                      <button
                        aria-label="移出清单"
                        onClick={() => setSel((p) => p.filter((x) => x !== id))}
                        style={{
                          flex: "none",
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          border: 0,
                          background: "rgba(35,39,30,.06)",
                          color: "var(--ink-3)",
                          fontSize: 13,
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                className="btn p"
                disabled={!sel.length}
                style={{ width: "100%", height: 48, borderRadius: 14, fontSize: 15, marginTop: 16 }}
                onClick={() => {
                  setCart(false);
                  setParams(true);
                }}
              >
                生成规划
              </button>
            </div>
          </Sheet>
        </>
      )}

      {tab === "plan" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }} className="no-scrollbar">
          {/* 规划卡片可点，直接打开那一天的行程详情 */}
          <div
            onClick={() =>
              latestPlan
                ? router.push(`/plan/${latestPlan}`)
                : toast.show("还没有行程，先去清单里选几项让小咪排")
            }
            style={{
              padding: 14,
              borderRadius: 16,
              background: "var(--brand)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.3 }}>
                {today.getMonth() + 1} 月 {today.getDate()} 日 周{week}
              </span>
              <span style={{ flex: 1 }} />
              <span style={{ fontWeight: 400, fontSize: 12.5, lineHeight: 1, opacity: 0.75 }}>多云 26–31℃</span>
            </div>
            <div
              style={{
                marginTop: 11,
                display: "flex",
                flexDirection: "column",
                gap: 7,
                fontWeight: 400, fontSize: 13, lineHeight: 1.4,
                opacity: 0.92,
              }}
            >
              {undone.slice(0, 2).map((t) => (
                <div key={t.id} style={{ display: "flex", gap: 9 }}>
                  <span style={{ opacity: 0.7, width: 62, flex: "none" }}>
                    {t.due?.split(" ")[1] ?? "待定"}
                  </span>
                  {t.title}
                </div>
              ))}
              {!undone.length && <div>今天是空的，想加点什么跟小咪说</div>}
            </div>
            <div
              style={{
                marginTop: 12,
                paddingTop: 11,
                borderTop: "1px solid rgba(255,255,255,.18)",
                fontWeight: 400, fontSize: 12.5, lineHeight: 1,
                opacity: 0.85,
                display: "flex",
                alignItems: "center",
              }}
            >
              <span style={{ flex: 1 }}>还有 {undone.length} 件待办</span>
              <span>{latestPlan ? "查看行程 ›" : "还没排行程"}</span>
            </div>
          </div>

          {(["plan", "chat", "manual"] as const).map((src) => {
            const list = todos.filter((t) => t.source === src);
            if (!list.length) return null;
            return (
              <div key={src}>
                <p className="sec" style={{ margin: "16px 0 8px" }}>
                  {src === "plan" ? "来自行程" : src === "chat" ? "来自对话" : "我自己加的"}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {list.map((t) => (
                    <div
                      key={t.id}
                      style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 0" }}
                    >
                      <button
                        className="cbox"
                        data-on={t.done ? "1" : "0"}
                        style={{ width: 19, height: 19 }}
                        onClick={async () => {
                          await fetch("/api/todos", {
                            method: "PATCH",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ id: t.id, done: !t.done }),
                          });
                          if (!t.done) toast.show("嗯，这件事算过去了");
                          load();
                        }}
                      >
                        {t.done ? "✓" : ""}
                      </button>
                      <span
                        style={{
                          flex: 1,
                          fontWeight: 400, fontSize: 14, lineHeight: 1.4,
                          color: t.done ? "var(--ink-3)" : undefined,
                          textDecoration: t.done ? "line-through" : undefined,
                        }}
                      >
                        {t.title}
                      </span>
                      <span style={{ fontWeight: 400, fontSize: 11.5, lineHeight: 1, color: "var(--ink-3)" }}>
                        {t.due ?? ""}
                      </span>
                      {src === "plan" && latestPlan && (
                        <button
                          className="t-min"
                          style={{
                            color: "var(--brand)",
                            background: "none",
                            border: 0,
                            padding: 0,
                          }}
                          onClick={() => router.push(`/plan/${latestPlan}`)}
                        >
                          行程 ›
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {!todos.length && (
            <div
              style={{
                padding: "40px 24px",
                textAlign: "center",
                fontWeight: 400, fontSize: 13.5, lineHeight: 1.7,
                color: "var(--ink-3)",
              }}
            >
              还没有待办。在清单里选几项让小咪排一次行程，节点会自动写进来
            </div>
          )}

          {!!undone.length && (
            <div
              style={{
                margin: "14px 0 20px",
                padding: "11px 13px",
                borderRadius: 12,
                background: "#fff",
                display: "flex",
                gap: 9,
                alignItems: "center",
                boxShadow: "var(--shadow-card)",
                cursor: "pointer",
              }}
              onClick={() => router.push("/chat/c-mimi")}
            >
              <Avatar agent={agents.mimi} size={26} />
              <div style={{ fontWeight: 400, fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-2)", flex: 1 }}>
                有没做完的，要不要我顺延到今晚提醒你？
              </div>
              <span style={{ color: "var(--ink-3)", fontSize: 14 }}>›</span>
            </div>
          )}
        </div>
      )}

      <Sheet open={params} onClose={() => setParams(false)}>
        <div style={{ padding: "8px 20px 26px" }}>
          <div style={{ fontWeight: 600, fontSize: 17, lineHeight: 1.3, marginBottom: 16 }}>排哪一天</div>
          {(
            [
              ["哪一天", ["周六", "周日"], day, setDay],
              ["几点出门", ["09:00", "10:00", "13:00"], start, setStart],
              ["怎么走", ["地铁", "自驾", "步行"], transit, setTransit],
              ["节奏", ["松散", "紧凑"], pace, setPace],
            ] as const
          ).map(([label, opts, val, set]) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div className="sec">{label}</div>
              <div style={{ display: "flex", gap: 7 }}>
                {opts.map((o) => (
                  <button
                    key={o}
                    className="chip"
                    data-on={val === o ? "1" : "0"}
                    onClick={() => (set as (v: string) => void)(o)}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            className="btn p"
            disabled={busy}
            style={{ width: "100%", height: 48, borderRadius: 14, fontSize: 15, marginTop: 6 }}
            onClick={generate}
          >
            {busy ? "小咪正在排…" : "让小咪排"}
          </button>
        </div>
      </Sheet>

      <Toast text={toast.text} />
      <BottomTabs badge={undone.length} />
    </>
  );
}
