import React from "react";
import { Toast } from "meemate";

export function WithText() {
  return (
    <div style={{ position: "relative", height: 60 }}>
      <Toast text="加进愿望清单了" />
    </div>
  );
}

export function LongText() {
  return (
    <div style={{ position: "relative", height: 60 }}>
      <Toast text="3 个节点已加入提醒，出发前一小时叫你" />
    </div>
  );
}

export function Hidden() {
  return (
    <div style={{ position: "relative", height: 40 }}>
      <Toast text={null} />
    </div>
  );
}
