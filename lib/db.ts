import { createClient, type Client, type InArgs } from "@libsql/client";
import { AGENTS, GROUPS } from "./agents";
import { tenantId } from "./tenant";

/**
 * 数据库客户端。本地开发用 file:./data/meemate.db(SQLite 嵌入模式,免鉴权),
 * 生产用 libsql://... 连 Turso。同一套 SQL、同一套 API。
 *
 * 多租户:所有表都有 tenant 列,复合主键 (id, tenant)。请求进来时中间件种下
 * cookie,route handler 用 withTenant() 包一层,底层通过 AsyncLocalStorage 拿
 * tenantId。老数据 tenant 列缺省 'legacy',通过 ?resume=legacy 特殊入口回锅。
 */

declare global {
  var __meemateDbInit: Promise<Client> | undefined;
  /** 已经 ensureTenant 过的租户,进程内缓存,避免每个请求都查一次 */
  var __meemateTenantsReady: Set<string> | undefined;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS app (
    tenant TEXT NOT NULL DEFAULT 'legacy',
    k TEXT NOT NULL,
    v TEXT NOT NULL,
    PRIMARY KEY (tenant, k)
  );
  CREATE TABLE IF NOT EXISTS conversations (
    tenant TEXT NOT NULL DEFAULT 'legacy',
    id TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    agent_id TEXT,
    members TEXT NOT NULL DEFAULT '[]',
    intro TEXT,
    pinned INTEGER NOT NULL DEFAULT 0,
    muted INTEGER NOT NULL DEFAULT 0,
    sort INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant, id)
  );
  CREATE TABLE IF NOT EXISTS messages (
    tenant TEXT NOT NULL DEFAULT 'legacy',
    id TEXT NOT NULL,
    seq INTEGER,
    conversation_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    kind TEXT NOT NULL,
    text TEXT,
    payload TEXT,
    mention INTEGER NOT NULL DEFAULT 0,
    chips TEXT,
    typing_at INTEGER NOT NULL,
    deliver_at INTEGER NOT NULL,
    PRIMARY KEY (tenant, id)
  );
  CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(tenant, conversation_id, deliver_at);
  CREATE TABLE IF NOT EXISTS memories (
    tenant TEXT NOT NULL DEFAULT 'legacy',
    id TEXT NOT NULL,
    type TEXT NOT NULL,
    day TEXT NOT NULL,
    grp TEXT,
    layer TEXT,
    tag TEXT,
    text TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'said',
    hits INTEGER NOT NULL DEFAULT 1,
    diary_id TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    usable INTEGER NOT NULL DEFAULT 1,
    expires_at INTEGER,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (tenant, id)
  );
  CREATE TABLE IF NOT EXISTS wishes (
    tenant TEXT NOT NULL DEFAULT 'legacy',
    id TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    subtitle TEXT,
    meta TEXT,
    source_agent TEXT,
    deadline TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL,
    PRIMARY KEY (tenant, id)
  );
  CREATE TABLE IF NOT EXISTS plans (
    tenant TEXT NOT NULL DEFAULT 'legacy',
    id TEXT NOT NULL,
    day TEXT NOT NULL,
    date TEXT,
    confirmed INTEGER NOT NULL DEFAULT 0,
    params TEXT NOT NULL,
    thinking TEXT NOT NULL DEFAULT '[]',
    notes TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    PRIMARY KEY (tenant, id)
  );
  CREATE TABLE IF NOT EXISTS plan_items (
    tenant TEXT NOT NULL DEFAULT 'legacy',
    id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    start TEXT NOT NULL,
    dur INTEGER NOT NULL,
    title TEXT NOT NULL,
    reason TEXT,
    transit TEXT,
    agent_id TEXT,
    wish_id TEXT,
    addr TEXT,
    booking INTEGER NOT NULL DEFAULT 0,
    link TEXT,
    price INTEGER,
    PRIMARY KEY (tenant, id)
  );
  CREATE TABLE IF NOT EXISTS todos (
    tenant TEXT NOT NULL DEFAULT 'legacy',
    id TEXT NOT NULL,
    title TEXT NOT NULL,
    due TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    source_msg TEXT,
    done INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (tenant, id)
  );
  CREATE TABLE IF NOT EXISTS shown (
    tenant TEXT NOT NULL DEFAULT 'legacy',
    id TEXT NOT NULL,
    conversation_id TEXT,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (tenant, id)
  );
  CREATE TABLE IF NOT EXISTS events (
    tenant TEXT NOT NULL DEFAULT 'legacy',
    id TEXT NOT NULL,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    tag TEXT,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (tenant, id)
  );
  CREATE TABLE IF NOT EXISTS agent_state (
    tenant TEXT NOT NULL DEFAULT 'legacy',
    agent_id TEXT NOT NULL,
    pushed INTEGER NOT NULL DEFAULT 0,
    engaged INTEGER NOT NULL DEFAULT 0,
    ignored_streak INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 0,
    friend INTEGER NOT NULL DEFAULT 0,
    muted INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant, agent_id)
  );
