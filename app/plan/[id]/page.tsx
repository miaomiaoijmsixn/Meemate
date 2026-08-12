import { Suspense } from "react";
import { PlanView } from "@/components/PlanView";

/** ?fresh=1 决定要不要播小咪的思考过程，读 URL 需要 Suspense 边界 */
export default function Page() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <PlanView />
    </Suspense>
  );
}
