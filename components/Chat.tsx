"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CardView } from "./CardView";
import { MenuSheet } from "./MenuSheet";
import { PrefBar } from "./PrefBar";
import { Avatar, BackNav, Sheet, Toast, useToast } from "./ui";
import type { Card, Message, RecoItem } from "@/lib/types";
import { LEVELS, type Agent } from "@/lib/agents";

type Conv = {
  id: string;
  kind: "single" | "group";
  title: string;
  agentId: string | null;
  members: string[];
  intro?: string;
};

const CAN: Record<string, string> = {
  morning: "写早报",
  diary: "写日记并抽出记忆",
  reminder: "出发前提醒你",
  planSummary: "把清单排成行程",
  restaurant: "找线下馆子，讲清门道",
  delivery: "挑外卖、算券、避坑",
  activity: "找展览、演出、电影",
  sport: "排户外和室内运动",
  trip: "找周边游路线",
};

export function Chat({ id }: { id: string }) {
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [conv, setConv] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [typing, setTyping] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [detail, setDetail] = useState<Card | null>(null);
  const [detailAgent, setDetailAgent] = useState<string>("");
  const [profileOf, setProfileOf] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [prefDirty, setPrefDirty] = useState(false);
  /** @ 提及浮窗：null 表示没在提及，否则是 @ 后面已经打的字 */
  const [atQuery, setAtQuery] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();
  const streamRef = useRef<HTMLDivElement>(null);
  const entered = useRef(false);

  useEffect(() => {
    fetch("/api/state")
      .then((r) => r.json())
      .then((s) => {
        setAgents(s.agents);
        setConv(s.conversations.find((c: Conv) => c.id === id) ?? null);
      });
  }, [id]);

  // 进群就给结论：问候语 + 今日推荐 + 想再多看看（同一时段只给一次）
  useEffect(() => {
    if (entered.current) return;
    entered.current = true;
    fetch("/api/enter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId: id }),
    });
  }, [id]);

  useEffect(() => {
    const es = new EventSource(`/api/stream?c=${id}&seq=0`);
    es.addEventListener("msg", (e) => {
      const m = JSON.parse((e as MessageEvent).data) as Message;
      setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    });
    es.addEventListener("typing", (e) =>
      setTyping(JSON.parse((e as MessageEvent).data).sender),
    );
    return () => es.close();
  }, [id]);

  /**
   * 贴底。不用 scrollIntoView：嵌进 wrapper 后不可靠。
   * 偏好条是异步渲染的，会在消息到达之后改变滚动区高度，
   * 所以除了每次消息变化，还要监听尺寸变化重新贴底。
   */
  useEffect(() => {
    const el = streamRef.current;
    if (!el) return;
    const stick = () => {
      el.scrollTop = el.scrollHeight;
    };
    stick();
    const raf = requestAnimationFrame(stick);
    const t = setTimeout(stick, 140);
    const ro = new ResizeObserver(stick);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      ro.disconnect();
    };
  }, [msgs, typing, menu]);

  const chips = useMemo(() => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].sender === "user") return [];
      if (msgs[i].chips?.length) return msgs[i].chips!;
    }
    return [];
  }, [msgs]);

  /** 光标前最后一个 @ 到光标之间没有空格，就认为正在提及 */
  function detectAt(v: string) {
    const m = /@([^\s@]{0,8})$/.exec(v);
    setAtQuery(m ? m[1] : null);
  }

  /** 选中某个成员：把已打的 @片段 换成完整的 @名字 */
  function insertMention(name: string) {
    const v = text.replace(/@([^\s@]{0,8})$/, `@${name} `);
    setText(v);
    setAtQuery(null);
    inputRef.current?.focus();
  }

  async function send(t: string) {
    const v = t.trim();
    if (!v) return;
    setText("");
    await fetch("/api/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId: id, text: v }),
    });
  }

  async function handoff(c: Card) {
    const r = await fetch("/api/card", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "handoff",
        conversationId: id,
        agentId: detailAgent || conv?.members?.[0] || "mimi",
        cardId: c.id,
      }),
    }).then((x) => x.json());
    setDetail(null);
    if (r.deeplink) window.open(r.deeplink, "_blank", "noopener");
    toast.show(`已跳转${r.platform ?? "平台"}，回来跟他说一声`);
  }

  const isGroup = conv?.kind === "group";
  const a = (aid: string) => agents[aid];
  const members = (conv?.members ?? []).map(a).filter(Boolean);

  return (
    <>
      <BackNav
        title={conv?.title ?? ""}
        sub={
          isGroup
            ? `你和 ${conv?.members.length} 个朋友`
            : typing
              ? "正在输入"
              : "AI · 刚刚活跃"
        }
        avatar={
          !isGroup && conv?.agentId ? <Avatar agent={a(conv.agentId)} size={32} /> : undefined
        }
        onTitle={() => !isGroup && setProfileOf(conv?.agentId ?? null)}
        right={
          isGroup ? (
            <div style={{ display: "flex" }}>
              {members.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setProfileOf(m.id)}
                  className="av"
                  style={{
                    width: 26,
                    height: 26,
                    fontSize: 11,
                    background: m.color,
                    marginLeft: i ? -7 : 0,
                    boxShadow: i ? "0 0 0 2px var(--surface)" : undefined,
                    border: 0,
                  }}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          ) : (
            <span style={{ color: "var(--ink-2)", letterSpacing: 2 }}>···</span>
          )
        }
      />

      {/* 常驻置顶偏好：初值来自冷启动，改了立刻影响推荐与菜单 */}
      {isGroup && <PrefBar conversationId={id} onChange={() => setPrefDirty(true)} />}

      <div
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
      <div className="stream no-scrollbar" ref={streamRef}>
        {conv?.intro && (
          <div
            style={{
              textAlign: "center",
              fontWeight: 400, fontSize: 11.5, lineHeight: 1.6,
              color: "var(--ink-3)",
              margin: "4px 24px 6px",
            }}
          >
            {conv.intro}
          </div>
        )}

        {msgs.map((m, i) => {
          const mine = m.sender === "user";
          const prev = msgs[i - 1];
          const same = prev && prev.sender === m.sender;
          const ag = a(m.sender);
          const cards = m.cards ?? [];

          if (mine)
            return (
              <div key={m.id} className="row me">
                <div className="bub me">{m.text}</div>
              </div>
            );

          return (
            <div key={m.id}>
              {isGroup && !same && <div className="who">{ag?.name}</div>}
              {m.text && (
                <div className="row" style={{ marginTop: 2 }}>
                  <button
                    onClick={() => setProfileOf(m.sender)}
                    className="av"
                    style={{
                      background: ag?.color,
                      border: 0,
                      visibility: same ? "hidden" : "visible",
                    }}
                  >
                    {ag?.emoji}
                  </button>
                  <div
                    className={`bub${m.mention ? " at" : ""}`}
                    style={{ background: ag?.tint }}
                  >
                    {m.mention && (
                      <span style={{ color: "var(--brand)", fontWeight: 500 }}>@你 </span>
                    )}
                    {m.text}
                  </div>
                </div>
              )}

              {!!cards.length && (
                <div
                  className="no-scrollbar"
                  style={{
                    display: "flex",
                    gap: 9,
                    overflowX: "auto",
                    padding: "8px 0 2px",
                    marginLeft: 38,
                  }}
                >
                  {cards.map((c) => (
                    <div key={c.id} style={{ flex: "none" }}>
                      <CardView
                        card={c}
                        agentId={m.sender}
                        conversationId={id}
                        small={cards.length > 1}
                        onToast={toast.show}
                        onDetail={(cc) => {
                          setDetailAgent(m.sender);
                          setDetail(cc);
                        }}
                        onMenu={() => setMenu(true)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {typing && (
          <div className="row" style={{ marginTop: 2 }}>
            <div className="av" style={{ background: a(typing)?.color }}>
              {a(typing)?.emoji}
            </div>
            <div
              className="bub"
              style={{
                background: a(typing)?.tint,
                display: "flex",
                gap: 5,
                alignItems: "center",
                padding: "12px 15px",
              }}
            >
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}
      </div>

      {/* @ 提及浮窗：列出群成员，点一下就插进输入框 */}
      {isGroup && atQuery !== null && (
        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 96,
            zIndex: 8,
            background: "#fff",
            borderRadius: 14,
            boxShadow: "0 8px 26px rgba(35,39,30,.18)",
            border: "1px solid var(--line)",
            overflow: "hidden",
          }}
        >
          <div
            className="t-min"
            style={{ padding: "8px 12px 4px", color: "var(--ink-3)" }}
          >
            @ 谁来回答
          </div>
          {members
            .filter((m) => !atQuery || m.name.includes(atQuery) || m.short.includes(atQuery))
            .map((m) => (
              <button
                key={m.id}
                onClick={() => insertMention(m.short)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  width: "100%",
                  padding: "9px 12px",
                  background: "none",
                  border: 0,
                  borderTop: "1px solid var(--line-2)",
                  textAlign: "left",
                }}
              >
                <Avatar agent={m} size={28} />
                <span style={{ fontWeight: 500, fontSize: 14, lineHeight: 1.3 }}>{m.name}</span>
                <span className="t-min" style={{ color: "var(--ink-3)" }}>
                  {m.role}
                </span>
              </button>
            ))}
          {!members.some(
            (m) => !atQuery || m.name.includes(atQuery) || m.short.includes(atQuery),
          ) && (
            <div
              className="t-min"
              style={{ padding: "10px 12px", color: "var(--ink-3)", borderTop: "1px solid var(--line-2)" }}
            >
              群里没有叫这个名字的
            </div>
          )}
        </div>
      )}

      {/* 输入框上方：菜单图标 + 上下文快捷回复 */}
      <div
        className="chips no-scrollbar"
        style={{ flex: "none", flexWrap: "nowrap", overflowX: "auto", paddingBottom: 2 }}
      >
        {isGroup && (
          <button
            className="chip"
            onClick={() => setMenu(true)}
            // 尺寸对齐偏好条里的标签（堂食店那一档）
            style={{
              borderColor: "var(--brand)",
              color: "var(--brand)",
              fontSize: 11.5,
              padding: "5px 10px",
            }}
            aria-label="打开菜单"
          >
            ☰ 菜单
          </button>
        )}
        {/* 偏好改了不自动刷屏，给一个明确的重挑入口 */}
        {isGroup && prefDirty && (
          <button
            className="chip"
            data-on="1"
            onClick={async () => {
              setPrefDirty(false);
              await fetch("/api/enter", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ conversationId: id, force: true }),
              });
            }}
          >
            偏好变了 · 重挑三个
          </button>
        )}
        {chips.map((c) => (
          <button key={c} className="chip" onClick={() => send(c)}>
            {c}
          </button>
        ))}
      </div>

      {menu && (
        <MenuSheet
          conversationId={id}
          agents={agents}
          onClose={() => setMenu(false)}
          onAct={async (d, action, mode) => {
            const r = await fetch("/api/card", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                action,
                conversationId: id,
                agentId: d.by,
                cardId: d.key,
                mode,
              }),
            }).then((x) => x.json());
            if (action === "handoff") {
              setMenu(false);
              if (r.deeplink) window.open(r.deeplink, "_blank", "noopener");
              toast.show(`已跳转${r.platform ?? "平台"}，回来跟我说一声`);
            } else {
              toast.show(`${d.dish} 放进清单了`);
            }
          }}
        />
      )}
      </div>

      <div className="inp">
        <div className="plus">＋</div>
        <textarea
          ref={inputRef}
          className="fld"
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            detectAt(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") return setAtQuery(null);
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              setAtQuery(null);
              send(text);
            }
          }}
          placeholder={isGroup ? "发消息，@ 可指定谁回答" : "发消息"}
        />
        <button className="plus go" disabled={!text.trim()} onClick={() => send(text)}>
          ↑
        </button>
      </div>

      {/* 浮层 B 组件详情与跳转确认 */}
      <Sheet open={!!detail} onClose={() => setDetail(null)}>
        {detail && (
          <>
            <div style={{ flex: 1, overflowY: "auto" }} className="no-scrollbar">
              <div
                className="img"
                style={{ height: 150, margin: "8px 16px 0", borderRadius: 14, fontSize: 46 }}
              >
                {detail.emoji}
              </div>
              <div style={{ padding: "14px 20px 0" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 20, lineHeight: 1.3 }}>{detail.title}</span>
                  {(detail.price || detail.distance) && (
                    <span className="tag" style={{ background: "var(--c-wai-b)" }}>
                      {detail.price ?? detail.distance}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontWeight: 400, fontSize: 12.5, lineHeight: 1.5,
                    color: "var(--ink-3)",
                    marginTop: 4,
                  }}
                >
                  {[detail.subtitle, detail.eta, detail.distance, ...Object.values(detail.meta ?? {})]
                    .filter(Boolean)
                    .join(" · ")}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    padding: "12px 13px",
                    borderRadius: 12,
                    background: "var(--cream)",
                  }}
                >
                  <div className="sec" style={{ color: "var(--brand)" }}>
                    为什么推给你
                  </div>
                  <div style={{ fontWeight: 400, fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)" }}>
                    {detail.reason && <div>▸ {detail.reason}</div>}
                    {detail.price && <div>▸ 在你的预算带里，{detail.price}</div>}
                    <div>▸ {detail.platform} 上可以直接下单，我们不碰你的支付</div>
                  </div>
                </div>

                {!!detail.body?.length && (
                  <>
                    <p className="sec" style={{ margin: "18px 0 8px" }}>
                      招牌 · 他的点评
                    </p>
                    <div style={{ display: "flex", gap: 9 }}>
                      {detail.body.slice(0, 2).map((b, i) => (
                        <div key={i} style={{ flex: 1 }}>
                          <div
                            className="img"
                            style={{ height: 64, borderRadius: 10, fontSize: 20 }}
                          >
                            {detail.emoji}
                          </div>
                          <div
                            style={{
                              fontWeight: 400, fontSize: 11.5, lineHeight: 1.55,
                              color: "var(--ink-2)",
                              marginTop: 5,
                            }}
                          >
                            {b}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {detail.body?.some((b) => /预制|避坑|别点|别去/.test(b)) && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: "10px 12px",
                      borderRadius: 11,
                      background: "var(--c-chi-b)",
                      fontWeight: 400, fontSize: 12.5, lineHeight: 1.6,
                      color: "var(--warn)",
                    }}
                  >
                    避坑：{detail.body.find((b) => /预制|避坑|别点|别去/.test(b))}
                  </div>
                )}
                <div style={{ height: 16 }} />
              </div>
            </div>
            <div
              style={{
                flex: "none",
                padding: "12px 20px 24px",
                borderTop: "1px solid var(--line-2)",
                background: "#fff",
              }}
            >
              <div
                style={{
                  fontWeight: 400, fontSize: 11.5, lineHeight: 1.4,
                  color: "var(--ink-3)",
                  marginBottom: 9,
                }}
              >
                {detail.kind === "restaurant" ? "导航" : "下单"}会跳转到{detail.platform}
                ，回来跟我说好不好吃
              </div>
              <div style={{ display: "flex", gap: 9 }}>
                <button
                  className="btn s"
                  style={{ height: 46, borderRadius: 14, fontSize: 15 }}
                  onClick={async () => {
                    await fetch("/api/card", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        action: "wish",
                        conversationId: id,
                        agentId: detailAgent,
                        cardId: detail.id,
                      }),
                    });
                    setDetail(null);
                    toast.show("加进清单了");
                  }}
                >
                  加入清单
                </button>
                <button
                  className="btn p"
                  style={{ height: 46, borderRadius: 14, fontSize: 15 }}
                  onClick={() => handoff(detail)}
                >
                  {detail.kind === "restaurant" ? "导航前往" : "去下单"}
                </button>
              </div>
            </div>
          </>
        )}
      </Sheet>

      {/* 浮层 A Agent 名片 */}
      <Sheet open={!!profileOf} onClose={() => setProfileOf(null)}>
        {profileOf && agents[profileOf] && (
          <AgentCard
            agent={agents[profileOf]}
            onClose={() => setProfileOf(null)}
            onToast={toast.show}
          />
        )}
      </Sheet>

      <Toast text={toast.text} />
    </>
  );
}

