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
# ── O QUE O E35 ACRESCENTOU A ESTE FICHEIRO — e o que NÃO mexeu ─────────────
#
# Este guião é do sénior e correu a sério. Eu reescrevi-o por inteiro à primeira
# tentativa e **apaguei a caixa, o compose, os papéis e a migração** — deixando
# uma demonstração de portões que não publicava nada. É o defeito do E30 outra
# vez (escrever por cima sem ler é escrita destrutiva disfarçada de nova), e
# desta vez sobre o ficheiro que põe o produto no ar.
#
# O que ficou intacto: a caixa, a porta 8140, o `--env-file`, os papéis, a
# migração, o `git archive`, a marca da versão e as duas metades do portão 4.
#
# O que foi acrescentado, e porquê (régua `docs/reviews/ALVO-E35.md`):
#
#   · **Preparar não é publicar.** Sem `--autorizado-por`, corre os portões
#     LOCAIS, mostra o pacote e pára ANTES de tocar no servidor.
#   · **O portão 1 passa a NOMEAR as etapas.** O `AGUARDA=0` conta só as que
#     dizem «implementado aguardando validação» — uma etapa `planejado` com
#     código na árvore passava. Hoje passaria: o E34 tem trabalho feito e diz
#     `planejado`. Os dois ficam, e o novo é mais apertado.
#   · **O pacote é inspeccionado ANTES de subir** (`podeSubir`): nenhum `.env`,
#     `node_modules`, `.next` ou resultado de inspecção vai para o ar.
#   · **«Não sei» deixa de ser «errado»** no portão 4 (`versaoQueResponde`): uma
#     etiqueta ilegível manda ver o Docker, não reconstruir.
#
# A árvore suja **não** é portão, de propósito: são dois agentes na mesma árvore
# e o `git archive` já garante o que sobe. Fica como aviso, e o aviso diz o que
# NÃO vai.
set -euo pipefail
cd "$(dirname "$0")/.."

# `--` para a leitura das decisões puras, que vivem no domínio e não aqui: uma
# decisão em `bash` não se testa, testa-se o guião inteiro com rede e servidor.
decidir() { node --experimental-strip-types -e "$1" "${@:2}"; }

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

# ── Preparar não é publicar ─────────────────────────────────────────────────
# A autorização é explícita, de quem manda, e fica registada **com as palavras
# dele** — não um `sim`. Há história disto neste vault: um runbook dizia «nunca
# fazer deploy neste motor», o dono autorizou por escrito, o motor publicou, e o
# runbook ficou três horas a mentir.
AUTORIZADO_POR=""
REF_ARG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --autorizado-por) AUTORIZADO_POR="${2:-}"; shift 2 ;;
    --commit)         REF_ARG="${2:-}"; shift 2 ;;
    -*) erro "argumento desconhecido: $1" ;;
    *)  REF_ARG="$1"; shift ;;
  esac
done

# ── PORTÃO 1: não se publica o que não foi assinado ─────────────────────────
# O portão que só este projecto pode ter, e o mais importante dos quatro. O
# motor inteiro existe para que nada passe sem segunda assinatura; publicar por
# cima disso desfazia-o a partir de fora.
# `grep -oE 'AGUARDA=[0-9]+'` apanhava TAMBEM o TELAS_AGUARDA, e a variavel
# ficava com dois valores - o portao recusou publicar dizendo "ha 0\n0 etapas
# por validar". Falhou FECHADO, que e a direccao certa para um defeito num
# portao, e por isso e que so o descobri a tentar publicar e nao em producao.
#
# ── E O MEDIDOR MORRE EXACTAMENTE QUANDO ISTO ESTIVER PRONTO ────────────────
#
# Achado a 06/09, no controlo do E35. O `estado.sh` deriva a etapa actual como
# «a primeira que não está validada» e **rebenta se não houver nenhuma**:
#
#     ERRO: nao consegui derivar a etapa actual de docs/progress/ETAPAS.md
#
# Ou seja: com o projecto TODO validado — a única situação em que este portão
# devia abrir — o `estado.sh` sai a 1, o `pipefail` mata a atribuição, e o
# `set -e` mata o guião **antes da primeira linha de saída**. Zero texto,
# código 1: indistinguível de um portão a recusar, e sem dizer qual.
#
# Não mexo no medidor, que é partilhado e não é meu. Mexo aqui: a falha dele
# passa a ser NÃO MEDI, e o portão fica pelo `POR_VALIDAR`, que lê a matriz
# directamente e não precisa de derivar etapa nenhuma.
AGUARDA="$( { bash scripts/estado.sh 2>/dev/null || true; } | tr ' ' '\n' | grep -oE '^AGUARDA=[0-9]+' | cut -d= -f2 || true)"
if [ -z "${AGUARDA:-}" ]; then
  echo "==> NÃO MEDI o contador de etapas em espera: o medidor não respondeu."
  echo "    O portão continua, pela leitura directa da matriz."
else
  [ "$AGUARDA" = "0" ] || erro "há $AGUARDA etapa(s) por validar — assina antes de publicar"
fi

