import { ensureTenant } from "./db";
import { resolveTenant, runWithTenant } from "./tenant";

/**
 * API route 的一站式包装:读 cookie 拿 tenant → 首次访问自动 seed → 用
 * AsyncLocalStorage 把 tenant 塞进上下文,底层 kv/SQL 直接调 tenantId() 就能拿。
 *
 * 用法:
 *   export const GET = () => withTenant(async () => { ... });
 *   export const POST = (req) => withTenant(async () => { const b = await req.json(); ... });
 */
export async function withTenant<T>(fn: () => Promise<T>): Promise<T> {
  const t = await resolveTenant();
  return runWithTenant(t, async () => {
    await ensureTenant(t);
    return fn();
  });
}
