import React, { useState } from "react";
import { Segmented } from "meemate";

export function WishFilters() {
  const [v, setV] = useState("全部");
  return (
    <Segmented
      value={v}
      options={[
        { v: "全部", label: "全部" },
        { v: "想吃", label: "想吃" },
        { v: "想去", label: "想去" },
        { v: "想看", label: "想看" },
        { v: "想动", label: "想动" },
      ]}
      onChange={setV}
    />
  );
}

export function TimelineProfile() {
  const [v, setV] = useState("timeline");
  return (
    <Segmented
      value={v}
      options={[
        { v: "timeline", label: "时间轴" },
        { v: "profile", label: "画像" },
      ]}
      onChange={setV}
    />
  );
}
