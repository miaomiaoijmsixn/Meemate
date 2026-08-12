"use client";

import { useEffect, useRef, useState } from "react";

export type Tag = { name: string; on: boolean; custom?: boolean };
export type Pref = { min: number; max: number; tags: Tag[] };

/**
 * 群聊顶部常驻的偏好设置。初值来自冷启动，改了立刻影响推荐与菜单，
 * 并且写回记忆（价格区间是画像里的一条，不是临时筛选）。
 */
export function PrefBar({
  conversationId,
  onChange,
}: {
  conversationId: string;
  onChange?: (p: Pref) => void;
}) {
  const [pref, setPref] = useState<Pref | null>(null);
  const [ceil, setCeil] = useState(120);
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/prefs?c=${conversationId}`)
      .then((r) => r.json())
      .then((d) => {
        setPref(d.pref);
        setCeil(d.ceil);
      });
  }, [conversationId]);

  /** 滑条与标签都是高频操作，防抖后落库，避免每一像素打一次接口 */
  function commit(next: Pref, instant = false) {
    setPref(next);
    onChange?.(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () =>
        fetch("/api/prefs", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ conversationId, pref: next }),
        }).then(() => onChange?.(next)),
      instant ? 0 : 420,
    );
  }

  if (!pref) return null;
  const pct = (v: number) => (v / ceil) * 100;

  return (
    <div
      style={{
        flex: "none",
        borderBottom: "1px solid var(--line-2)",
        background: "var(--cream)",
        padding: open ? "9px 14px 10px" : "7px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 500, fontSize: 11, lineHeight: 1, color: "var(--brand)", letterSpacing: ".06em" }}>
          我的偏好
        </span>
        {!open && (
          <span
            style={{
              fontWeight: 400, fontSize: 11.5, lineHeight: 1,
              color: "var(--ink-2)",
              flex: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            ¥{pref.min}–{pref.max}
            {pref.tags.filter((t) => t.on).map((t) => ` · ${t.name}`)}
          </span>
        )}
        {open && <span style={{ flex: 1 }} />}
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            fontWeight: 400, fontSize: 11.5, lineHeight: 1,
            color: "var(--ink-3)",
            background: "none",
            border: 0,
          }}
        >
          {open ? "收起 ▲" : "展开 ▼"}
        </button>
      </div>

      {open && (
        <>
          {/* 价格区间双滑块 */}
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 400, fontSize: 11, lineHeight: 1,
                color: "var(--ink-3)",
                marginBottom: 6,
              }}
            >
              <span>{conversationId === "g-weekend" ? "门票预算" : "价格区间"}</span>
              <span style={{ color: "var(--brand)", fontWeight: 500 }}>
                ¥{pref.min} – {pref.max}
                {pref.max >= ceil ? "+" : ""}
              </span>
            </div>
            <div style={{ position: "relative", height: 22 }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 9,
                  height: 4,
                  borderRadius: 2,
                  background: "rgba(35,39,30,.12)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 9,
                  height: 4,
                  borderRadius: 2,
                  background: "var(--brand)",
                  left: `${pct(pref.min)}%`,
                  right: `${100 - pct(pref.max)}%`,
                }}
              />
              {(["min", "max"] as const).map((k) => (
                <input
                  key={k}
                  type="range"
                  min={0}
                  max={ceil}
                  step={2}
                  value={pref[k]}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    commit(
                      k === "min"
                        ? { ...pref, min: Math.min(v, pref.max - 2) }
                        : { ...pref, max: Math.max(v, pref.min + 2) },
                    );
                  }}
                  className="rng"
                  aria-label={k === "min" ? "价格下限" : "价格上限"}
                />
              ))}
            </div>
          </div>

          {/* 偏好标签 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {pref.tags.map((t, i) => (
              <button
                key={t.name}
                className="chip"
                data-on={t.on ? "1" : "0"}
                style={{ fontSize: 11.5, padding: "5px 10px" }}
                onClick={() => {
                  if (editing) {
                    commit(
                      { ...pref, tags: pref.tags.filter((_, j) => j !== i) },
                      true,
                    );
                    return;
                  }
                  const tags = pref.tags.map((x, j) => (j === i ? { ...x, on: !x.on } : x));
                  commit({ ...pref, tags }, true);
                }}
              >
                {t.name}
                {editing ? " ×" : ""}
              </button>
            ))}

            {adding ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => (setAdding(false), setDraft(""))}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const name = draft.trim();
                  if (!name || pref.tags.some((t) => t.name === name)) {
                    setAdding(false);
                    setDraft("");
                    return;
                  }
                  commit(
                    { ...pref, tags: [...pref.tags, { name, on: true, custom: true }] },
                    true,
                  );
                  setAdding(false);
                  setDraft("");
                }}
                placeholder="自定义标签"
                style={{
                  width: 92,
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--brand)",
                  fontWeight: 400, fontSize: 11.5, lineHeight: 1,
                  outline: "none",
                  background: "#fff",
                }}
              />
            ) : (
              <button
                className="chip"
                style={{ fontSize: 11.5, padding: "5px 10px" }}
                onClick={() => setAdding(true)}
              >
                ＋
              </button>
            )}
            <button
              className="chip"
              style={{
                fontSize: 11.5,
                padding: "5px 10px",
                color: editing ? "#9A3B33" : "var(--ink-3)",
              }}
              onClick={() => setEditing((e) => !e)}
            >
              {editing ? "完成" : "编辑"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