function AgentCard({
  agent,
  onClose,
  onToast,
}: {
  agent: Agent;
  onClose: () => void;
  onToast: (t: string) => void;
}) {
  const pct = ((agent.level + 1) / 4) * 100;
  return (
    <>
      <div style={{ flex: 1, overflowY: "auto" }} className="no-scrollbar">
        <div
          style={{
            padding: "10px 20px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            className="av"
            style={{
              width: 74,
              height: 74,
              borderRadius: 24,
              background: agent.color,
              fontSize: 28,
            }}
          >
            {agent.emoji}
          </div>
          <div style={{ fontWeight: 600, fontSize: 19, lineHeight: 1.3, marginTop: 11 }}>{agent.name}</div>
          <div
            style={{
              fontWeight: 400, fontSize: 13, lineHeight: 1.5,
              color: "var(--ink-2)",
              marginTop: 3,
            }}
          >
            {agent.tagline}
          </div>
          <span
            className="tag"
            style={{ background: "rgba(35,39,30,.06)", color: "var(--ink-3)", marginTop: 8 }}
          >
            AI 角色 · 由官方策划
          </span>
        </div>

        <div style={{ padding: "18px 20px 0" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 400, fontSize: 12, lineHeight: 1,
              color: "var(--ink-2)",
            }}
          >
            <span>熟悉度 · {LEVELS[agent.level]}</span>
            <span style={{ color: "var(--ink-3)" }}>
              {agent.level < 3 ? `再聊 6 次到${LEVELS[agent.level + 1]}` : "已经是挚友"}
            </span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: "rgba(35,39,30,.08)",
              marginTop: 7,
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                borderRadius: 3,
                background: "linear-gradient(90deg,var(--brand),#8AA05F)",
              }}
            />
          </div>

          <div className="chips" style={{ padding: "14px 0 0" }}>
            {agent.traits.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>

          <p className="sec" style={{ margin: "20px 0 8px" }}>
            他能帮你做什么
          </p>
          <div style={{ fontWeight: 400, fontSize: 13.5, lineHeight: 1.8, color: "var(--ink-2)" }}>
            {agent.domain.map((d) => CAN[d] ?? d).join(" · ")} · 记住并改正你的偏好
          </div>

          <div
            style={{
              marginTop: 16,
              padding: "11px 13px",
              borderRadius: 12,
              background: "var(--cream)",
              fontWeight: 400, fontSize: 12.5, lineHeight: 1.6,
              color: "var(--ink-2)",
            }}
          >
            他的说话方式：{agent.voice}
          </div>

          {[
            ["主动频率", "标准"],
            ["每天最多主动开口", `${agent.quota} 次`],
          ].map(([k, v]) => (
            <div
              key={k}
              onClick={() => onToast(`${k}：${v}`)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 14,
                fontWeight: 400, fontSize: 13, lineHeight: 1,
                color: "var(--ink-2)",
              }}
            >
              <span style={{ flex: 1 }}>{k}</span>
              <span className="tag" style={{ background: "rgba(35,39,30,.06)" }}>
                {v}
              </span>
              <span style={{ color: "var(--ink-3)" }}>›</span>
            </div>
          ))}
          <div style={{ height: 8 }} />
        </div>
      </div>
      <div style={{ flex: "none", padding: "14px 20px 26px" }}>
        <button
          className="btn p"
          style={{ width: "100%", height: 46, borderRadius: 14, fontSize: 15 }}
          onClick={onClose}
        >
          进入单聊
        </button>
      </div>
    </>
  );
}
