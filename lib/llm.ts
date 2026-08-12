/**
 * DeepSeek 调用。没有 key 时返回 null，上层自动退回内置剧本，
 * 所以整个 demo 在完全离线的情况下也能跑通全流程。
 */
const ENDPOINT =
  process.env.LLM_BASE_URL ?? "https://api.deepseek.com/chat/completions";
const MODEL = process.env.LLM_MODEL ?? "deepseek-chat";

export const llmReady = () => !!process.env.DEEPSEEK_API_KEY;

export async function chatJSON<T>(
  system: string,
  user: string,
  timeoutMs = 20000,
): Promise<T | null> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: ac.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.9,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      console.warn("[llm] http", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn("[llm] failed, falling back to scripted beats:", (e as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
