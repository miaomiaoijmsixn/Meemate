import { AsyncLocalStorage } from "node:async_hooks";
import { cookies } from "next/headers";

/**
 * 多租户上下文。每个 API 请求进来时读 cookie 里的 mm_sess,包一层
 * runWithTenant,底层的 db helper 只要一句 tenantId() 就能拿到,
 * 不用给几十个函数改签名。
 *
 * middleware.ts 负责首次访问种下 mm_sess=uuid,以及 ?resume=legacy
 * 特殊入口(切回老账户,demo 干净)。这里只负责读。
 */

const store = new AsyncLocalStorage<string>();

export const TENANT_COOKIE = "mm_sess";

export function runWithTenant<T>(t: string, fn: () => Promise<T>): Promise<T> {
  return store.run(t, fn);
}

/** 拿到当前请求的 tenant。忘了包 runWithTenant 会立刻炸,是安全网。 */
export function tenantId(): string {
  const t = store.getStore();
  if (!t) throw new Error("tenant not set — wrap the handler with runWithTenant()");
  return t;
}

/**
 * 从 cookie 读 tenantId。理论上 middleware 已经种过 cookie,读不到就说明
 * 请求绕过了 middleware(比如内部调用),兜底给 anon —— 数据仍然会跟别人隔开,
 * 只是没有持久 cookie 而已。
 */
export async function resolveTenant(): Promise<string> {
  const c = await cookies();
  return c.get(TENANT_COOKIE)?.value ?? "anon";
}

/**
 * withTenant 在 lib/api.ts,那里可以顺便调 ensureTenant 而不引发循环依赖。
 * 这个文件只提供最基础的 tenant 上下文原语。
 */
