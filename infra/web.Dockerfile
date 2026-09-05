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

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# O `prisma generate` NÃO liga à base — só lê o esquema. Mas o
# `packages/db/prisma.config.ts` LÊ a variável, e sem ela o carregamento do
# ficheiro de configuração rebenta com "Failed to load config file". Custou-me
# três tentativas na revisão do E29 até perceber que o vermelho era isto e não
# defeito de produto. Um valor de mentira serve, e fica SÓ nesta fase.
ENV MIGRATION_DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
RUN cd packages/db && ./node_modules/.bin/prisma generate
RUN pnpm --filter web build

FROM build AS runtime
ENV NODE_ENV=production
ENV PORT=8130
EXPOSE 8130
# A versão vem de fora e fica na imagem: é o que o portão 4 do publicar.sh
# compara com o que responde no ar.
ARG VERSAO=desconhecida
ENV BOSSAOS_VERSAO=${VERSAO}
LABEL bossaos.versao=${VERSAO}
CMD ["pnpm", "--filter", "web", "start"]
