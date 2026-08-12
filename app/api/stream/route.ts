import { delivered, typingNow } from "@/lib/outbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 消息按 deliver_at 逐条到达，正在输入按 typing_at 出现。
 * 节奏由数据决定而不是前端定时器，所以刷新页面也不会一次刷出全部。
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const conv = url.searchParams.get("c")!;
  let seq = Number(url.searchParams.get("seq") ?? 0);
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };
      req.signal.addEventListener("abort", () => {
        closed = true;
        try {
          controller.close();
        } catch {}
      });

      let lastTyping: string | null = null;
      send("hello", { ok: true });
      while (!closed) {
        const msgs = delivered(conv, seq);
        for (const m of msgs) {
          send("msg", m);
          seq = m.seq;
        }
        const t = typingNow(conv);
        if (t !== lastTyping) {
          lastTyping = t;
          send("typing", { sender: t });
        }
        await sleep(220);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
