# syntax=docker/dockerfile:1.7
# Next.js + better-sqlite3 (Debian slim; 用 prebuilt 二进制,构建更快、无 musl 兼容坑)

FROM node:20-slim AS base

# ---- deps: 装依赖(better-sqlite3 优先用 prebuilt,失败才 fallback 到源码编译)----
FROM base AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: next build,输出 .next/standalone ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: 最小运行时 ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# SQLite 文件放这里;Fly 挂载 volume 到 /data 会覆盖成持久磁盘
RUN mkdir -p /data && chown -R nextjs:nodejs /data
ENV DATA_DIR=/data

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
