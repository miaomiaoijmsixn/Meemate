"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Avatar, BackNav, Toast, useToast } from "./ui";
import type { Agent } from "@/lib/agents";

type Item = {
  id: string;
  seq: number;
  start: string;
  dur: number;
  title: string;
  addr?: string;
  booking?: boolean;
  link?: string;
  price?: number;
  transit?: string;
  agentId?: string;
};
type Plan = {
  id: string;
  day: string;
  date: string;
  confirmed: boolean;
  params: { start: string; transit: string; pace: string };
  thinking: string[];
  notes: string[];
  items: Item[];
};

/** 演示用天气：按月份给季节口径，真上线换和风天气 */
function weatherOf(iso: string) {
  const m = Number(iso.slice(5, 7));
  if (m >= 6 && m <= 8)
    return { sky: "多云转晴", temp: "28 到 34 度", tip: "夏日炎炎，记得做好防晒，水别忘了带喵" };
  if (m >= 3 && m <= 5)
    return { sky: "晴", temp: "18 到 25 度", tip: "风还有点大，外套别脱太早喵" };
  if (m >= 9 && m <= 11)
    return { sky: "晴", temp: "15 到 23 度", tip: "早晚温差大，带件薄外套比较稳喵" };
  return { sky: "多云", temp: "零下 3 到 5 度", tip: "外面冷，围巾手套记得戴喵" };
}

const cnDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(+d)) return "";
  const w = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日周${w}`;
};

export function PlanView() {
  const { id } = useParams<{ id: string }>();
  const fresh = useSearchParams().get("fresh") === "1";
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [shown, setShown] = useState<string[]>([]);
  const [done, setDone] = useState(!fresh);
  const [why, setWhy] = useState(false);
  const toast = useToast();
  const ran = useRef(false);
  const confirmed = useRef(false);

  useEffect(() => {
    fetch("/api/state").then((r) => r.json()).then((s) => setAgents(s.agents));
  }, []);

  useEffect(() => {
    fetch(`/api/plan?id=${id}`)
      .then((r) => r.json())
      .then((p: Plan) => {
        setPlan(p);
        if (!fresh || ran.current) return;
        ran.current = true;
        p.thinking.forEach((t, i) =>
          setTimeout(() => {
            setShown((prev) => [...prev, t]);
            if (i === p.thinking.length - 1) setTimeout(() => setDone(true), 900);
          }, 700 + i * 1150),
        );
      });
  }, [id, fresh]);

  /** 提醒默认开启：不再让用户点「加入提醒」，进页面就写进待办（接口幂等） */
  useEffect(() => {
    if (!plan || plan.confirmed || confirmed.current) return;
    confirmed.current = true;
    fetch("/api/plan", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, confirm: true }),
    })
      .then((r) => r.json())
      .then((r) => {
        if (r.ok && !r.already) toast.show(`${r.todos} 个节点已加入提醒，出发前一小时叫你`);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, id]);

  async function move(idx: number, dir: -1 | 1) {
    if (!plan) return;
    const arr = [...plan.items];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    const p = await fetch("/api/plan", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, order: arr.map((x) => x.id) }),
    }).then((r) => r.json());
    setPlan(p);
    const warn = (p.notes as string[]).find((n) => /赶不上|干等/.test(n));
    if (warn) toast.show(warn);
  }

  if (!plan)
    return (
      <>
        <BackNav title="行程详情" fallback="/life?tab=plan" />
        <div style={{ flex: 1 }} />
      </>
    );

  const conflicts = plan.notes.filter((n) => /赶不上|干等|冲突|闭馆|起不来/.test(n));

  // 生成过程：等待本身就是能力的证明
  if (!done)
    return (
      <>
        <BackNav title={`正在排${plan.day}`} fallback="/life?tab=plan" />
        <div style={{ flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {shown.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Avatar agent={agents.mimi} size={26} />
              <div
                className="bub"
                style={{
                  background: "var(--c-mi-b)",
                  opacity: i === shown.length - 1 ? 1 : 0.5,
                  maxWidth: 250,
                }}
              >
                {t}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 5, paddingLeft: 36 }}>
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        </div>
      </>
    );

  const w = weatherOf(plan.date);

  return (
    <>
      <BackNav title={`行程详情 · ${cnDate(plan.date)}`} fallback="/life?tab=plan" />

      <div style={{ flex: 1, overflowY: "auto" }} className="no-scrollbar">
        {/* 天气与出门提醒，替掉原来的时长站数统计 */}
        <div
          style={{
            margin: "0 16px",
            padding: "13px 15px",
            borderRadius: 14,
            background: "var(--brand)",
            color: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 17, lineHeight: 1.3 }}>{w.temp}</span>
            <span style={{ fontWeight: 400, fontSize: 12.5, lineHeight: 1, opacity: 0.85 }}>
              {w.sky}
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ fontWeight: 400, fontSize: 11.5, lineHeight: 1, opacity: 0.75 }}>
              {plan.params.transit}优先
            </span>
          </div>
          <div
            style={{
              marginTop: 9,
              paddingTop: 9,
              borderTop: "1px solid rgba(255,255,255,.2)",
              fontWeight: 400,
              fontSize: 12.5,
              lineHeight: 1.5,
              opacity: 0.92,
            }}
          >
            {w.tip}
          </div>
        </div>

        <div style={{ padding: "16px 16px 0" }}>
          {plan.items.map((it, idx) => (
            <div key={it.id}>
              {it.transit && (
                <div
                  style={{
                    padding: "7px 0 7px 51px",
                    fontWeight: 400,
                    fontSize: 11.5,
                    lineHeight: 1,
                    color: "var(--ink-3)",
                  }}
                >
                  {it.transit}
                </div>
              )}
              <div style={{ display: "flex", gap: 11 }}>
                <div
                  style={{
                    flex: "none",
                    width: 40,
                    textAlign: "right",
                    fontWeight: 500,
                    fontSize: 12.5,
                    lineHeight: 1.4,
                    color: "var(--ink-2)",
                    paddingTop: 11,
                  }}
                >
                  {it.start}
                </div>
                <div
                  style={{
                    flex: 1,
                    padding: "11px 13px",
                    borderRadius: 13,
                    background: "#fff",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.3, flex: 1 }}>
                      {it.title}
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <button
                        onClick={() => move(idx, -1)}
                        className="cbox"
                        style={{ width: 20, height: 16, color: "var(--ink-2)", fontSize: 9 }}
                        aria-label="往前挪"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(idx, 1)}
                        className="cbox"
                        style={{ width: 20, height: 16, color: "var(--ink-2)", fontSize: 9 }}
                        aria-label="往后挪"
                      >
                        ↓
                      </button>
                    </span>
                  </div>

                  {/* 只留地址与停留时间，不再放推荐语 */}
                  <div
                    style={{
                      fontWeight: 400,
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: "var(--brand)",
                      marginTop: 4,
                    }}
                  >
                    {[it.addr, `停留 ${it.dur} 分钟`].filter(Boolean).join(" · ")}
                  </div>

                  <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
                    <button
                      className="btn s"
                      style={{ flex: "none", width: 70, height: 28, fontSize: 12 }}
                      onClick={() => {
                        if (it.link) window.open(it.link, "_blank", "noopener");
                        else toast.show("这一站没有地图链接");
                      }}
                    >
                      导航
                    </button>
                    {it.booking && (
                      <button
                        className="btn p"
                        style={{ flex: "none", width: 70, height: 28, fontSize: 12 }}
                        onClick={() => {
                          if (it.link) window.open(it.link, "_blank", "noopener");
                          toast.show("订票要提前，别到门口才想起来");
                        }}
                      >
                        订票
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!!conflicts.length && (
          <div
            style={{
              margin: "14px 16px 0",
              padding: "11px 13px",
              borderRadius: 12,
              background: "var(--c-chi-b)",
              fontWeight: 400,
              fontSize: 12.5,
              lineHeight: 1.6,
              color: "var(--warn)",
            }}
          >
            {conflicts[0]}
          </div>
        )}

        <div
          style={{
            padding: "12px 16px 20px",
            fontWeight: 400,
            fontSize: 11,
            lineHeight: 1.6,
            color: "var(--ink-3)",
          }}
        >
          调整顺序后小咪会重算时间并提示冲突。提醒已经默认开好了。
        </div>
      </div>

      {/* 小咪的对话框挪到底部：她是排这趟行程的人，收尾比开头合适 */}
      <button
        onClick={() => setWhy((v) => !v)}
        style={{
          flex: "none",
          margin: "0 16px",
          marginBottom: "calc(12px + env(safe-area-inset-bottom))",
          padding: "10px 12px",
          borderRadius: 14,
          background: "var(--c-mi-b)",
          border: "1px solid var(--line-2)",
          display: "flex",
          gap: 10,
          alignItems: "center",
          textAlign: "left",
        }}
      >
        <div style={{ position: "relative", flex: "none", width: 32, height: 32 }}>
          <Avatar agent={agents.mimi} size={32} />
          <span
            style={{
              position: "absolute",
              right: -1,
              bottom: -1,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "var(--brand)",
              boxShadow: "0 0 0 2px var(--c-mi-b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 600,
              fontSize: 7,
              lineHeight: 1,
            }}
          >
            ✓
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 13, lineHeight: 1.4 }}>
            {conflicts.length
              ? `帮你避开了 ${conflicts.length} 个冲突，排好啦`
              : "排好啦，没有冲突喵"}
          </div>
          <div className="t-min" style={{ color: "var(--ink-3)", marginTop: 2 }}>
            {why ? "收起我的排法" : `看了 ${plan.thinking.length} 条约束 · 点开看我怎么排的`}
          </div>
        </div>
        <span style={{ color: "var(--ink-3)", fontSize: 11 }}>{why ? "▼" : "▲"}</span>
      </button>

      {why && (
        <div
          style={{
            flex: "none",
            margin: "0 16px 12px",
            padding: "11px 13px",
            borderRadius: 13,
            background: "var(--cream)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: 190,
            overflowY: "auto",
          }}
          className="no-scrollbar"
        >
          {plan.thinking.map((t, i) => (
            <div
              key={i}
              style={{ fontWeight: 400, fontSize: 12.5, lineHeight: 1.5, color: "var(--brand)" }}
            >
              ✓ {t}
            </div>
          ))}
          {plan.notes
            .filter((n) => !conflicts.includes(n))
            .map((n, i) => (
              <div
                key={i}
                style={{ fontWeight: 400, fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-3)" }}
              >
                · {n}
              </div>
            ))}
        </div>
      )}

      <Toast text={toast.text} />
    </>
  );
}
