"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AGENTS } from "@/lib/agents";

type Line = { who: "mimi" | "me"; text: string };

const AREAS = ["北京 西土城", "北京 五道口", "北京 中关村", "先不说"];
const TASTES = ["能吃辣", "偏清淡", "无所谓"];
const AVOIDS = ["香菜", "内脏", "牛肉", "乳制品"];
const BUDGETS = ["30 以内", "30–80", "不太在意"];
const WEEKEND = ["看展", "演出", "电影", "运动", "周边游", "只想宅着"];

export default function Onboarding() {
  const router = useRouter();
  const mimi = AGENTS.mimi;
  const [lines, setLines] = useState<Line[]>([]);
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState(false);
  const [nickname, setNickname] = useState("");
  const [free, setFree] = useState("");
  const [area, setArea] = useState("");
  const [taste, setTaste] = useState<string[]>([]);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [weekend, setWeekend] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, typing, step]);

  async function say(texts: string[]) {
    for (const t of texts) {
      setTyping(true);
      await new Promise((r) => setTimeout(r, Math.min(2000, 300 + t.length * 52)));
      setTyping(false);
      setLines((p) => [...p, { who: "mimi", text: t }]);
      await new Promise((r) => setTimeout(r, 260));
    }
  }

  /** 打字气泡陪跑真实网络请求：慢的时候不冷场，快的时候不闪烁 */
  async function withTyping<T>(fn: () => Promise<T>): Promise<T> {
    setTyping(true);
    const start = performance.now();
    const result = await fn();
    const rest = 500 - (performance.now() - start);
    if (rest > 0) await new Promise((r) => setTimeout(r, rest));
    setTyping(false);
    return result;
  }

  const opened = useRef(false);
  useEffect(() => {
    // 严格模式下 effect 会跑两次，开场白只说一遍
    if (opened.current) return;
    opened.current = true;
    say([
      "我是小咪，从今天起管你的吃饭、周末，还有那些你答应过又忘了的事",
      "先问你五句，两分钟就好。不想答的直接跳",
      "我该怎么称呼你？",
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reply = (t: string) => setLines((p) => [...p, { who: "me", text: t }]);
  const toggle = (arr: string[], v: string, set: (x: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function next(n: number) {
    setStep(n);
    setFree("");
    if (n === 1)
      await say([`${nickname || "行"}，记下了`, "你平时常在哪一带活动？我按这个范围找店"]);
    if (n === 2)
      await say([
        area === "先不说" ? "那我先按北京算" : `好，知道你在${area}一带了`,
        "那有什么是你绝对不吃的吗？口味重不重？我先记下来，免得他们乱推",
      ]);
    if (n === 3) await say(["一顿饭大概愿意花多少？"]);
    if (n === 4) await say(["周末你更想干点什么？多选也行"]);
    if (n === 5)
      await say([
        "最后一件事",
        "我想每天早上八点跟你说一句话，把今天要做的事给你摆好",
        "现在允许通知吗？",
      ]);
  }

  async function finish(allow: boolean) {
    setBusy(true);
    if (allow && "Notification" in window) {
      try {
        await Notification.requestPermission();
      } catch {}
    }
    await say(allow ? ["好，那明早见"] : ["行，那我只在应用里出现"]);
    await withTyping(() =>
      fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nickname: nickname || "你",
          area: area && area !== "先不说" ? area : "北京 西土城",
          avoid,
          taste,
          budget: budget === "30 以内" ? "20 到 30" : budget === "30–80" ? "30 到 80" : "25 到 40",
          weekend,
          wake: "08:30",
          sleep: "01:00",
        }),
      }),
    );
    await say(["我把你拉进两个群了：吃什么、周末去哪", "他们到点会自己开口，你先去看看"]);
    setTimeout(() => router.replace("/messages"), 900);
  }

  const chipRow = (
    opts: string[],
    sel: string[] | string,
    onPick: (v: string) => void,
    label?: string,
  ) => (
    <>
      {label && (
        <div className="who" style={{ marginLeft: 38 }}>
          {label}
        </div>
      )}
      <div className="chips" style={{ paddingLeft: 38 }}>
        {opts.map((o) => (
          <button
            key={o}
            className="chip"
            data-on={(Array.isArray(sel) ? sel.includes(o) : sel === o) ? "1" : "0"}
            onClick={() => onPick(o)}
          >
            {o}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <>
      <div style={{ flex: "none", height: 2.5, background: "rgba(35,39,30,.08)" }}>
        <div
          style={{
            width: `${(step / 5) * 100}%`,
            height: "100%",
            background: "var(--brand)",
            transition: "width .5s",
          }}
        />
      </div>

      <div className="nav" style={{ paddingTop: 10 }}>
        <div className="av" style={{ width: 34, height: 34, background: mimi.color, fontSize: 15 }}>
          {mimi.emoji}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.2 }}>小咪</div>
          <div style={{ fontWeight: 400, fontSize: 11, lineHeight: 1.3, color: "var(--ink-3)" }}>
            AI · 正在认识你 {Math.min(step + 1, 5)}/5
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          className="chip"
          style={{ fontSize: 12, padding: "5px 10px" }}
          onClick={() => (step >= 4 ? finish(false) : next(step + 1))}
        >
          跳过
        </button>
      </div>

      <div className="stream no-scrollbar">
        {lines.map((l, i) => (
          <div key={i} className={l.who === "me" ? "row me" : "row"}>
            {l.who === "mimi" && (
              <div className="av" style={{ background: mimi.color }}>
                {mimi.emoji}
              </div>
            )}
            <div className={l.who === "me" ? "bub me" : "bub"} style={
              l.who === "mimi" ? { background: mimi.tint } : undefined
            }>
              {l.text}
            </div>
          </div>
        ))}

        {typing && (
          <div className="row">
            <div className="av" style={{ background: mimi.color }}>
              {mimi.emoji}
            </div>
            <div
              className="bub"
              style={{
                background: mimi.tint,
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

        {!typing && step === 1 &&
          chipRow(AREAS, area, (a) => {
            setArea(a);
            reply(a);
            next(2);
          })}

        {!typing && step === 2 && (
          <>
            {chipRow(TASTES, taste, (t) => toggle(taste, t, setTaste), "口味")}
            {chipRow(AVOIDS, avoid, (t) => toggle(avoid, t, setAvoid), "忌口")}
          </>
        )}

        {!typing && step === 3 &&
          chipRow(BUDGETS, budget, (b) => {
            setBudget(b);
            reply(b);
            next(4);
          })}

        {!typing && step === 4 && chipRow(WEEKEND, weekend, (w) => toggle(weekend, w, setWeekend))}

        {!typing && step === 5 && !busy && (
          <div className="chips" style={{ paddingLeft: 38 }}>
            <button
              className="chip"
              data-on="1"
              onClick={() => {
                reply("可以，允许");
                finish(true);
              }}
            >
              允许通知
            </button>
            <button
              className="chip"
              onClick={() => {
                reply("暂时不用");
                finish(false);
              }}
            >
              暂时不用
            </button>
          </div>
        )}
        <div ref={bottom} />
      </div>

      <div
        style={{
          flex: "none",
          padding: "0 16px 4px",
          fontWeight: 400, fontSize: 11.5, lineHeight: 1.5,
          color: "var(--ink-3)",
          textAlign: "center",
        }}
      >
        全部跳过也能进，首日只发通用内容
      </div>

      <div className="inp">
        <input
          className="fld"
          value={step === 0 ? nickname : free}
          onChange={(e) => (step === 0 ? setNickname(e.target.value) : setFree(e.target.value))}
          placeholder={step === 0 ? "打个名字" : "也可以直接打字告诉我"}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            if (step === 0 && nickname.trim()) {
              reply(nickname);
              next(1);
            }
          }}
        />
        <button
          className="btn p"
          style={{ flex: "none", width: 62, height: 36, borderRadius: 999, fontSize: 13.5 }}
          disabled={busy || typing}
          onClick={() => {
            if (step === 0) {
              reply(nickname || "随便叫吧");
              return next(1);
            }
            if (free.trim()) reply(free.trim());
            if (step === 2) {
              if (!free.trim())
                reply([...taste, ...avoid.map((a) => `不吃${a}`)].join("、") || "没什么讲究");
              return next(3);
            }
            if (step === 4) {
              if (!free.trim()) reply(weekend.join("、") || "还没想好");
              return next(5);
            }
            if (step === 5) return finish(false);
          }}
        >
          下一步
        </button>
      </div>
    </>
  );
}
