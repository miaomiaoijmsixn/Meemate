import { Suspense } from "react";
import { Me } from "@/components/Me";

/** 客户端部分读 URL 上的 ?m=（从卡片理由跳过来时要高亮那条记忆），所以要有 Suspense 边界 */
export default function Page() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <Me />
    </Suspense>
  );
}
