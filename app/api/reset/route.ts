import { withTenant } from "@/lib/api";
import { run, kvSet, DEFAULT_PROFILE, DEFAULT_SETTINGS } from "@/lib/db";
import { tenantId } from "@/lib/tenant";

export const runtime = "nodejs";

/**
 * 演示用:一键回到全新用户状态,方便面试时重跑一遍。
 * 只删当前 tenant 的数据,别的访客不受影响。
 */
export const POST = () =>
  withTenant(async () => {
    const t = tenantId();
    const tables = [
      "messages",
      "memories",
      "wishes",
      "plans",
      "plan_items",
      "todos",
      "shown",
      "events",
    ];
    for (const table of tables) await run(`DELETE FROM ${table} WHERE tenant=?`, [t]);
    // 群偏好也要一起清,否则"回到新用户"还带着上一轮的筛选条件
    await run("DELETE FROM app WHERE tenant=? AND k LIKE 'prefs:%'", [t]);
    await kvSet("profile", DEFAULT_PROFILE);
    await kvSet("settings", DEFAULT_SETTINGS);
    await kvSet("onboarded", 0);
    return Response.json({ ok: true });
  });
