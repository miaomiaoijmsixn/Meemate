import { Suspense } from "react";
import { Life } from "@/components/Life";

/** 从行程详情返回时带 ?tab=plan，读 URL 需要 Suspense 边界 */
export default function Page() {
  return (
    <Suspense fallback={<div style={{ flex: 1 }} />}>
      <Life />
    </Suspense>
  );
}
