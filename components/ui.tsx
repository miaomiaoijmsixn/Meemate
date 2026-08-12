"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Agent } from "@/lib/agents";

/** 设备框里的状态栏与 home 条。真机上由 CSS 隐藏，交给系统。 */
export function PhoneChrome() {
  const [t, setT] = useState("9:41");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setT(`${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="st chrome">
      <span>{t}</span>
      <i />
    </div>
  );
}

export function Avatar({
  agent,
  size = 30,
  ring,
  style,
}: {
  agent?: Agent;
  size?: number;
  ring?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="av"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.44),
        background: agent?.color ?? "var(--line)",
        boxShadow: ring ? "0 0 0 2px var(--brand)" : undefined,
        borderRadius: size >= 50 ? Math.round(size / 3) : "50%",
        ...style,
      }}
    >
      {agent?.emoji}
    </div>
  );
}

/** 群聊的两头像叠加 */
export function GroupAvatar({
  members,
  size = 46,
}: {
  members: Agent[];
  size?: number;
}) {
  const s = Math.round(size * 0.63);
  return (
    <div style={{ flex: "none", width: size, height: size, position: "relative" }}>
      {members.slice(0, 2).map((m, i) => (
        <div
          key={m.id}
          className="av"
          style={{
            position: "absolute",
            left: i === 0 ? 0 : undefined,
            top: i === 0 ? 0 : undefined,
            right: i === 1 ? 0 : undefined,
            bottom: i === 1 ? 0 : undefined,
            width: s,
            height: s,
            fontSize: Math.round(s * 0.44),
            background: m.color,
            boxShadow: i === 1 ? "0 0 0 2px var(--surface)" : undefined,
          }}
        >
          {m.emoji}
        </div>
      ))}
    </div>
  );
}

export function Nav({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="nav">
      <h1>{title}</h1>
      <div style={{ flex: 1 }} />
      {right}
    </div>
  );
}

export function BackNav({
  title,
  sub,
  right,
  onTitle,
  avatar,
  fallback = "/messages",
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
  onTitle?: () => void;
  avatar?: React.ReactNode;
  /** 直接打开这个 URL 时没有历史可退，退到这里 */
  fallback?: string;
}) {
  const router = useRouter();
  /**
   * 直接回父级页面，不用 router.back()。
   * history.length 判断不可靠：同一个 URL 反复进过时，back() 退回的还是它自己，
   * 表现就是点了没反应。层级是固定的（聊天回消息、行程回生活），push 更可预期。
   */
  const goBack = () => router.push(fallback);
  return (
    <div className="nav navc">
      <button
        onClick={goBack}
        style={{
          fontSize: 22,
          lineHeight: 1,
          color: "var(--ink-2)",
          background: "none",
          border: 0,
          // 热区放大到 44，符合最小触控尺寸
          width: 44,
          height: 44,
          marginLeft: -12,
          marginRight: -8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="返回"
      >
        ‹
      </button>
      <div
        onClick={onTitle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: onTitle ? "pointer" : undefined,
          minWidth: 0,
        }}
      >
        {avatar}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.2 }}>{title}</div>
          {sub && (
            <div style={{ fontWeight: 400, fontSize: 10.5, lineHeight: 1.3, color: "var(--ink-3)" }}>
              {sub}
            </div>
          )}
        </div>
      </div>
      <div style={{ flex: 1 }} />
      {right}
    </div>
  );
}

const TABS = [
  { href: "/messages", label: "消息", glyph: "◍" },
  { href: "/life", label: "生活", glyph: "◇" },
  { href: "/me", label: "我", glyph: "○" },
];

export function BottomTabs({ badge }: { badge?: number }) {
  const path = usePathname();
  return (
    <div className="tb" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} data-on={path.startsWith(t.href) ? "1" : "0"}>
          <span>
            {t.glyph}
            {t.href === "/life" && !!badge && (
              <em
                style={{
                  position: "absolute",
                  top: -3,
                  right: -9,
                  minWidth: 15,
                  height: 15,
                  padding: "0 4px",
                  borderRadius: 999,
                  background: "var(--pink)",
                  color: "#7A3F3F",
                  fontWeight: 600, fontSize: 9.5, lineHeight: "15px",
                  fontStyle: "normal",
                  textAlign: "center",
                }}
              >
                {badge}
              </em>
            )}
          </span>
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ padding: "0 16px 12px" }}>
      <div className="seg">
        {options.map((o) => (
          <button
            key={o.v}
            data-on={value === o.v ? "1" : "0"}
            onClick={() => onChange(o.v)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet">
        <div className="grab" />
        {children}
      </div>
    </>
  );
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        // 抬高一点，别压住底部操作条和 Tab
        bottom: 124,
        zIndex: 40,
        display: "flex",
        justifyContent: "center",
        padding: "0 24px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          padding: "9px 14px",
          borderRadius: 13,
          // 磨砂半透明：压住底下的内容但不完全挡死
          background: "rgba(35,39,30,.62)",
          backdropFilter: "blur(14px) saturate(180%)",
          WebkitBackdropFilter: "blur(14px) saturate(180%)",
          border: "1px solid rgba(255,255,255,.16)",
          color: "#fff",
          fontWeight: 400, fontSize: 13, lineHeight: 1.5,
          textAlign: "center",
          boxShadow: "0 8px 24px rgba(35,39,30,.18)",
        }}
      >
        {text}
      </div>
    </div>
  );
}

export function useToast() {
  const [text, setText] = useState<string | null>(null);
  return {
    text,
    show: (t: string) => {
      setText(t);
      setTimeout(() => setText(null), 2400);
    },
  };
}