`;

async function connect(): Promise<Client> {
  const url = process.env.TURSO_DATABASE_URL || "file:./data/meemate.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url, authToken });
  await client.executeMultiple(SCHEMA);
  await migrate(client);
  return client;
}

export function db(): Promise<Client> {
  if (!globalThis.__meemateDbInit) {
    globalThis.__meemateDbInit = connect().catch((e) => {
      globalThis.__meemateDbInit = undefined;
      throw e;
    });
  }
  return globalThis.__meemateDbInit;
}

/**
 * 补加后来加的列;老库单列主键要重建成复合主键,否则新 tenant 想 INSERT 一条
 * c-mimi 就跟 legacy 的 c-mimi 撞了。SQLite 不支持 ALTER PRIMARY KEY,只能
 * 走"创建新表 → 拷贝数据 → drop → rename"这套。
 *
 * migrate 全程幂等:失败就说明这一步已经做过,忽略;主键检查通过就跳过重建。
 * 老数据(全部 tenant='legacy')完整保留,只是主键结构升级了。
 */
async function migrate(c: Client) {
  const stmts = [
    "ALTER TABLE plans ADD COLUMN date TEXT",
    "ALTER TABLE plans ADD COLUMN confirmed INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE plan_items ADD COLUMN addr TEXT",
    "ALTER TABLE plan_items ADD COLUMN booking INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE plan_items ADD COLUMN link TEXT",
    "ALTER TABLE plan_items ADD COLUMN price INTEGER",
    // 多租户改造:老库统一给每张表补上 tenant 列(默认 legacy)
    "ALTER TABLE app ADD COLUMN tenant TEXT NOT NULL DEFAULT 'legacy'",
    "ALTER TABLE conversations ADD COLUMN tenant TEXT NOT NULL DEFAULT 'legacy'",
    "ALTER TABLE messages ADD COLUMN tenant TEXT NOT NULL DEFAULT 'legacy'",
    "ALTER TABLE memories ADD COLUMN tenant TEXT NOT NULL DEFAULT 'legacy'",
    "ALTER TABLE wishes ADD COLUMN tenant TEXT NOT NULL DEFAULT 'legacy'",
    "ALTER TABLE plans ADD COLUMN tenant TEXT NOT NULL DEFAULT 'legacy'",
    "ALTER TABLE plan_items ADD COLUMN tenant TEXT NOT NULL DEFAULT 'legacy'",
    "ALTER TABLE todos ADD COLUMN tenant TEXT NOT NULL DEFAULT 'legacy'",
    "ALTER TABLE shown ADD COLUMN tenant TEXT NOT NULL DEFAULT 'legacy'",
    "ALTER TABLE events ADD COLUMN tenant TEXT NOT NULL DEFAULT 'legacy'",
    "ALTER TABLE agent_state ADD COLUMN tenant TEXT NOT NULL DEFAULT 'legacy'",
  ];
  for (const sql of stmts) {
    try {
      await c.execute(sql);
    } catch {}
  }
  await rebuildPks(c);
}

/** 每张表的新表 DDL(带复合主键)。表名占位 __T__,rebuild 时替换。 */
const NEW_TABLE_DDL: Record<string, string> = {
  app: `CREATE TABLE __T__ (tenant TEXT NOT NULL DEFAULT 'legacy', k TEXT NOT NULL, v TEXT NOT NULL, PRIMARY KEY (tenant, k))`,
  conversations: `CREATE TABLE __T__ (tenant TEXT NOT NULL DEFAULT 'legacy', id TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, agent_id TEXT, members TEXT NOT NULL DEFAULT '[]', intro TEXT, pinned INTEGER NOT NULL DEFAULT 0, muted INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (tenant, id))`,
  messages: `CREATE TABLE __T__ (tenant TEXT NOT NULL DEFAULT 'legacy', id TEXT NOT NULL, seq INTEGER, conversation_id TEXT NOT NULL, sender TEXT NOT NULL, kind TEXT NOT NULL, text TEXT, payload TEXT, mention INTEGER NOT NULL DEFAULT 0, chips TEXT, typing_at INTEGER NOT NULL, deliver_at INTEGER NOT NULL, PRIMARY KEY (tenant, id))`,
  memories: `CREATE TABLE __T__ (tenant TEXT NOT NULL DEFAULT 'legacy', id TEXT NOT NULL, type TEXT NOT NULL, day TEXT NOT NULL, grp TEXT, layer TEXT, tag TEXT, text TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'said', hits INTEGER NOT NULL DEFAULT 1, diary_id TEXT, active INTEGER NOT NULL DEFAULT 1, usable INTEGER NOT NULL DEFAULT 1, expires_at INTEGER, created_at INTEGER NOT NULL, PRIMARY KEY (tenant, id))`,
  wishes: `CREATE TABLE __T__ (tenant TEXT NOT NULL DEFAULT 'legacy', id TEXT NOT NULL, title TEXT NOT NULL, type TEXT NOT NULL, subtitle TEXT, meta TEXT, source_agent TEXT, deadline TEXT, status TEXT NOT NULL DEFAULT 'open', created_at INTEGER NOT NULL, PRIMARY KEY (tenant, id))`,
  plans: `CREATE TABLE __T__ (tenant TEXT NOT NULL DEFAULT 'legacy', id TEXT NOT NULL, day TEXT NOT NULL, date TEXT, confirmed INTEGER NOT NULL DEFAULT 0, params TEXT NOT NULL, thinking TEXT NOT NULL DEFAULT '[]', notes TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL, PRIMARY KEY (tenant, id))`,
  plan_items: `CREATE TABLE __T__ (tenant TEXT NOT NULL DEFAULT 'legacy', id TEXT NOT NULL, plan_id TEXT NOT NULL, seq INTEGER NOT NULL, start TEXT NOT NULL, dur INTEGER NOT NULL, title TEXT NOT NULL, reason TEXT, transit TEXT, agent_id TEXT, wish_id TEXT, addr TEXT, booking INTEGER NOT NULL DEFAULT 0, link TEXT, price INTEGER, PRIMARY KEY (tenant, id))`,
  todos: `CREATE TABLE __T__ (tenant TEXT NOT NULL DEFAULT 'legacy', id TEXT NOT NULL, title TEXT NOT NULL, due TEXT, source TEXT NOT NULL DEFAULT 'manual', source_msg TEXT, done INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, PRIMARY KEY (tenant, id))`,
  shown: `CREATE TABLE __T__ (tenant TEXT NOT NULL DEFAULT 'legacy', id TEXT NOT NULL, conversation_id TEXT, created_at INTEGER NOT NULL, PRIMARY KEY (tenant, id))`,
  events: `CREATE TABLE __T__ (tenant TEXT NOT NULL DEFAULT 'legacy', id TEXT NOT NULL, kind TEXT NOT NULL, text TEXT NOT NULL, tag TEXT, created_at INTEGER NOT NULL, PRIMARY KEY (tenant, id))`,
  agent_state: `CREATE TABLE __T__ (tenant TEXT NOT NULL DEFAULT 'legacy', agent_id TEXT NOT NULL, pushed INTEGER NOT NULL DEFAULT 0, engaged INTEGER NOT NULL DEFAULT 0, ignored_streak INTEGER NOT NULL DEFAULT 0, level INTEGER NOT NULL DEFAULT 0, friend INTEGER NOT NULL DEFAULT 0, muted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (tenant, agent_id))`,
};

async function rebuildPks(c: Client) {
  for (const table of Object.keys(NEW_TABLE_DDL)) {
    const info = await c.execute({
      sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
      args: [table],
    });
    const currentSql = String((info.rows[0] as any)?.sql ?? "");
    // 已经是复合主键就跳过
    if (/PRIMARY KEY\s*\(\s*tenant\s*,/i.test(currentSql)) continue;

    try {
      const tmpName = `__${table}_new`;
      await c.execute(NEW_TABLE_DDL[table].replace("__T__", tmpName));
      // 拿到老表所有列名,只搬两边都有的列(新表多了 tenant,老数据默认给 legacy)
      const oldCols = await c.execute(`PRAGMA table_info(${table})`);
      const newCols = await c.execute(`PRAGMA table_info(${tmpName})`);
      const oldNames = new Set((oldCols.rows as any[]).map((r) => String(r.name)));
      const shared = (newCols.rows as any[])
        .map((r) => String(r.name))
        .filter((n) => oldNames.has(n));
      const cols = shared.join(",");
      await c.execute(`INSERT INTO ${tmpName} (${cols}) SELECT ${cols} FROM ${table}`);
      await c.execute(`DROP TABLE ${table}`);
      await c.execute(`ALTER TABLE ${tmpName} RENAME TO ${table}`);
    } catch (e) {
      // 迁移失败保留老表,别把库整废;下次启动再试
      console.warn(`[migrate] failed to rebuild ${table}:`, (e as Error).message);
    }
  }
  // 重建后要把索引再建一次(表被 drop 了,索引也没了)
  try {
    await c.execute(
      "CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(tenant, conversation_id, deliver_at)",
    );
  } catch {}
}

/**
 * 保证一个 tenant 的初始数据存在 —— 三个默认会话、6 个 agent_state、
 * profile/onboarded/settings 三条 kv。幂等,一个 tenant 生命周期跑一次。
 */
export async function ensureTenant(t: string): Promise<void> {
  if (!globalThis.__meemateTenantsReady) globalThis.__meemateTenantsReady = new Set();
  if (globalThis.__meemateTenantsReady.has(t)) return;

  const c = await db();
  const has = await c.execute({
    sql: "SELECT count(*) n FROM conversations WHERE tenant=?",
    args: [t],
  });
  if (Number(has.rows[0].n) === 0) {
    await c.execute({
      sql: "INSERT INTO conversations (tenant,id,kind,title,agent_id,members,intro,pinned,sort) VALUES (?,?,?,?,?,?,?,?,?)",
      args: [t, "c-mimi", "single", "小咪管家", "mimi", '["mimi"]', null, 1, 100],
    });
    for (let i = 0; i < GROUPS.length; i++) {
      const g = GROUPS[i];
      await c.execute({
        sql: "INSERT INTO conversations (tenant,id,kind,title,agent_id,members,intro,pinned,sort) VALUES (?,?,?,?,?,?,?,?,?)",
        args: [t, g.id, "group", g.title, null, JSON.stringify(g.members), g.intro, 0, 90 - i],
      });
    }
    for (const id of Object.keys(AGENTS)) {
      await c.execute({
        sql: "INSERT INTO agent_state (tenant,agent_id,friend) VALUES (?,?,?)",
        args: [t, id, id === "mimi" ? 1 : 0],
      });
    }
    await c.execute({
      sql: "INSERT INTO app (tenant,k,v) VALUES (?,?,?)",
      args: [t, "profile", JSON.stringify(DEFAULT_PROFILE)],
    });
    await c.execute({
      sql: "INSERT INTO app (tenant,k,v) VALUES (?,?,?)",
      args: [t, "onboarded", "0"],
    });
    await c.execute({
      sql: "INSERT INTO app (tenant,k,v) VALUES (?,?,?)",
      args: [t, "settings", JSON.stringify(DEFAULT_SETTINGS)],
    });
  } else {
    // legacy 或已存在的 tenant 只做群名 sync,新增群改名时不掉队
    for (const g of GROUPS) {
      await c.execute({
        sql: "UPDATE conversations SET title=?, intro=? WHERE tenant=? AND id=?",
        args: [g.title, g.intro, t, g.id],
      });
    }
  }
  globalThis.__meemateTenantsReady.add(t);
}

export const DEFAULT_PROFILE = {
  nickname: "",
  area: "北京 西土城",
  avoid: [] as string[],
  taste: [] as string[],
  budget: "25 到 40",
  weekend: [] as string[],
  wake: "08:30",
  sleep: "01:00",
};

export const DEFAULT_SETTINGS = {
  quiet: ["23:30", "07:30"],
  push: { reminder: true, meal: true, weekend: true },
  silenceUntil: 0,
};

/* -------------------- 查询助手 -------------------- */

/**
 * 所有 SQL 通过这三个助手走。返回类型显式标 Promise,少写一个 await tsc
 * 就会报错,是这次重构的安全网。
 */

export async function all<T = unknown>(sql: string, args: InArgs = []): Promise<T[]> {
  const c = await db();
  const rs = await c.execute({ sql, args });
  return rs.rows as unknown as T[];
}

export async function first<T = unknown>(sql: string, args: InArgs = []): Promise<T | undefined> {
  const c = await db();
  const rs = await c.execute({ sql, args });
  return rs.rows[0] as unknown as T | undefined;
}

export async function run(sql: string, args: InArgs = []): Promise<void> {
  const c = await db();
  await c.execute({ sql, args });
}

/* -------------------- KV -------------------- */

/** KV 按 tenant 分区:每个租户的 profile / onboarded / settings 各自一份 */
export async function kvGet<T>(k: string, fallback: T): Promise<T> {
  const row = await first<{ v: string }>(
    "SELECT v FROM app WHERE tenant=? AND k=?",
    [tenantId(), k],
  );
  if (!row) return fallback;
  try {
    return JSON.parse(row.v) as T;
  } catch {
    return row.v as unknown as T;
  }
}

export async function kvSet(k: string, v: unknown): Promise<void> {
  await run(
    "INSERT OR REPLACE INTO app (tenant,k,v) VALUES (?,?,?)",
    [tenantId(), k, typeof v === "string" ? v : JSON.stringify(v)],
  );
}

/* -------------------- 通用工具 -------------------- */

export const uid = (p = "") =>
  p + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/**
 * 本地日期字符串。不能用 toISOString:它按 UTC 切,
 * 东八区的凌晨会被算成前一天,日记和行程日期都会差一天。
 */
export function localDate(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const today = () => localDate();
