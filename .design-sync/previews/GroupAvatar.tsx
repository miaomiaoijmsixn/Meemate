import React from "react";
import { GroupAvatar } from "meemate";

const laochi = { id: "laochi", emoji: "🍽️", color: "var(--c-chi)" };
const waimai = { id: "waimai", emoji: "🛵", color: "var(--c-wai)" };
const jingshen = { id: "jingshen", emoji: "🎨", color: "var(--c-jing)" };
const lvyou = { id: "lvyou", emoji: "🧭", color: "var(--c-lv)" };

export function EatGroup() {
  return <GroupAvatar members={[laochi, waimai]} size={46} />;
}

export function WeekendGroup() {
  return <GroupAvatar members={[jingshen, lvyou]} size={46} />;
}

export function LargeGroup() {
  return <GroupAvatar members={[laochi, waimai]} size={60} />;
}
