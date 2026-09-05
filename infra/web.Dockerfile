# O BossaOS no VPS. Construído NO SERVIDOR (amd64) — o Mac é arm64 e uma imagem
# feita aqui dá `exec format error` lá.
#
# Ao contrário do Norte, que está na mesma caixa, isto NÃO é um build estático:
# o BossaOS é Next com servidor — rotas de API, componentes de servidor, sessão.
# Servir a pasta não chega; tem de haver processo.
FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate
# ── A variável tem de existir JÁ NA FASE BASE ──────────────────────────────
# O `packages/db` tem um POSTINSTALL que corre `prisma generate`, portanto ele
# acontece dentro do `pnpm install` — antes de qualquer coisa posta na fase
# seguinte. O produto até se explica bem: "MIGRATION_DATABASE_URL em falta. É a
# credencial que altera o schema, e é diferente da DATABASE_URL do runtime."
#
# Quinta vez que esta causa me aparece esta noite. Da primeira li-a como defeito
# de produto. E o README do ilora, nesta mesma caixa, já dizia ".env copiado
# ANTES do install" — eu li-o e pus a variável na fase errada na mesma.
#
# `prisma generate` NÃO liga à base, só lê o esquema: um valor de mentira serve,
# e o runtime recebe o verdadeiro pelo `env_file` do compose.
ENV MIGRATION_DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
# ── A variável tem de existir JÁ AQUI, e não na fase de build ───────────────
# O `packages/db` tem um POSTINSTALL que corre `prisma generate`, portanto ele
# acontece dentro do `pnpm install` — antes de qualquer coisa que eu pusesse na
# fase seguinte. O `prisma generate` NÃO liga à base; é o `prisma.config.ts` que
# LÊ a variável e rebenta com "Failed to load config file" sem ela.
#
# Quarta vez que esta mesma causa me aparece esta noite: três na revisão do E29,
# lida como defeito de produto, e agora aqui. E o README do ilora, na mesma
# caixa, já dizia ".env copiado ANTES do install: o prisma generate precisa
# dele" — eu tinha a lição escrita, li-a, e mesmo assim pu-la na fase errada.

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN cd packages/db && ./node_modules/.bin/prisma generate
RUN pnpm --filter web build

FROM build AS runtime
ENV NODE_ENV=production
ENV PORT=8140
EXPOSE 8140
# A versão vem de fora e fica na imagem: é o que o portão 4 do publicar.sh
# compara com o que responde no ar.
ARG VERSAO=desconhecida
ENV BOSSAOS_VERSAO=${VERSAO}
LABEL bossaos.versao=${VERSAO}
CMD ["pnpm", "--filter", "web", "start"]
