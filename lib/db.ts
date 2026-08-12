import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { AGENTS, GROUPS } from "./agents";

const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "meemate.db");

declare global {
  var __meemateDb: Database.Database | undefined;
}

function create() {
  fs.mkdirSync(DIR, { recursive: true });
  const db = new Database(FILE);
  db.pragma("journal_mode = WAL");
  db.exec(`
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
      type TEXT NOT NULL,            -- diary | fact
      day TEXT NOT NULL,
      grp TEXT,                      -- 档案分组 / 或 diary
      layer TEXT,                    -- profile | episode | state
      tag TEXT,                      -- 供推荐卡引用的锚点，如 spicy / budget
      text TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'said',  -- said | guess
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
      id TEXT PRIMARY KEY,           -- 已经推过的内容，换一个时排除
      conversation_id TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,            -- order | navigate | wish | todo | reject | chat
      text TEXT NOT NULL,
      tag TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agent_state (
      agent_id TEXT PRIMARY KEY,
      pushed INTEGER NOT NULL DEFAULT 0,
      engaged INTEGER NOT NULL DEFAULT 0,
      ignored_streak INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 0,   -- 熟悉度
      friend INTEGER NOT NULL DEFAULT 0,
      muted INTEGER NOT NULL DEFAULT 0
    );
  `);
  return db;
}

export function db() {
  if (!global.__meemateDb) {
    global.__meemateDb = create();
    seed(global.__meemateDb);
    syncTitles(global.__meemateDb);
    migrate(global.__meemateDb);
  }
  return global.__meemateDb;
}

/** 已经建过库的补上后加的列，ALTER 失败说明已经有了，忽略即可 */
function migrate(d: Database.Database) {
  const add = [
    "ALTER TABLE plans ADD COLUMN date TEXT",
    "ALTER TABLE plans ADD COLUMN confirmed INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE plan_items ADD COLUMN addr TEXT",
    "ALTER TABLE plan_items ADD COLUMN booking INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE plan_items ADD COLUMN link TEXT",
    "ALTER TABLE plan_items ADD COLUMN price INTEGER",
  ];
  for (const sql of add) {
    try {
      d.prepare(sql).run();
    } catch {}
  }
}

/** 群名按设计稿改成了「吃什么」「周末去哪」，已建库的行也跟一下 */
function syncTitles(d: Database.Database) {
  const up = d.prepare("UPDATE conversations SET title=?, intro=? WHERE id=?");
  GROUPS.forEach((g) => up.run(g.title, g.intro, g.id));
}

function seed(d: Database.Database) {
  const has = d.prepare("SELECT count(*) n FROM conversations").get() as {
    n: number;
  };
  if (has.n > 0) return;

  const ins = d.prepare(
    "INSERT INTO conversations (id,kind,title,agent_id,members,intro,pinned,sort) VALUES (?,?,?,?,?,?,?,?)",
  );
  ins.run("c-mimi", "single", "小咪管家", "mimi", '["mimi"]', null, 1, 100);
  GROUPS.forEach((g, i) =>
    ins.run(
      g.id,
      "group",
      g.title,
      null,
      JSON.stringify(g.members),
      g.intro,
      0,
      90 - i,
    ),
  );

  const st = d.prepare("INSERT INTO agent_state (agent_id,friend) VALUES (?,?)");
  Object.keys(AGENTS).forEach((id) => st.run(id, id === "mimi" ? 1 : 0));

  setKV(d, "profile", JSON.stringify(DEFAULT_PROFILE));
  setKV(d, "onboarded", "0");
  setKV(d, "settings", JSON.stringify(DEFAULT_SETTINGS));
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

function setKV(d: Database.Database, k: string, v: string) {
  d.prepare("INSERT OR REPLACE INTO app (k,v) VALUES (?,?)").run(k, v);
}

export function kvGet<T>(k: string, fallback: T): T {
  const row = db().prepare("SELECT v FROM app WHERE k=?").get(k) as
    | { v: string }
    | undefined;
  if (!row) return fallback;
  try {
    return JSON.parse(row.v) as T;
  } catch {
    return row.v as unknown as T;
  }
}

export function kvSet(k: string, v: unknown) {
  db()
    .prepare("INSERT OR REPLACE INTO app (k,v) VALUES (?,?)")
    .run(k, typeof v === "string" ? v : JSON.stringify(v));
}

export const uid = (p = "") =>
  p + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/**
 * 本地日期字符串。不能用 toISOString：它按 UTC 切，
 * 东八区的凌晨会被算成前一天，日记和行程日期都会差一天。
 */
export function localDate(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const today = () => localDate();
