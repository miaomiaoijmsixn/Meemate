import { createClient, type Client, type InArgs } from "@libsql/client";
import { AGENTS, GROUPS } from "./agents";

/**
 * 数据库客户端。本地开发用 file:./data/meemate.db(SQLite 嵌入模式,免鉴权),
 * 生产用 libsql://... 连 Turso。同一套 SQL、同一套 API。
 */

declare global {
  var __meemateDbInit: Promise<Client> | undefined;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS app (
    k TEXT PRIMARY KEY,
    v TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    agent_id TEXT,
    members TEXT NOT NULL DEFAULT '[]',
    intro TEXT,
    pinned INTEGER NOT NULL DEFAULT 0,
    muted INTEGER NOT NULL DEFAULT 0,
    sort INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    seq INTEGER,
    conversation_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    kind TEXT NOT NULL,
    text TEXT,
    payload TEXT,
    mention INTEGER NOT NULL DEFAULT 0,
    chips TEXT,
    typing_at INTEGER NOT NULL,
    deliver_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, deliver_at);
  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
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
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS wishes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    subtitle TEXT,
    meta TEXT,
    source_agent TEXT,
    deadline TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    day TEXT NOT NULL,
    date TEXT,
    confirmed INTEGER NOT NULL DEFAULT 0,
    params TEXT NOT NULL,
    thinking TEXT NOT NULL DEFAULT '[]',
    notes TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS plan_items (
    id TEXT PRIMARY KEY,
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
    price INTEGER
  );
  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    due TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    source_msg TEXT,
    done INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS shown (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    tag TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS agent_state (
    agent_id TEXT PRIMARY KEY,
    pushed INTEGER NOT NULL DEFAULT 0,
    engaged INTEGER NOT NULL DEFAULT 0,
    ignored_streak INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 0,
    friend INTEGER NOT NULL DEFAULT 0,
    muted INTEGER NOT NULL DEFAULT 0
  );
`;

async function connect(): Promise<Client> {
  const url = process.env.TURSO_DATABASE_URL || "file:./data/meemate.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url, authToken });
  await client.executeMultiple(SCHEMA);
  await migrate(client);
  await seed(client);
  await syncTitles(client);
  return client;
}

export function db(): Promise<Client> {
  if (!globalThis.__meemateDbInit) {
    globalThis.__meemateDbInit = connect().catch((e) => {
      // 初始化失败时清掉缓存,下次请求可以重试
      globalThis.__meemateDbInit = undefined;
      throw e;
    });
  }
  return globalThis.__meemateDbInit;
}

/** 已经建过库的补上后加的列,ALTER 失败说明已经有了,忽略即可 */
async function migrate(c: Client) {
  const stmts = [
    "ALTER TABLE plans ADD COLUMN date TEXT",
    "ALTER TABLE plans ADD COLUMN confirmed INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE plan_items ADD COLUMN addr TEXT",
    "ALTER TABLE plan_items ADD COLUMN booking INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE plan_items ADD COLUMN link TEXT",
    "ALTER TABLE plan_items ADD COLUMN price INTEGER",
  ];
  for (const sql of stmts) {
    try {
      await c.execute(sql);
    } catch {}
  }
}

/** 群名按设计稿改成了「吃什么」「周末去哪」,已建库的行也跟一下 */
async function syncTitles(c: Client) {
  for (const g of GROUPS) {
    await c.execute({
      sql: "UPDATE conversations SET title=?, intro=? WHERE id=?",
      args: [g.title, g.intro, g.id],
    });
  }
}

async function seed(c: Client) {
  const has = await c.execute("SELECT count(*) n FROM conversations");
  if (Number(has.rows[0].n) > 0) return;

  await c.execute({
    sql: "INSERT INTO conversations (id,kind,title,agent_id,members,intro,pinned,sort) VALUES (?,?,?,?,?,?,?,?)",
    args: ["c-mimi", "single", "小咪管家", "mimi", '["mimi"]', null, 1, 100],
  });
  for (let i = 0; i < GROUPS.length; i++) {
    const g = GROUPS[i];
    await c.execute({
      sql: "INSERT INTO conversations (id,kind,title,agent_id,members,intro,pinned,sort) VALUES (?,?,?,?,?,?,?,?)",
      args: [g.id, "group", g.title, null, JSON.stringify(g.members), g.intro, 0, 90 - i],
    });
  }

  for (const id of Object.keys(AGENTS)) {
    await c.execute({
      sql: "INSERT INTO agent_state (agent_id,friend) VALUES (?,?)",
      args: [id, id === "mimi" ? 1 : 0],
    });
  }

  await setKV(c, "profile", JSON.stringify(DEFAULT_PROFILE));
  await setKV(c, "onboarded", "0");
  await setKV(c, "settings", JSON.stringify(DEFAULT_SETTINGS));
}

async function setKV(c: Client, k: string, v: string) {
  await c.execute({
    sql: "INSERT OR REPLACE INTO app (k,v) VALUES (?,?)",
    args: [k, v],
  });
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
 * 所有 SQL 通过这三个助手走。返回类型显式标 Promise,
 * 少写一个 await tsc 就会报错,是这次重构的安全网。
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

export async function kvGet<T>(k: string, fallback: T): Promise<T> {
  const row = await first<{ v: string }>("SELECT v FROM app WHERE k=?", [k]);
  if (!row) return fallback;
  try {
    return JSON.parse(row.v) as T;
  } catch {
    return row.v as unknown as T;
  }
}

export async function kvSet(k: string, v: unknown): Promise<void> {
  await run("INSERT OR REPLACE INTO app (k,v) VALUES (?,?)", [
    k,
    typeof v === "string" ? v : JSON.stringify(v),
  ]);
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