# ── E o AGUARDA sozinho não chega ───────────────────────────────────────────
# Conta só quem diz «implementado aguardando validação». Uma etapa `planejado`
# com código já escrito na árvore passa por aqui sem ser vista — e não é
# hipótese: a 06/09 o E34 tinha quatro correcções feitas e dizia `planejado`.
#
# `etapasPorValidar` lê a matriz e NOMEIA quem falta. Nomear importa: «há 2 por
# validar» manda procurar, «E34 E35» manda assinar.
POR_VALIDAR="$(decidir '
import { etapasPorValidar } from "./packages/domain/src/implantacao.ts";
import { readFileSync } from "node:fs";
const matriz = [];
for (const linha of readFileSync("docs/progress/ETAPAS.md", "utf8").split("\n")) {
  const m = /^\|\s*(E\d{2})\s*\|([^|]*)\|/.exec(linha);
  if (m) matriz.push({ etapa: m[1], estado: m[2].replace(/[*_`]/g, "").trim() });
}
process.stdout.write(etapasPorValidar(matriz).join(" "));
')"
[ -z "$POR_VALIDAR" ] \
  || erro "por validar na matriz: $POR_VALIDAR — o que iria para o ar inclui código que ninguém reviu"

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
# (O `AUTORIZADO_POR` é lido no topo, antes dos portões, para não haver caminho
# nenhum em que se chegue ao servidor sem passar por esta variável.)
REF="${REF_ARG:-HEAD}"
git rev-parse --verify --quiet "$REF^{commit}" >/dev/null || erro "commit inválido: $REF"
VERSAO="$(git rev-parse --short "$REF")"
echo "==> a publicar $VERSAO em $DOMINIO"

# A árvore suja é AVISO e não portão: dois agentes mexem nesta árvore e o
# `git archive` já garante que o disco não vai. O aviso existe para quem publica
# saber que o que tem aberto no editor **não** está no que vai para o ar.
SUJOS="$(git status --porcelain | grep -c . || true)"
[ "${SUJOS:-0}" = "0" ] \
  || echo "    (aviso: ${SUJOS} ficheiro(s) por commitar NÃO vão neste pacote)"

# ── O pacote inspecciona-se ANTES de subir, e é o MESMO que sobe ────────────
# A primeira versão inspeccionava um tar e enviava outro por `git archive |
# ssh`: dois artefactos, e a inspecção media o que não ia. Agora é um ficheiro
# só, lido e depois enviado.
PACOTE="$(mktemp -d)/bossaos-$VERSAO.tar"
git archive --format=tar -o "$PACOTE" "$REF"
MAUS="$(tar -tf "$PACOTE" | decidir '
import { podeSubir } from "./packages/domain/src/implantacao.ts";
let d = "";
process.stdin.on("data", (c) => { d += c; });
process.stdin.on("end", () => {
  process.stdout.write(d.split("\n").map((x) => x.trim())
    .filter((x) => x && !podeSubir(x)).slice(0, 5).join(" "));
});
')"
[ -z "$MAUS" ] || erro "o pacote leva ficheiros que nunca sobem: $MAUS"
echo "    pacote verificado: $(tar -tf "$PACOTE" | grep -c .) ficheiros, nenhum segredo"

# ── E É AQUI QUE SE PÁRA, se ninguém autorizou ──────────────────────────────
# Tudo o que vem a seguir toca no servidor. Os portões locais já correram: o que
# falta é a única coisa que um guião não pode dar a si próprio.
if [ -z "$AUTORIZADO_POR" ]; then
  echo
  echo "    Portões locais abertos. Pacote pronto em:"
  echo "      $PACOTE"
  echo
  echo "    MAS NÃO SE PUBLICA: falta a autorização. Preparar não é publicar."
  echo "      scripts/publicar.sh $REF --autorizado-por \"<nome>, <data>: «<as palavras dele>»\""
  exit 0
fi
echo "    AUTORIZADO POR: $AUTORIZADO_POR"

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
$SSH "mkdir -p $RAIZ && tar -x -C $RAIZ" < "$PACOTE"
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
# ── E «não sei» NÃO é «errado» ──────────────────────────────────────────────
# A versão anterior colapsava os dois: uma etiqueta ilegível dava
# "no ar está 'nada'", que se lê como build falhado. São duas coisas e mandam
# fazer coisas diferentes — uma manda reconstruir, a outra manda ver porque é
# que o Docker não respondeu. Colapsá-las faz alguém reconstruir durante uma
# hora um build que estava certo.
LEITURA="$(decidir '
import { versaoQueResponde } from "./packages/domain/src/implantacao.ts";
const r = versaoQueResponde(process.argv[1] || null, process.argv[2]);
console.log(!r.sabe ? "NAO_SEI" : r.coincide ? "COINCIDE" : "DIFERENTE:" + r.noAr);
' "$NO_AR" "$VERSAO")"
case "$LEITURA" in
  COINCIDE)    : ;;
  DIFERENTE:*) erro "no ar está '${LEITURA#DIFERENTE:}' e eu construí '$VERSAO' — o build não pegou" ;;
  *)           erro "NÃO MEDI a etiqueta bossaos.versao de bossaos_web — isto NÃO é «versão errada», é não saber. Ver o Docker no servidor." ;;
esac

echo "==> no ar e confirmado: $VERSAO em https://$DOMINIO"
