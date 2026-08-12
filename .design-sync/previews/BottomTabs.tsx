import React from "react";
import { BottomTabs } from "meemate";

export function Default() {
  return <BottomTabs />;
}

export function WithBadge() {
  return <BottomTabs badge={3} />;
}
