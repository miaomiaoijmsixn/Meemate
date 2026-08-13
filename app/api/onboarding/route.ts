import { withTenant } from "@/lib/api";
import { kvSet } from "@/lib/db";
import { seedFromProfile } from "@/lib/memory";
import { enqueue } from "@/lib/outbox";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";

export const POST = (req: Request) =>
  withTenant(async () => {
    const profile = (await req.json()) as Profile;
    await kvSet("profile", profile);
    await kvSet("onboarded", 1);
    await seedFromProfile();

    const name = profile.nickname || "你";
    const now = Date.now();

    await enqueue(
      "c-mimi",
      [
        { speaker: "mimi", text: `记好啦,${name} 🐾`, gapMs: 420 },
        { speaker: "mimi", text: "我把你拉进两个群啦,他们到点会自己开口", gapMs: 480 },
        { speaker: "mimi", text: "要是嫌烦,随时在我的页面里把他们按下去,不用忍着呀" },
      ],
      now + 400,
    );

    await enqueue(
      "g-eat",
      [
        { speaker: "waimai", text: `${name} 来了!先说清楚,我只管外卖和算账 🛵`, gapMs: 450 },
        { speaker: "laochi", text: "线下的馆子交给我。我跟你讲,愿意走两步的话,我这儿的东西比他强", gapMs: 500 },
        { speaker: "waimai", text: "到饭点小咪会把我俩挑的摆一块儿,你挑一个就完事 👀", mention: true },
      ],
      now + 1600,
    );

    await enqueue(
      "g-weekend",
      [
        { speaker: "jingshen", text: "展览、演出、电影——这些交给我 ✨", gapMs: 460 },
        { speaker: "majiaxian", text: "动起来的部分我负责(跑不动就室内,别怕)💪", gapMs: 500 },
        { speaker: "lvyou", text: "想出城找我,车程和人流我都给你算好 🧭", gapMs: 460 },
        { speaker: "jingshen", text: "周四晚上开始,我们给你的周末找点事做" },
      ],
      now + 3200,
    );

    return Response.json({ ok: true });
  });
