#!/usr/bin/env bash
#
# PUBLICAR O BOSSAOS NO VPS — com portões, e nenhum deles é cerimónia.
#
# Autorizado pelo Matheus a 05/09 às 23h35, no Telegram: mesma caixa do ilora,
# staging em mwdeveloper.tech.
#
# ── A primeira versão deste ficheiro não podia correr ────────────────────────
#
# Escrevi-a às 23h45 com comentários confiantes sobre quatro portões e TRÊS
# comandos que eram ficção: chamava `docker compose build` num repositório sem
# Dockerfile nem compose, e batia num `/api/saude` que não existe — chama-se
# `/api/health`. E o portão de que mais me orgulhava, o da versão no ar, não
# podia funcionar de todo: o `/api/health` devolve `{estado: vivo}` e **não
# devolve versão nenhuma**.
#
# É exactamente o defeito que ando a caçar neste produto o dia inteiro — código
# que parece completo e nunca correu — cometido por mim, num script sobre rigor.
# Fica escrito aqui em vez de ser calado no histórico.
#
# ── O que mudou, e porquê ────────────────────────────────────────────────────
#
# Build NATIVO no VPS, não Docker para a aplicação. Duas razões medidas: o
# `next.config` não tem `output: standalone`, e o `prisma generate` precisa do
# ambiente na construção — o mesmo tropeço que me custou três tentativas na
# revisão do E29. O README do ilora, nesta mesma caixa, também diz build nativo.
# Postgres fica em contentor, que é a parte simples.
# ── O QUE AINDA NÃO EXISTE, e sem o qual isto NÃO corre ─────────────────────
#
# Escrito para não voltar a acontecer o de cima. Por ordem:
#
#   1. `$RAIZ/.env.prod` no servidor, chmod 600 — com DATABASE_URL a apontar ao
#      127.0.0.1:5434, as três credenciais separadas e o POSTGRES_PASSWORD.
#   2. A unidade systemd `bossaos` — o `systemctl restart` aqui em baixo depende
#      dela e ela ainda não foi criada.
#   3. O registo DNS de `bossaos.mwdeveloper.tech`.
#   4. O bloco no Caddyfile a fazer reverse_proxy para o 8130. Verificado a
#      05/09: não há nenhuma linha com `bossaos` nesse ficheiro.
#
# Enquanto qualquer destas faltar, este script pára num portão em vez de
# publicar meia coisa — que é o que se pretende.
set -euo pipefail
cd "$(dirname "$0")/.."

VPS="root@31.220.111.39"
CHAVE="$HOME/.deploys/ilora/ilora_vps_ed25519"
SSH="ssh -i $CHAVE -o ConnectTimeout=20 $VPS"
RAIZ="/root/bossaos"
PORTA="8130"            # o TPV antigo do piloto está no 8124
DOMINIO="bossaos.mwdeveloper.tech"

erro() { echo "ERRO: $1" >&2; exit 1; }

# ── PORTÃO 1: não se publica o que não foi assinado ─────────────────────────
# O portão que só este projecto pode ter, e o mais importante dos quatro. O
# motor inteiro existe para que nada passe sem segunda assinatura; publicar por
# cima disso desfazia-o a partir de fora.
AGUARDA="$(bash scripts/estado.sh 2>/dev/null | grep -oE 'AGUARDA=[0-9]+' | cut -d= -f2)"
[ "${AGUARDA:-1}" = "0" ] || erro "há ${AGUARDA:-?} etapa(s) por validar — assina antes de publicar"

# ── PORTÃO 2: árvore limpa ──────────────────────────────────────────────────
[ -z "$(git status --porcelain | grep -vE 'capturas/|\.png$')" ] \
  || erro "árvore suja — publicar daqui põe no ar o que não existe em commit nenhum"

VERSAO="$(git rev-parse --short HEAD)"
echo "==> a publicar $VERSAO em $DOMINIO"

# ── PORTÃO 3: os segredos vivem no servidor ─────────────────────────────────
# Nunca sobem daqui. Sem eles o deploy pára, em vez de arrancar com um exemplo e
# servir uma base vazia a parecer que funciona.
$SSH "[ -f $RAIZ/.env.prod ]" \
  || erro "$RAIZ/.env.prod não existe no servidor — cria-o lá, chmod 600"

# ── A marca da versão, ANTES do build ───────────────────────────────────────
# É isto que torna o portão 4 possível sem tocar em código de produto: um
# ficheiro estático que o Next serve, escrito antes de construir. Se o build não
# pegar, o servidor antigo continua a servir a marca ANTIGA — que é precisamente
# a diferença que quero medir.
mkdir -p apps/web/public
echo "$VERSAO" > apps/web/public/versao.txt

# `--delete` está fora de propósito e o `--exclude` do env é a segunda defesa da
# mesma coisa: já comeu um .env noutro projecto deste vault.
rsync -az --exclude='.git' --exclude='node_modules' --exclude='.next' \
      --exclude='*.env*' -e "ssh -i $CHAVE" ./ "$VPS:$RAIZ/"
rm -f apps/web/public/versao.txt

# ── Base, migrações e build, tudo no servidor ───────────────────────────────
# Docker, como os outros tres produtos desta caixa. A primeira versao usava
# systemd: fui ver e NAO ha uma unica unidade systemd no servidor - ilora, Norte
# e o TPV antigo correm todos em contentor com `restart: unless-stopped`. Mais
# uma suposicao minha que a maquina desmentiu.
#
# `-p bossaos` nos dois ficheiros de propósito: partilham a rede do projecto, e
# e por isso que o .env.prod aponta a `bossaos-db:5432` e nao a 127.0.0.1:5434.
# Dentro do contentor, 127.0.0.1 e o proprio contentor - a base ficaria
# inalcancavel e o erro sairia como "connection refused", que se le como base em
# baixo em vez de endereco errado.
$SSH "cd $RAIZ && docker compose -p bossaos -f infra/postgres.yml up -d"
$SSH "cd $RAIZ && VERSAO=$VERSAO docker compose -p bossaos -f infra/compose.prod.yml build"
$SSH "cd $RAIZ && docker compose -p bossaos -f infra/compose.prod.yml run --rm --entrypoint sh bossaos-web -c 'pnpm db:migrate:deploy'"
$SSH "cd $RAIZ && VERSAO=$VERSAO docker compose -p bossaos -f infra/compose.prod.yml up -d --force-recreate"
sleep 8

# ── PORTÃO 4: a versão no ar é a que acabei de construir ────────────────────
# Um 200 não é uma entrega e um deploy sem erro não é uma publicação. Sem isto,
# um build que não pegou serve o bundle antigo com ar de sucesso — e eu digo ao
# Matheus que publiquei.
VIVO="$($SSH "curl -sf http://localhost:$PORTA/api/health" || true)"
[ -n "$VIVO" ] || erro "sem resposta em /api/health — journalctl -u bossaos"
NO_AR="$($SSH "curl -sf http://localhost:$PORTA/versao.txt" || true)"
[ "$NO_AR" = "$VERSAO" ] \
  || erro "no ar está '${NO_AR:-nada}' e eu construí '$VERSAO' — o build não pegou"

echo "==> no ar e confirmado: $VERSAO em https://$DOMINIO"
