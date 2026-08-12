import { db, kvSet, DEFAULT_PROFILE, DEFAULT_SETTINGS } from "@/lib/db";

export const runtime = "nodejs";

/** 演示用：一键回到全新用户状态，方便面试时重跑一遍 */
export async function POST() {
  const d = db();
  ["messages", "memories", "wishes", "plans", "plan_items", "todos", "shown", "events"].forEach(
    (t) => d.prepare(`DELETE FROM ${t}`).run(),
  );
  // 群偏好也要一起清，否则"回到新用户"还带着上一轮的筛选条件
  d.prepare("DELETE FROM app WHERE k LIKE 'prefs:%'").run();
  kvSet("profile", DEFAULT_PROFILE);
  kvSet("settings", DEFAULT_SETTINGS);
  kvSet("onboarded", 0);
  return Response.json({ ok: true });
}
