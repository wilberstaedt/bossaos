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
# ── 8140, e a porta anterior quase custou caro ──────────────────────────────
# Escolhi 8130 dizendo "livre: o TPV antigo está no 8124". Olhei para o vizinho
# de UM serviço e presumi o resto. O 8130 é do **norte_web** — a aplicação
# Norte do Matheus, em produção há três dias.
#
# O arranque falhou com "port is already allocated" e eu ia matar o docker-proxy
# que o segurava, a pensar que era resíduo das minhas tentativas. Foi ver a
# IDADE do processo que travou isso: três dias, não trinta minutos. Um número
# que eu podia perfeitamente não ter pedido.
#
# Ocupadas nesta caixa quando medi: 22 53 80 443 2019 3005 5433 5434 8087 8088
# 8124 8130 8131 65529. O 8140 foi VERIFICADO livre, não deduzido.
PORTA="8140"
# ── A PORTA ESTA DEFINIDA EM DOIS SITIOS, e ganha o .env.prod ───────────────
# O `ENV PORT=` do Dockerfile é sobreposto pelo `env_file:` do compose. Mudei a
# porta no Dockerfile e no compose, e a aplicação arrancou na ANTIGA na mesma —
# porque o `.env.prod` do servidor ainda dizia 8130 e é ele que manda.
#
# Editei o sítio que não decide. Sempre que um valor vive em dois sítios, o que
# interessa é qual deles vence, e isso não se lê no ficheiro que eu por acaso
# abri primeiro.
DOMINIO="bossaos.mwdeveloper.tech"

erro() { echo "ERRO: $1" >&2; exit 1; }

# ── PORTÃO 1: não se publica o que não foi assinado ─────────────────────────
# O portão que só este projecto pode ter, e o mais importante dos quatro. O
# motor inteiro existe para que nada passe sem segunda assinatura; publicar por
# cima disso desfazia-o a partir de fora.
# `grep -oE 'AGUARDA=[0-9]+'` apanhava TAMBEM o TELAS_AGUARDA, e a variavel
# ficava com dois valores - o portao recusou publicar dizendo "ha 0\n0 etapas
# por validar". Falhou FECHADO, que e a direccao certa para um defeito num
# portao, e por isso e que so o descobri a tentar publicar e nao em producao.
AGUARDA="$(bash scripts/estado.sh 2>/dev/null | tr ' ' '\n' | grep -oE '^AGUARDA=[0-9]+' | cut -d= -f2)"
[ "${AGUARDA:-1}" = "0" ] || erro "há ${AGUARDA:-?} etapa(s) por validar — assina antes de publicar"

# ── PORTÃO 2: publica-se um COMMIT, não a árvore ────────────────────────────
# A primeira versão exigia árvore limpa e depois fazia `rsync ./`, que envia o
# disco. Duas coisas erradas na mesma linha: a verificação era uma *promessa* de
# que o disco e o commit coincidiam, e o motor tem dois agentes a mexer na mesma
# árvore — a minha nunca está limpa quando o JR trabalha.
#
# Agora publica-se por CONSTRUÇÃO: `git archive` de um commit. O que vai para o
# ar existe em git porque não há outra maneira de lá chegar. É a mesma figura
# que exijo ao produto — garantia por impossibilidade, não por regra.
#
# Por omissão, o último commit; ou o que for passado no primeiro argumento.
REF="${1:-HEAD}"
git rev-parse --verify --quiet "$REF^{commit}" >/dev/null || erro "commit inválido: $REF"
VERSAO="$(git rev-parse --short "$REF")"
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
# O envio: o commit inteiro, e nada do disco. Sem `--delete` em lado nenhum e
# sem tocar no `.env.prod`, que vive lá e nunca sobe daqui.
git archive --format=tar "$REF" | $SSH "mkdir -p $RAIZ && tar -x -C $RAIZ"
# A marca da versão, escrita DEPOIS de extrair e ANTES de construir. Se o build
# não pegar, o contentor antigo continua a servir a marca antiga — que é
# precisamente a diferença que o portão 4 mede.
$SSH "mkdir -p $RAIZ/apps/web/public && echo '$VERSAO' > $RAIZ/apps/web/public/versao.txt"

