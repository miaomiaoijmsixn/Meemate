"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TRIGGERS = [
  { k: "morning", label: "早报", hint: "08:00 小咪单聊" },
  { k: "lunch", label: "午饭", hint: "11:20 吃什么" },
  { k: "dinner", label: "晚饭", hint: "17:40 吃什么" },
  { k: "weekend", label: "周末", hint: "周四 20:00 周末去哪" },
  { k: "diary", label: "日记", hint: "22:30 写进记忆" },
];

/** 演示用时间机器。真上线时这些由 cron 打，闸门逻辑是同一套。 */
export function DemoBar({ llm }: { llm?: boolean }) {
  const [open, setOpen] = useState(false);
  const [gate, setGate] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function fire(k: string) {
    setMsg("正在编排…");
    const r = await fetch("/api/trigger", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: k, force: !gate }),
    }).then((x) => x.json());
    if (!r.ok) {
      setMsg(r.reason ?? "被闸门拦住了");
      setTimeout(() => setMsg(null), 2600);
      return;
    }
    setMsg(null);
    setOpen(false);
    router.push(`/chat/${r.conversationId}`);
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        title="时间机器"
        style={{
          position: "absolute",
          right: 14,
          bottom: 88,
          zIndex: 20,
          width: 42,
          height: 42,
          borderRadius: "50%",
          background: "#fff",
          border: "1px solid var(--line)",
          boxShadow: "0 6px 18px rgba(35,39,30,.14)",
          fontSize: 17,
        }}
      >
        ⏱
      </button>
    );

  return (
    <div
      style={{
        position: "absolute",
        left: 14,
        right: 14,
        bottom: 88,
        zIndex: 20,
        background: "#fff",
        borderRadius: 16,
        padding: 13,
        boxShadow: "0 10px 30px rgba(35,39,30,.16)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1, flex: 1 }}>时间机器</div>
        <button
          onClick={() => setOpen(false)}
          style={{ fontWeight: 400, fontSize: 12.5, lineHeight: 1, color: "var(--brand)", background: "none", border: 0 }}
        >
          收起
        </button>
      </div>
      <div style={{ fontWeight: 400, fontSize: 11.5, lineHeight: 1.6, color: "var(--ink-3)", marginBottom: 10 }}>
        主动消息本来由定时任务触发，演示时手动打一下。
        {llm ? "当前接了真模型。" : "当前用内置剧本，未接模型。"}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {TRIGGERS.map((t) => (
          <button key={t.k} className="chip" title={t.hint} onClick={() => fire(t.k)}>
            {t.label}
          </button>
        ))}
        <button
          className="chip"
          style={{ color: "#9A3B33" }}
          onClick={async () => {
            if (!confirm("清空所有消息、记忆、清单，回到新用户？")) return;
            await fetch("/api/reset", { method: "POST" });
            location.href = "/";
          }}
        >
          重置
        </button>
      </div>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginTop: 10,
          fontWeight: 400, fontSize: 11.5, lineHeight: 1.4,
          color: "var(--ink-3)",
        }}
      >
        <input type="checkbox" checked={gate} onChange={(e) => setGate(e.target.checked)} />
        走配额与免打扰闸门（关掉就直接发）
      </label>
      {msg && (
        <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, lineHeight: 1.5, color: "var(--brand)" }}>
          {msg}
        </div>
      )}
    </div>
  );
}
