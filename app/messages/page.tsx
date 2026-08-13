"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar, BottomTabs, GroupAvatar, Nav } from "@/components/ui";
import { DemoBar } from "@/components/DemoBar";
import type { Agent } from "@/lib/agents";

type Conv = {
  id: string;
  kind: "single" | "group";
  title: string;
  members: string[];
  pinned: boolean;
  muted: boolean;
  live: boolean;
  preview: { senderName?: string; text: string; at: number; mention?: boolean } | null;
};

const when = (t: number) => {
  const d = new Date(t);
  const now = new Date();
  const days = Math.floor((+new Date(now.toDateString()) - +new Date(d.toDateString())) / 86400000);
  if (days === 0)
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (days === 1) return "昨天";
  if (days < 7) return ["日", "一", "二", "三", "四", "五", "六"][d.getDay()].replace(/^/, "周");
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

export default function Messages() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [plan, setPlan] = useState<string | null>(null);
  const [todos, setTodos] = useState(0);
  const [llm, setLlm] = useState(false);
  // 只给首次拉取用：轮询刷新时列表已经有内容，不该再闪一遍骨架屏
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      fetch("/api/state")
        .then((r) => r.json())
        .then((s) => {
          setConvs(s.conversations);
          setAgents(s.agents);
          setPlan(s.latestPlan);
          setTodos(s.openTodos);
          setLlm(s.llm);
          setLoading(false);
        });
    load();
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <Nav title="消息" right={<div className="plus">＋</div>} />

      {(plan || todos > 0) && (
        <Link
          href={plan ? `/plan/${plan}` : "/life"}
          style={{
            margin: "0 16px 10px",
            padding: "10px 12px",
            borderRadius: 13,
            background: "var(--lemon)",
            display: "flex",
            alignItems: "center",
            gap: 9,
            flex: "none",
          }}
        >
          <div
            className="av"
            style={{ width: 22, height: 22, background: "var(--brand)", fontSize: 11 }}
          >
            🐱
          </div>
          <div style={{ fontWeight: 500, fontSize: 13, lineHeight: 1.35, flex: 1, color: "var(--ink)" }}>
            {plan ? "小咪给你排好了行程" : `还有 ${todos} 件事没做`}
          </div>
          <div style={{ color: "var(--ink-2)", fontSize: 16 }}>›</div>
        </Link>
      )}

      <div style={{ flex: 1, overflowY: "auto" }} className="no-scrollbar">
        {loading &&
          [46, 46, 46].map((_, i) => (
            <div key={i} className="li">
              <div className="skel" style={{ width: 46, height: 46, borderRadius: "50%", flex: "none" }} />
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                <div className="skel" style={{ width: "38%", height: 13, borderRadius: 6 }} />
                <div className="skel" style={{ width: "68%", height: 12, borderRadius: 6 }} />
              </div>
            </div>
          ))}

        {!loading && convs.map((c) => {
          const members = c.members.map((m) => agents[m]).filter(Boolean);
          return (
            <Link key={c.id} href={`/chat/${c.id}`}>
              <div
                className="li"
                style={{
                  background: c.pinned ? "rgba(231,229,124,.16)" : undefined,
                  opacity: c.muted ? 0.55 : 1,
                }}
              >
                {c.kind === "single" ? (
                  <Avatar agent={members[0]} size={46} ring={c.pinned} />
                ) : (
                  <GroupAvatar members={members} size={46} />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline" }}>
                    <span style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>{c.title}</span>
                    {c.pinned && (
                      <span
                        className="tag"
                        style={{
                          background: "rgba(79,96,53,.1)",
                          color: "var(--brand)",
                          marginLeft: 6,
                        }}
                      >
                        置顶
                      </span>
                    )}
                    {c.kind === "group" && (
                      <span
                        style={{
                          fontWeight: 400, fontSize: 11.5, lineHeight: 1,
                          color: "var(--ink-3)",
                          marginLeft: 6,
                        }}
                      >
                        {c.members.length + 1} 人
                      </span>
                    )}
                    {c.muted && (
                      <span
                        className="tag"
                        style={{
                          background: "rgba(35,39,30,.07)",
                          color: "var(--ink-3)",
                          marginLeft: 6,
                        }}
                      >
                        免打扰
                      </span>
                    )}
                    <span style={{ flex: 1 }} />
                    <span style={{ fontWeight: 400, fontSize: 11.5, lineHeight: 1, color: "var(--ink-3)" }}>
                      {c.preview ? when(c.preview.at) : ""}
                    </span>
                  </div>
                  <div
                    style={{
                      fontWeight: 400, fontSize: 13.5, lineHeight: 1.4,
                      color: "var(--ink-2)",
                      marginTop: 3,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.preview
                      ? `${c.kind === "group" && c.preview.senderName !== "你" ? c.preview.senderName + "：" : ""}${c.preview.text}`
                      : c.kind === "group"
                        ? "到点他们会自己开口"
                        : "有事直接说"}
                  </div>
                </div>

                {c.preview?.mention ? (
                  <span className="tag" style={{ background: "var(--pink)", color: "#7A3F3F" }}>
                    @我
                  </span>
                ) : c.live ? (
                  <span
                    style={{
                      flex: "none",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--brand)",
                    }}
                  />
                ) : null}
              </div>
            </Link>
          );
        })}

        <div
          style={{
            padding: "22px 26px",
            fontWeight: 400, fontSize: 11.5, lineHeight: 1.7,
            color: "var(--ink-3)",
            textAlign: "center",
          }}
        >
          右下角的时间机器可以立刻触发饭点、周末和晚间日记
        </div>
      </div>

      <DemoBar llm={llm} />
      <BottomTabs badge={todos} />
    </>
  );
}
