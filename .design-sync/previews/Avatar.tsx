import React from "react";
import { Avatar } from "meemate";

const mimi = { id: "mimi", name: "小咪管家", emoji: "🐱", color: "var(--c-mi)" };
const laochi = { id: "laochi", name: "探店老吃家", emoji: "🍽️", color: "var(--c-chi)" };
const waimai = { id: "waimai", name: "外卖十级选手", emoji: "🛵", color: "var(--c-wai)" };
const jingshen = { id: "jingshen", name: "精神补给站", emoji: "🎨", color: "var(--c-jing)" };
const majiaxian = { id: "majiaxian", name: "马甲线主理人", emoji: "🏃", color: "var(--c-jia)" };
const lvyou = { id: "lvyou", name: "旅游达人", emoji: "🧭", color: "var(--c-lv)" };

export function AllAgents() {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Avatar agent={mimi} size={36} />
      <Avatar agent={laochi} size={36} />
      <Avatar agent={waimai} size={36} />
      <Avatar agent={jingshen} size={36} />
      <Avatar agent={majiaxian} size={36} />
      <Avatar agent={lvyou} size={36} />
    </div>
  );
}

export function Sizes() {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Avatar agent={mimi} size={24} />
      <Avatar agent={mimi} size={36} />
      <Avatar agent={mimi} size={50} />
    </div>
  );
}

export function WithRing() {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Avatar agent={mimi} size={40} ring />
      <Avatar agent={laochi} size={40} ring />
    </div>
  );
}

export function NoAgent() {
  return <Avatar size={36} />;
}
