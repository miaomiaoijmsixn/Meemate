import React from "react";
import { Nav } from "meemate";

export function MessagesNav() {
  return <Nav title="消息" />;
}

export function WithRight() {
  return (
    <Nav
      title="消息"
      right={
        <button style={{ fontSize: 18, background: "none", border: 0, color: "var(--ink-2)" }}>
          ⏱
        </button>
      }
    />
  );
}
