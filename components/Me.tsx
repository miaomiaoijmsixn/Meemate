"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Avatar, BottomTabs, Segmented, Toast, useToast } from "./ui";
import { LEVELS, type Agent } from "@/lib/agents";

type Mem = {
  id: string;
  type: "diary" | "fact";
  day: string;
  grp: string | null;
  tag: string | null;
  text: string;
  source: "said" | "guess";
  hits: number;
  usable: number;
  chips?: Mem[];
};

const PROFILE_GRPS = ["饮食", "预算", "位置", "作息", "兴趣"];

/** 2026-08-11 显示成 8 月 11 日 周二 */
function cnDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(+d)) return iso;
  const w = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 周${w}`;
}

export function Me() {
  const highlight = useSearchParams().get("m");
  const [view, setView] = useState<"timeline" | "profile">(highlight ? "profile" : "timeline");
  const [diaries, setDiaries] = useState<Mem[]>([]);
  const [facts, setFacts] = useState<Mem[]>([]);
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const toast = useToast();

  const load = () =>
    fetch("/api/memory")
      .then((r) => r.json())
      .then((d) => {
        setDiaries(d.diaries);
        setFacts(d.facts);
      });

  useEffect(() => {
    load();
    fetch("/api/state")
      .then((r) => r.json())
      .then((s) => {
        setAgents(s.agents);
        setProfile(s.profile);
        setSettings(s.settings);
      });
  }, []);

  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(
      () =>
        document
          .getElementById(`m-${highlight}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      400,
    );
    return () => clearTimeout(t);
  }, [highlight, facts.length]);

  async function act(id: string, action: string, text?: string) {
    await fetch("/api/memory", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action, text }),
    });
    toast.show(
      action === "remove"
        ? "删了，下次不按这条推"
        : action === "unusable"
          ? "留在日记里，但不参与推荐"
          : action === "edit"
            ? "小咪说：我记错了，改过来了"
            : "这条继续用",
    );
    setEditing(null);
    setOpenRow(null);
    load();
  }

  const factRow = (f: Mem) => (
    <div
      key={f.id}
      id={`m-${f.id}`}
      onClick={() => setOpenRow(openRow === f.id ? null : f.id)}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        background: highlight === f.id ? "var(--lemon)" : "#fff",
        boxShadow: "var(--shadow-card)",
        opacity: f.usable ? 1 : 0.5,
      }}
    >
      {editing === f.id ? (
        <div style={{ display: "flex", gap: 7 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{
              flex: 1,
              padding: "6px 10px",
              borderRadius: 9,
              border: "1px solid var(--line)",
              fontWeight: 400, fontSize: 13.5, lineHeight: 1.4,
              outline: "none",
              background: "var(--surface)",
            }}
          />
          <button
            className="btn p"
            style={{ flex: "none", width: 48, height: 30, fontSize: 12.5 }}
            onClick={(e) => {
              e.stopPropagation();
              act(f.id, "edit", draft);
            }}
          >
            存
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ flex: 1, fontWeight: 400, fontSize: 13.5, lineHeight: 1.45 }}>{f.text}</span>
            <span
              className="tag"
              style={
                f.source === "guess"
                  ? { background: "var(--cream)", color: "#8A6A3F" }
                  : { background: "rgba(79,96,53,.1)", color: "var(--brand)" }
              }
            >
              {f.source === "guess" ? "猜测" : f.hits > 1 ? `说过 ×${f.hits}` : "说过"}
            </span>
          </div>
          {openRow === f.id && (
            <div style={{ display: "flex", gap: 14, marginTop: 9 }}>
              {(
                [
                  ["改一下", () => (setEditing(f.id), setDraft(f.text))],
                  [
                    f.usable ? "以后别用这条推荐" : "重新启用",
                    () => act(f.id, f.usable ? "unusable" : "usable"),
                  ],
                  ["删除", () => act(f.id, "remove")],
                ] as const
              ).map(([label, fn]) => (
                <button
                  key={label}
                  onClick={(e) => {
                    e.stopPropagation();
                    fn();
                  }}
                  style={{
                    fontWeight: 400, fontSize: 12, lineHeight: 1,
                    color: label === "删除" ? "#9A3B33" : "var(--brand)",
                    background: "none",
                    border: 0,
                    padding: 0,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  const grp = (names: string[]) => facts.filter((f) => names.includes(f.grp ?? ""));

  return (
    <>
      {/* 设计稿里我的页没有单独的标题栏，画像块本身就是页头 */}
      <div
        style={{
          padding: "6px 16px 12px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          flex: "none",
        }}
      >
        <div
          className="av"
          style={{
            width: 50,
            height: 50,
            borderRadius: 17,
            background: "var(--pink)",
            color: "#7A3F3F",
            fontSize: 17,
          }}
        >
          我
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 17, lineHeight: 1.3 }}>{profile?.nickname || "你"}</div>
          <div
            style={{
              fontWeight: 400, fontSize: 12, lineHeight: 1.5,
              color: "var(--ink-2)",
              marginTop: 2,
            }}
          >
            {facts.length
              ? facts.slice(0, 2).map((f) => f.text).join("、")
              : "小咪还没什么印象，多聊几句"}
          </div>
        </div>
      </div>

      <Segmented
        value={view}
        onChange={setView}
        options={[
          { v: "timeline", label: "时间轴" },
          { v: "profile", label: "画像" },
        ]}
      />

      <div
        style={{ flex: 1, overflowY: "auto", padding: "0 16px 20px" }}
        className="no-scrollbar"
      >
        {view === "timeline" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                fontWeight: 400, fontSize: 11.5, lineHeight: 1.6,
                color: "var(--ink-3)",
                padding: "2px 2px 4px",
              }}
            >
              日记是记忆的自然语言版本，画像只是它的结构化抽取。改这里，下一次推荐就会变。
            </div>

            {!diaries.length && (
              <div
                style={{
                  padding: "40px 24px",
                  textAlign: "center",
                  fontWeight: 400, fontSize: 13.5, lineHeight: 1.7,
                  color: "var(--ink-3)",
                }}
              >
                还没有日记。用时间机器触发一次晚间日记，小咪会按今天的动作写几句并抽出记忆
              </div>
            )}

            {diaries.map((d) => (
              <div
                key={d.id}
                style={{
                  padding: "13px 14px",
                  borderRadius: 15,
                  background: "#fff",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.3 }}>{cnDate(d.day)}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontWeight: 400, fontSize: 11, lineHeight: 1, color: "var(--ink-3)" }}>
                    小咪写的
                  </span>
                </div>
                <div
                  style={{
                    fontWeight: 400, fontSize: 13.5, lineHeight: 1.75,
                    color: "var(--ink-2)",
                    marginTop: 7,
                  }}
                >
                  {d.text}
                </div>
                {!!d.chips?.length && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <div
                      className="img"
                      style={{ width: 46, height: 46, borderRadius: 9, fontSize: 18, flex: "none" }}
                    >
                      🐱
                    </div>
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 5,
                        alignContent: "flex-start",
                      }}
                    >
                      {d.chips.map((c) => (
                        <button
                          key={c.id}
                          className="tag"
                          style={{ background: "var(--cream)", color: "var(--brand)", border: 0 }}
                          onClick={() => act(c.id, "remove")}
                          title="点一下删掉这条记忆"
                        >
                          {c.text} ×
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div
                  style={{ fontWeight: 400, fontSize: 11.5, lineHeight: 1, color: "var(--ink-3)", marginTop: 10 }}
                >
                  ＋ 追加一句
                </div>
              </div>
            ))}

            {diaries.length > 1 && (
              <div
                style={{
                  padding: "11px 14px",
                  borderRadius: 15,
                  background: "var(--lemon)",
                  fontWeight: 400, fontSize: 12.5, lineHeight: 1.6,
                  color: "#414A2B",
                }}
              >
                本月回顾：一共 {diaries.length} 天有记录，
                {facts.length} 条偏好被记下来了。
              </div>
            )}
          </div>
        )}

        {view === "profile" && (
          <>
            {!facts.length && (
              <div
                style={{
                  padding: "40px 24px",
                  textAlign: "center",
                  fontWeight: 400, fontSize: 13.5, lineHeight: 1.7,
                  color: "var(--ink-3)",
                }}
              >
                画像是空的。走一遍冷启动，或者在群里点几次不感兴趣，这里就会长出东西
              </div>
            )}

            {!!grp(PROFILE_GRPS).length && (
              <>
                <p className="sec" style={{ margin: "2px 0 8px" }}>
                  档案层 · 长期稳定
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {grp(PROFILE_GRPS).map(factRow)}
                </div>
              </>
            )}

            {!!grp(["近况"]).length && (
              <>
                <p className="sec" style={{ margin: "16px 0 8px" }}>
                  近况层 · 会过期
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {grp(["近况"]).map(factRow)}
                </div>
              </>
            )}

            {!!grp(["经历"]).length && (
              <>
                <p className="sec" style={{ margin: "16px 0 8px" }}>
                  经历层 · 去过看过
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {grp(["经历"]).map(factRow)}
                </div>
              </>
            )}

            <p className="sec" style={{ margin: "16px 0 8px" }}>
              我的朋友
            </p>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              {Object.values(agents).map((a) => (
                <div
                  key={a.id}
                  style={{
                    flex: "1 1 28%",
                    padding: 10,
                    borderRadius: 12,
                    background: "#fff",
                    textAlign: "center",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <Avatar agent={a} size={32} style={{ margin: "0 auto" }} />
                  <div style={{ fontWeight: 500, fontSize: 11.5, lineHeight: 1.4, marginTop: 5 }}>{a.short}</div>
                  <div style={{ fontWeight: 400, fontSize: 10.5, lineHeight: 1.3, color: "var(--ink-3)" }}>
                    {LEVELS[a.level]}
                  </div>
                </div>
              ))}
            </div>

            <p className="sec" style={{ margin: "16px 0 8px" }}>
              打扰与授权
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <span style={{ flex: 1, fontWeight: 400, fontSize: 13.5, lineHeight: 1.4 }}>
                  免打扰 {settings?.quiet?.[0]} – {settings?.quiet?.[1]}
                </span>
                <span className="toggle" data-on="1">
                  <span />
                </span>
              </div>

              {(
                [
                  ["reminder", "任务提醒"],
                  ["meal", "饭点推荐"],
                  ["weekend", "周末推荐"],
                ] as const
              ).map(([k, label]) => {
                const on = settings?.push?.[k] ?? true;
                return (
                  <div
                    key={k}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    <span style={{ flex: 1, fontWeight: 400, fontSize: 13.5, lineHeight: 1.4 }}>{label}</span>
                    <button
                      className="toggle"
                      data-on={on ? "1" : "0"}
                      onClick={async () => {
                        const s = { ...settings, push: { ...settings.push, [k]: !on } };
                        setSettings(s);
                        await fetch("/api/settings", {
                          method: "PATCH",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ settings: s }),
                        });
                      }}
                    >
                      <span />
                    </button>
                  </div>
                );
              })}

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "#fff",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div style={{ fontWeight: 400, fontSize: 13.5, lineHeight: 1.4, marginBottom: 8 }}>最近别找我</div>
                <div style={{ display: "flex", gap: 7 }}>
                  {[3, 7, 0].map((d) => (
                    <button
                      key={d}
                      className="chip"
                      onClick={async () => {
                        await fetch("/api/settings", {
                          method: "PATCH",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ silenceDays: d }),
                        });
                        toast.show(d ? `好，${d} 天内他们都不找你` : "解除静默");
                      }}
                    >
                      {d ? `${d} 天` : "解除"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                className="btn s"
                style={{ height: 42, borderRadius: 12 }}
                onClick={() => {
                  const blob = new Blob([JSON.stringify({ diaries, facts }, null, 2)], {
                    type: "application/json",
                  });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "meemate-memory.json";
                  a.click();
                }}
              >
                导出记忆
              </button>
              <button
                className="btn s"
                style={{ height: 42, borderRadius: 12, color: "#9A3B33" }}
                onClick={async () => {
                  if (!confirm("清空后他们会重新变成陌生人，确定？")) return;
                  await fetch("/api/reset", { method: "POST" });
                  location.href = "/";
                }}
              >
                清空全部
              </button>
            </div>
          </>
        )}
      </div>

      <Toast text={toast.text} />
      <BottomTabs />
    </>
  );
}
