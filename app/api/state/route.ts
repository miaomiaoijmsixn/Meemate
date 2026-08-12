import { AGENTS } from "@/lib/agents";
import { db, kvGet, DEFAULT_SETTINGS } from "@/lib/db";
import { llmReady } from "@/lib/llm";
import { lastPreview, pending } from "@/lib/outbox";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const convs = db()
    .prepare("SELECT * FROM conversations ORDER BY pinned DESC, sort DESC")
    .all() as any[];
  const list = convs.map((c) => {
    const last = lastPreview(c.id);
    const members: string[] = JSON.parse(c.members);
    return {
      id: c.id,
      kind: c.kind,
      title: c.title,
      agentId: c.agent_id,
      members,
      intro: c.intro,
      pinned: !!c.pinned,
      muted: !!c.muted,
      live: pending(c.id) > 0,
      preview: last
        ? {
            sender: last.sender,
            senderName: last.sender === "user" ? "你" : AGENTS[last.sender]?.name,
            text: last.text ?? (last.cards?.length ? "[推荐]" : ""),
            at: last.deliverAt,
            mention: last.mention,
          }
        : null,
    };
  });
  const todos = db()
    .prepare("SELECT count(*) n FROM todos WHERE done=0")
    .get() as { n: number };
  const plan = db()
    .prepare("SELECT id FROM plans ORDER BY created_at DESC LIMIT 1")
    .get() as { id: string } | undefined;
  return Response.json({
    conversations: list,
    profile: kvGet<Profile>("profile", null as unknown as Profile),
    onboarded: Number(kvGet<number | string>("onboarded", 0)) === 1,
    settings: kvGet("settings", DEFAULT_SETTINGS),
    agents: AGENTS,
    llm: llmReady(),
    openTodos: todos.n,
    latestPlan: plan?.id ?? null,
  });
}
