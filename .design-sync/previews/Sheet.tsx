import React from "react";
import { Sheet } from "meemate";

export function OpenSheet() {
  return (
    <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
      <Sheet open={true} onClose={() => {}}>
        <div style={{ padding: "16px" }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>选择操作</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="btn p" style={{ height: 38 }}>确认行程</button>
            <button className="btn s" style={{ height: 38 }}>稍后再说</button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
