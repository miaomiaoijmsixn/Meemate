"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AGENTS } from "@/lib/agents";

/**
 * P1 登录页。
 *
 * 修复历史（iOS Safari 卡在猫脸的根因）：老版本用一个 `ready` 状态门控 UI，
 * fetch 完才让页面显示；接了 Turso 之后 Vercel 冷启动 + 出海 SQL 常常几秒
 * 起，iOS Safari 又会把 pending 的 fetch 挂到后台不动，结果整个屏幕永远
 * 只有一只猫脸。
 *
 * 现在的做法：登录页永远立刻渲染。fetch 只是「顺便」看看是否要跳过它，
 * 加了超时和 catch 兜底；它做任何事都不再阻挡按钮显示。
 */
export default function Login() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  useEffect(() => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 4500);
    fetch("/api/state", { signal: ac.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((s) => {
        if (s?.onboarded) router.replace("/messages");
      })
      .catch(() => {
        /* 超时或失败：留在登录页，用户可以点开始聊天 */
      })
      .finally(() => clearTimeout(timer));
    return () => {
      ac.abort();
      clearTimeout(timer);
    };
  }, [router]);

  // 循环演示：两句对话、一张卡、一次选择
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s % 4) + 1), 1500);
    return () => clearInterval(id);
  }, []);

  const wai = AGENTS.waimai;
  const chi = AGENTS.laochi;
  const show = (n: number) => (step >= n ? 1 : 0);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "0 26px",
        background: "linear-gradient(180deg,#FDFCFA 0%,#F4F2E8 55%,#E9EBD6 100%)",
        overflow: "hidden",
      }}
    >
      <div
        className="av"
        style={{
          width: 54,
          height: 54,
          borderRadius: 17,
          background: "var(--c-mi)",
          fontSize: 22,
          color: "#5B4630",
          margin: "14px 0 18px",
        }}
      >
        🐱
      </div>
      <h1 style={{ margin: 0, fontWeight: 600, fontSize: 27, lineHeight: 1.35, letterSpacing: "-.01em" }}>
        几个朋友，
        <br />
        会主动找你说话
      </h1>
      <p
        style={{
          margin: "12px 0 0",
          fontWeight: 400, fontSize: 14.5, lineHeight: 1.6,
          color: "var(--ink-2)",
          maxWidth: 270,
        }}
      >
        他们记得你的口味和节奏，
        <br />
        在你要做决定的那一刻先开口。
      </p>

      <div
        style={{
          marginTop: 22,
          width: 236,
          borderRadius: 26,
          background: "#fff",
          boxShadow: "0 12px 30px rgba(35,39,30,.10)",
          padding: "14px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 7,
          textAlign: "left",
        }}
      >
        <div
          style={{
            fontWeight: 500, fontSize: 10.5, lineHeight: 1,
            color: "var(--ink-3)",
            textAlign: "center",
            marginBottom: 2,
          }}
        >
          吃什么群 · 17:40
        </div>
        <div className="row" style={{ opacity: show(1), transition: "opacity .4s" }}>
          <div className="av" style={{ background: wai.color, width: 26, height: 26, fontSize: 12 }}>
            {wai.emoji}
          </div>
          <div className="bub" style={{ background: wai.tint, fontSize: 13, padding: "7px 11px" }}>
            降温了，今天别出门吃了吧
          </div>
        </div>
        <div className="row" style={{ opacity: show(2), transition: "opacity .4s" }}>
          <div className="av" style={{ background: chi.color, width: 26, height: 26, fontSize: 12 }}>
            {chi.emoji}
          </div>
          <div className="bub" style={{ background: chi.tint, fontSize: 13, padding: "7px 11px" }}>
            又懒。那我给她挑家近的
          </div>
        </div>
        <div className="row" style={{ opacity: show(3), transition: "opacity .4s" }}>
          <div className="av" style={{ background: wai.color, width: 26, height: 26, fontSize: 12 }}>
            {wai.emoji}
          </div>
          <div className="card" style={{ width: 172 }}>
            <div className="img" style={{ height: 60, fontSize: 22 }}>
              🍲
            </div>
            <div className="pad" style={{ padding: "8px 10px" }}>
              <div style={{ fontWeight: 600, fontSize: 12.5, lineHeight: 1.3 }}>蜀香小灶 · 酸辣土豆片</div>
              <div style={{ fontWeight: 400, fontSize: 10.5, lineHeight: 1.4, color: "var(--ink-3)", marginTop: 2 }}>
                ￥26 · 28 分钟送达
              </div>
            </div>
            <div className="memo" style={{ padding: "6px 10px", fontSize: 10 }}>
              你上次说酸辣口重的更下饭
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 5,
            justifyContent: "flex-end",
            marginTop: 2,
            opacity: show(4),
            transition: "opacity .4s",
          }}
        >
          <span className="chip" style={{ fontSize: 11, padding: "5px 9px" }}>
            就它
          </span>
          <span className="chip" style={{ fontSize: 11, padding: "5px 9px" }}>
            换一个
          </span>
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <button
        className="btn p"
        style={{ width: "100%", height: 50, borderRadius: 15, fontSize: 16, flex: "none" }}
        onClick={() => router.push("/onboarding")}
      >
        开始聊天
      </button>
      <div
        style={{
          fontWeight: 400, fontSize: 11.5, lineHeight: 1.5,
          color: "var(--ink-3)",
          margin: "10px 0 26px",
        }}
      >
        对话由 AI 生成 · 一键登录即同意服务条款
      </div>
    </div>
  );
}
