import React from "react";
import { DemoBar } from "meemate";

export function Default() {
  return (
    <div style={{ position: "relative", width: 320, height: 200 }}>
      <DemoBar />
    </div>
  );
}

export function WithLLM() {
  return (
    <div style={{ position: "relative", width: 320, height: 200 }}>
      <DemoBar llm />
    </div>
  );
}
