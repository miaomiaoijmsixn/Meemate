import React from "react";
import { BackNav, Avatar } from "meemate";

const mimi = { id: "mimi", name: "小咪管家", emoji: "🐱", color: "var(--c-mi)" };

export function ChatNav() {
  return (
    <BackNav
      title="小咪管家"
      sub="秘书兼知心伙伴"
      avatar={<Avatar agent={mimi} size={30} />}
    />
  );
}

export function SimpleBack() {
  return <BackNav title="行程详情" />;
}

export function WithDateSub() {
  return <BackNav title="行程详情 · 8月15日周五" />;
}
