import { AGENTS } from "@/lib/agents";
import { withTenant } from "@/lib/api";
import { all, first, kvGet, DEFAULT_SETTINGS } from "@/lib/db";
import { llmReady } from "@/lib/llm";
import { lastPreview, pending } from "@/lib/outbox";
import { tenantId } from "@/lib/tenant";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConvRow = {
  id: string;
  kind: string;
  title: string;
  agent_id: string | null;
  members: string;
  intro: string | null;
  pinned: number;
  muted: number;
};

export const GET = () =>
  withTenant(async () => {
    const t = tenantId();
    const convs = await all<ConvRow>(
      "SELECT * FROM conversations WHERE tenant=? ORDER BY pinned DESC, sort DESC",
      [t],
    );
    const list = await Promise.all(
      convs.map(async (c) => {
        const [last, pend] = await Promise.all([lastPreview(c.id), pending(c.id)]);
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
          live: pend > 0,
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
      }),
    );
    const [todos, plan, profile, onboarded, settings] = await Promise.all([
      first<{ n: number }>("SELECT count(*) n FROM todos WHERE tenant=? AND done=0", [t]),
      first<{ id: string }>(
        "SELECT id FROM plans WHERE tenant=? ORDER BY created_at DESC LIMIT 1",
        [t],
      ),
      kvGet<Profile>("profile", null as unknown as Profile),
      kvGet<number | string>("onboarded", 0),
      kvGet("settings", DEFAULT_SETTINGS),
    ]);
    return Response.json({
      conversations: list,
      profile,
      onboarded: Number(onboarded) === 1,
      settings,
      agents: AGENTS,
      llm: llmReady(),
      openTodos: Number(todos?.n ?? 0),
      latestPlan: plan?.id ?? null,
    });
  });