# ── Base, migrações e build, tudo no servidor ───────────────────────────────
# Docker, como os outros tres produtos desta caixa. A primeira versao usava
# systemd: fui ver e NAO ha uma unica unidade systemd no servidor - ilora, Norte
# e o TPV antigo correm todos em contentor com `restart: unless-stopped`. Mais
# uma suposicao minha que a maquina desmentiu.
#
# `--env-file .env.prod` em TODAS as chamadas: o `docker compose` lê `.env` por
# omissão e o nosso chama-se `.env.prod`. A primeira corrida parou aqui com
# "required variable POSTGRES_PASSWORD is missing" - e eu não o tinha visto
# antes porque subi a base à mão, com o ambiente já carregado na sessão.
#
# `--env-file` resolve a INTERPOLAÇÃO do `${...}` no ficheiro de compose; o
# `env_file:` de dentro do serviço resolve o ambiente do CONTENTOR. São duas
# coisas e precisam-se as duas.
#
# `-p bossaos` nos dois ficheiros de propósito: partilham a rede do projecto, e
# e por isso que o .env.prod aponta a `bossaos-db:5432` e nao a 127.0.0.1:5434.
# Dentro do contentor, 127.0.0.1 e o proprio contentor - a base ficaria
# inalcancavel e o erro sairia como "connection refused", que se le como base em
# baixo em vez de endereco errado.
$SSH "cd $RAIZ && docker compose -p bossaos --env-file .env.prod -f infra/postgres.yml up -d"
# ── Os três papéis, criados AQUI e não à mão ────────────────────────────────
# A separação do E01 são três papéis com senhas distintas: `bossaos_migrate`
# mexe no esquema, `bossaos_app` só faz DML, `bossaos_auth` só vê identidade.
#
# Criei-os à mão na primeira montagem, e isso custou-me DUAS paragens: o passo
# manual escondeu a dependência do `--env-file`, e deixou um contentor no
# projecto errado que depois colidiu pelo nome.
#
# **Um passo que fica de fora do script fica de fora da próxima vez.**
$SSH "cd $RAIZ && bash infra/papeis.sh"

$SSH "cd $RAIZ && VERSAO=$VERSAO docker compose -p bossaos --env-file .env.prod -f infra/compose.prod.yml build"
$SSH "cd $RAIZ && docker compose -p bossaos --env-file .env.prod -f infra/compose.prod.yml run --rm --entrypoint sh bossaos-web -c 'pnpm db:migrate:deploy'"
$SSH "cd $RAIZ && VERSAO=$VERSAO docker compose -p bossaos --env-file .env.prod -f infra/compose.prod.yml up -d --force-recreate"
sleep 8

# ── PORTÃO 4: a versão no ar é a que acabei de construir ────────────────────
# Um 200 não é uma entrega e um deploy sem erro não é uma publicação. Sem isto,
# um build que não pegou serve o bundle antigo com ar de sucesso — e eu digo ao
# Matheus que publiquei.
VIVO="$($SSH "curl -sf http://localhost:$PORTA/api/health" || true)"
[ -n "$VIVO" ] || erro "sem resposta em /api/health — docker logs bossaos_web"
# A sonda NÃO passa pelo router do produto. A primeira versão pedia
# `/versao.txt` e recebeu `/es-ES/versao.txt`: o encaminhamento por idioma
# apanhou o ficheiro estático. A sonda entrou pela porta da frente e mediu o
# comportamento da casa em vez da versão.
#
# A etiqueta da imagem responde à pergunta certa — QUAL BUILD ESTÁ A CORRER — e
# lê-se do Docker, não da aplicação. É mais forte do que perguntar à aplicação
# que versão ela julga ser: se o `up` não recriasse o contentor, a etiqueta
# seria a antiga e isto acusava.
#
# O que prova: o contentor no ar foi construído deste commit. Com o /api/health
# acima, que prova que ele serve, são as duas metades da pergunta.
NO_AR="$($SSH "docker inspect --format '{{ index .Config.Labels \"bossaos.versao\" }}' bossaos_web" 2>/dev/null | tr -d '\r' || true)"
[ "$NO_AR" = "$VERSAO" ] \
  || erro "no ar está '${NO_AR:-nada}' e eu construí '$VERSAO' — o build não pegou"

echo "==> no ar e confirmado: $VERSAO em https://$DOMINIO"
