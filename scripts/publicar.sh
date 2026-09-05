#!/usr/bin/env bash
#
# PUBLICAR O BOSSAOS NO VPS — com portões, e nenhum deles é cerimónia.
#
# Autorizado pelo Matheus a 05/09 às 23h35, no Telegram: mesma caixa do ilora,
# staging em mwdeveloper.tech. A caixa foi medida antes (2 vCPU, 7,9 GB, carga
# 0,01, 85 GB livres) e já carrega ilora, Norte, LeadScout, o TPV antigo do
# piloto e o Ya Está Hecha.
#
# Segue o padrão do `deploy-vps.sh` do ilora, que já está provado, e acrescenta
# um portão que só este projecto pode ter.
set -euo pipefail
cd "$(dirname "$0")/.."

VPS="root@31.220.111.39"
CHAVE="$HOME/.deploys/ilora/ilora_vps_ed25519"
SSH="ssh -i $CHAVE -o ConnectTimeout=20 $VPS"
RAIZ_REMOTA="/root/bossaos"
PORTA_APP="8130"          # livre: o TPV antigo está no 8124
DOMINIO="bossaos.mwdeveloper.tech"

erro() { echo "ERRO: $1" >&2; exit 1; }

# ── PORTÃO 1: não se publica o que não foi assinado ─────────────────────────
# Este é o portão que só este projecto pode ter, e é o mais importante dos
# quatro. O medidor sabe quantas etapas estão a aguardar validação; se alguma
# estiver, o que iria para o ar inclui código que ninguém reviu.
#
# O motor inteiro existe para que nada passe sem segunda assinatura. Publicar
# por cima disso desfazia o motor a partir de fora.
AGUARDA="$(bash scripts/estado.sh 2>/dev/null | grep -oE 'AGUARDA=[0-9]+' | cut -d= -f2)"
[ "${AGUARDA:-1}" = "0" ] || erro "há $AGUARDA etapa(s) por validar — assina antes de publicar"

# ── PORTÃO 2: árvore limpa ──────────────────────────────────────────────────
# Publicar de uma árvore suja põe no ar uma coisa que não existe em commit
# nenhum, e no dia seguinte ninguém sabe o que está lá.
[ -z "$(git status --porcelain | grep -vE 'capturas/|\.png$')" ] \
  || erro "árvore suja — commita ou limpa antes de publicar"

VERSAO="$(git rev-parse --short HEAD)"
echo "==> a publicar $VERSAO em $DOMINIO"

# ── PORTÃO 3: os segredos vivem no servidor ─────────────────────────────────
# Nunca sobem daqui. Se não existirem lá, o deploy pára — em vez de arrancar com
# um ficheiro de exemplo e servir uma base vazia a parecer que funciona.
$SSH "[ -f $RAIZ_REMOTA/.env.prod ]" \
  || erro "$RAIZ_REMOTA/.env.prod não existe no servidor — cria-o lá, com chmod 600"

# ── O envio, sem apagar o que não é nosso ───────────────────────────────────
# `--delete` está fora de propósito: já comeu um .env noutro projecto deste
# vault, e o `--exclude` do .env é a segunda defesa da mesma coisa.
rsync -az --exclude='.git' --exclude='node_modules' --exclude='.next' \
      --exclude='*.env*' -e "ssh -i $CHAVE" ./ "$VPS:$RAIZ_REMOTA/"

# ── Build NATIVO no VPS ─────────────────────────────────────────────────────
# O Mac é arm64 e a caixa é amd64: uma imagem construída aqui dá `exec format
# error` lá. Custou um deploy noutro projecto para eu aprender.
$SSH "cd $RAIZ_REMOTA && docker compose build --build-arg VERSAO=$VERSAO"
$SSH "cd $RAIZ_REMOTA && docker compose run --rm app pnpm db:migrate:deploy"
$SSH "cd $RAIZ_REMOTA && docker compose up -d"

# ── PORTÃO 4: a versão no ar é a que acabei de construir ────────────────────
# Um 200 não é uma entrega e um deploy sem erro não é uma publicação. O que
# prova é a versão que responde ser a mesma que saiu daqui: sem isto, um build
# que não pegou serve o bundle antigo com ar de sucesso, e eu digo que publiquei.
sleep 6
NO_AR="$($SSH "curl -sf http://localhost:$PORTA_APP/api/saude" || true)"
[ -n "$NO_AR" ] || erro "sem resposta de saúde — docker compose logs app"
case "$NO_AR" in
  *"$VERSAO"*) echo "==> no ar e confirmado: $VERSAO" ;;
  *) erro "responde outra versão que não $VERSAO — o build não pegou" ;;
esac

echo "==> $DOMINIO"
