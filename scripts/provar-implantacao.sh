#!/usr/bin/env bash
#
# PROVA DO E35 — cada portão a recusar, à VEZ.
#
# ── Porque é que quatro portões com um controlo só não são quatro portões ──
#
# Um controlo que viole tudo ao mesmo tempo e veja vermelho não sabe qual dos
# quatro acendeu. Se três estiverem partidos e um funcionar, ele dá verde na
# mesma. É a família do «verde sobre população zero»: a medição existe e não
# mede o que se pensa.
#
# Por isso: um cenário por portão, cada um a violar UM e a deixar os outros
# três em ordem — e **o cenário em que tudo está bem**, que tem de passar. Sem
# esse, «recusa sempre» passava os quatro.
#
# ── E corre numa cópia ISOLADA, não neste repositório ─────────────────────
#
# Os cenários precisam de sujar a árvore e de commitar um `.env`. Fazer isso
# aqui seria o controlo a partir a casa — e, pior, o resultado passaria a
# depender do estado do dia: hoje a matriz tem etapas por validar, em Outubro
# não terá, e o mesmo controlo daria respostas diferentes sem ninguém mexer
# nele. A cópia é um repositório de mentira, montado e destruído aqui.
set -uo pipefail
cd "$(dirname "$0")/.."
RAIZ="$PWD"

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas+1)); }
naomedi()  { printf '  \033[33mNÃO MEDI\033[0m %s\n' "$1"; }

# As decisões puras leem-se do domínio, como no `publicar.sh`: o que se prova
# aqui é a regra a correr sobre os dados verdadeiros, e não uma segunda cópia
# da regra escrita em `bash` — que era o defeito da versão anterior deste
# controlo, com as duas metades a nunca se tocarem.
decidir() { node --experimental-strip-types -e "$1" "${@:2}"; }

CAIXA="$(mktemp -d)"
trap 'rm -rf "$CAIXA"' EXIT INT TERM

# ── A casa de mentira ─────────────────────────────────────────────────────
#
# Um retrato em miniatura do projecto: a matriz, a cobertura, o medidor e o
# guião. Sem isto, os cenários teriam de sujar ESTA árvore e commitar um `.env`
# aqui — e o resultado passaria a depender do estado do dia.
montar_fixture() {
  local d="$1"
  rm -rf "$d"; mkdir -p "$d/scripts" "$d/packages/domain/src" "$d/docs/progress"
  cp "$RAIZ/scripts/publicar.sh" "$RAIZ/scripts/estado.sh" "$d/scripts/"
  cp "$RAIZ/packages/domain/src/implantacao.ts" "$d/packages/domain/src/"
  # O medidor recusa-se a medir populações pequenas («um leitor cego devolve
  # zero, e zero é indistinguível de nada feito»), por isso a miniatura tem de
  # ter tamanho a sério: 36 etapas e 400 telas.
  { echo '| Etapa | Status | Evidência |'; echo '| --- | --- | --- |'
    echo '| E00 | contrato | o contrato não se valida a si próprio |'
    for i in $(seq -w 1 35); do echo "| E$i | validado | prova local |"; done
  } > "$d/docs/progress/ETAPAS.md"
  { echo 'id,tela,status'
    for i in $(seq 1 400); do echo "T$i,tela $i,validado"; done
  } > "$d/docs/progress/coverage.csv"
  echo "conteudo do produto" > "$d/app.txt"
  git -C "$d" init -q
  git -C "$d" -c user.email=p@p -c user.name=p add -A
  git -C "$d" -c user.email=p@p -c user.name=p commit -qm "base"
}

# ── E as cores metem-se ENTRE a palavra e a frase ─────────────────────────
#
# O `erro()` escreve `ERRO: ...` sem cor, mas o resto do guião colore. Um
# `grep` sobre texto colorido mede a FORMATAÇÃO e não o comportamento: à
# primeira corrida deste controlo os quatro cenários deram FALHA com os quatro
# portões a funcionar.
sem_cores() { sed $'s/\033\\[[0-9;]*m//g'; }
correr() {
  local d="$1"; shift
  ( cd "$d" && bash scripts/publicar.sh "$@" 2>&1 ) | sem_cores
}

echo "═══ OS QUATRO PORTÕES, UM DE CADA VEZ ═══"
echo

# ═══════════════════════════════════════════════════════════════════════════
echo "CENÁRIO 0 · A SONDA QUE TEM DE PASSAR — está tudo em ordem"
# ═══════════════════════════════════════════════════════════════════════════
#
# Sem isto, um guião que dissesse «ERRO» a tudo passava os quatro cenários
# seguintes. É o par que os outros precisam para significar alguma coisa.
D="$CAIXA/ok"; montar_fixture "$D"
S="$(correr "$D")"
if printf '%s' "$S" | grep -q '^ERRO:'; then
  vermelho "com tudo em ordem, um portão fechou:"
  printf '%s\n' "$S" | grep '^ERRO:' | sed 's/^/           /'
elif printf '%s' "$S" | grep -q "MAS NÃO SE PUBLICA: falta a autorização"; then
  verde "os portões locais abrem, o pacote fica pronto, e PARA sem autorização"
  # E parar quer dizer parar ANTES do servidor. Se tivesse tocado no servidor,
  # o `ssh` teria falhado e o texto dizia outra coisa.
  printf '%s' "$S" | grep -q 'env.prod' \
    && vermelho "  chegou a falar com o servidor sem autorização" \
    || verde "  e parou ANTES de tocar no servidor"
else
  vermelho "com tudo em ordem, não chegou ao fim como devia"
fi
echo

# ═══════════════════════════════════════════════════════════════════════════
echo "CENÁRIO 1 · viola SÓ o portão da assinatura"
# ═══════════════════════════════════════════════════════════════════════════
D="$CAIXA/p1"; montar_fixture "$D"
sed -i.bak 's/^| E20 | validado |/| E20 | em execução |/' "$D/docs/progress/ETAPAS.md"
rm -f "$D/docs/progress/ETAPAS.md.bak"
git -C "$D" -c user.email=p@p -c user.name=p commit -qam "etapa por validar"
S="$(correr "$D")"
if printf '%s' "$S" | grep -q 'ERRO: por validar na matriz: E20'; then
  verde "recusa, e NOMEIA: E20 por validar"
elif printf '%s' "$S" | grep -q 'ERRO: há .* etapa'; then
  vermelho "recusou pela contagem e não nomeou a etapa"
else
  vermelho "não recusou uma etapa por validar"
fi
# ── E o AGUARDA sozinho deixava passar isto ──────────────────────────────
# «em execução» não é «implementado aguardando validação»: o contador do
# medidor dá zero e o portão antigo abria. É o caso real do E34 a 06/09.
AG="$( ( cd "$D" && bash scripts/estado.sh ) | tr ' ' '\n' | grep '^AGUARDA=' | cut -d= -f2 )"
[ "$AG" = "0" ] \
  && verde "  e o contador AGUARDA dizia $AG — sozinho, teria deixado passar" \
  || vermelho "  o cenário não isola o defeito: o AGUARDA já acusava ($AG)"
echo

# ═══════════════════════════════════════════════════════════════════════════
echo "CENÁRIO 2 · o portão do commit — publica-se o COMMIT, não a árvore"
# ═══════════════════════════════════════════════════════════════════════════
#
# ── E este NÃO é um portão que pára, de propósito ────────────────────────
#
# São dois agentes na mesma árvore, e exigir árvore limpa impedia publicar.
# A garantia não é a regra: é o `git archive`, onde o que sobe existe em git
# porque não há outra maneira de lá chegar. O que se mede é isso.
D="$CAIXA/p2"; montar_fixture "$D"
echo "experiencia a meio, por commitar" > "$D/rascunho.txt"
S="$(correr "$D")"
printf '%s' "$S" | grep -q 'aviso: 1 ficheiro(s) por commitar NÃO vão neste pacote' \
  && verde "avisa que 1 ficheiro por commitar não vai" \
  || vermelho "não avisou sobre a árvore suja"
git -C "$D" archive --format=tar -o "$CAIXA/p2.tar" HEAD
if tar -tf "$CAIXA/p2.tar" | grep -q 'rascunho.txt'; then
  vermelho "e o pacote LEVA o ficheiro por commitar"
else
  verde "e o pacote não o leva: $(tar -tf "$CAIXA/p2.tar" | grep -c .) ficheiros, nenhum é o rascunho"
fi
echo

# ═══════════════════════════════════════════════════════════════════════════
echo "CENÁRIO 3 · viola SÓ o portão dos segredos"
# ═══════════════════════════════════════════════════════════════════════════
#
# O `.env` não costuma estar em git — e é por isso que o portão VERIFICA em vez
# de assumir: basta alguém commitá-lo uma vez.
D="$CAIXA/p3"; montar_fixture "$D"
echo "DATABASE_URL=postgres://a:b@c/d" > "$D/.env"
mkdir -p "$D/apps/web/.next" && echo "{}" > "$D/apps/web/.next/build.json"
git -C "$D" -c user.email=p@p -c user.name=p add -Af
git -C "$D" -c user.email=p@p -c user.name=p commit -qm "segredo e build commitados"
S="$(correr "$D")"
if printf '%s' "$S" | grep -q 'ERRO: o pacote leva ficheiros que nunca sobem'; then
  verde "recusa: o pacote levava ficheiros que nunca sobem"
  printf '%s' "$S" | grep -q '\.env' && verde "  apanhou o .env" || vermelho "  NÃO apanhou o .env"
  # O `.next` está no MEIO do caminho. A primeira versão do `podeSubir`
  # comparava prefixos e deixava passar exactamente isto.
  printf '%s' "$S" | grep -q 'apps/web/.next' \
    && verde "  apanhou o .next no MEIO do caminho" \
    || vermelho "  NÃO apanhou apps/web/.next — a comparação voltou a ser por prefixo"
else
  vermelho "não recusou um pacote com .env lá dentro"
fi
echo

# ═══════════════════════════════════════════════════════════════════════════
echo "CENÁRIO 4 · viola SÓ o portão da versão"
# ═══════════════════════════════════════════════════════════════════════════
#
# ── O que este cenário prova, e o que NÃO prova ──────────────────────────
#
# Prova a REACÇÃO do guião à etiqueta e que ela chega mesmo à decisão: etiqueta
# de outro commit pára, etiqueta ilegível diz NÃO MEDI. Fá-lo com um `ssh` de
# mentira, porque o portão 4 só corre depois de autorizar e publicar.
#
# NÃO prova publicar. Não há servidor de piloto e nunca se leu uma imagem a
# sério — está declarado na `pilot.md` como pendência, e um controlo com um
# duplo não vira uma publicação medida.
D="$CAIXA/p4"; montar_fixture "$D"
mkdir -p "$CAIXA/bin"
fazer_ssh_de_mentira() { # $1 = o que o `docker inspect` responde
  cat > "$CAIXA/bin/ssh" <<STUB
#!/usr/bin/env bash
# ssh de mentira: responde ao que o portão 4 pergunta e cala o resto.
COMANDO="\${@: -1}"
case "\$COMANDO" in
  *"docker inspect"*) echo "$1" ;;
  *"api/health"*)     echo "vivo" ;;
  *)                  exit 0 ;;
esac
STUB
  chmod +x "$CAIXA/bin/ssh"
}
AUT='--autorizado-por'
fazer_ssh_de_mentira "0000000"
S="$(cd "$D" && PATH="$CAIXA/bin:$PATH" bash scripts/publicar.sh "$AUT" "controlo" 2>&1 | sem_cores)"
printf '%s' "$S" | grep -q "ERRO: no ar está '0000000'" \
  && verde "recusa: a imagem no ar é de outro commit — o build não pegou" \
  || vermelho "não recusou uma imagem com a etiqueta de outro commit"

fazer_ssh_de_mentira ""
S="$(cd "$D" && PATH="$CAIXA/bin:$PATH" bash scripts/publicar.sh "$AUT" "controlo" 2>&1 | sem_cores)"
if printf '%s' "$S" | grep -q 'NÃO MEDI a etiqueta'; then
  verde "e etiqueta ilegível dá NÃO MEDI — que manda ver o Docker, não reconstruir"
  printf '%s' "$S" | grep -q "no ar está 'nada'" \
    && vermelho "  mas ainda diz «nada» — colapsou «não sei» com «errada»" \
    || verde "  e não a chama «versão errada»"
else
  vermelho "etiqueta ilegível não deu NÃO MEDI"
fi

# E a sonda que tem de passar TAMBÉM aqui: com a etiqueta certa, publica.
fazer_ssh_de_mentira "$(git -C "$D" rev-parse --short HEAD)"
S="$(cd "$D" && PATH="$CAIXA/bin:$PATH" bash scripts/publicar.sh "$AUT" "controlo" 2>&1 | sem_cores)"
printf '%s' "$S" | grep -q 'no ar e confirmado' \
  && verde "e com a etiqueta certa chega ao fim — sem isto, «recusa sempre» passava" \
  || vermelho "com a etiqueta certa não chegou ao fim"
naomedi "ler uma imagem a sério: não há servidor de piloto (pendência na pilot.md)"
echo

# ═══════════════════════════════════════════════════════════════════════════
echo "═══ O RESTO DA RÉGUA ═══"
echo
echo "CONTROLO 5 · um runbook que declare RPO sem ensaio anexo acende"
# ═══════════════════════════════════════════════════════════════════════════
#
# O número dito ao cliente sem ensaio é inventado, e ele decide negócio com ele.
rpo_declarado() {
  # Um RPO com número ao lado. `RPO: 15 min` acende; «RPO» a explicar o que é,
  # não. Lê-se o ficheiro sem os avisos de que ele próprio é **não medido**.
  grep -nE 'RP[OT][^|]{0,30}[0-9]+ *(min|h|hora|segundo|s\b)' "$1" 2>/dev/null \
    | grep -v 'não medido' | grep -v 'NÃO' || true
}
ACHADOS=""
for f in docs/runbooks/*.md docs/releases/*.md; do
  A="$(rpo_declarado "$f")"; [ -n "$A" ] && ACHADOS="$ACHADOS$f: $A"$'\n'
done
if [ -n "$ACHADOS" ]; then
  if grep -q 'Ensaio de restauração | \*\*feito\*\*' docs/releases/pilot.md; then
    verde "há RPO declarado e há ensaio anexo com data"
  else
    vermelho "RPO declarado sem ensaio anexo:"; printf '%s' "$ACHADOS" | sed 's/^/           /'
  fi
else
  verde "nenhum runbook promete RPO — e o ensaio existe na pilot.md"
fi
# E O CONTROLO NEGATIVO: um runbook a prometer tem de ser apanhado.
CTRL="$CAIXA/runbook-mentiroso.md"
echo "Garantimos RPO de 15 min e RTO de 1 h." > "$CTRL"
if [ -n "$(rpo_declarado "$CTRL")" ]; then
  verde "  e a sonda apanha um runbook que promete RPO de 15 min"
else
  vermelho "  a sonda NÃO apanha «RPO de 15 min» — não mede nada"
fi
echo

# ═══════════════════════════════════════════════════════════════════════════
echo "CONTROLO 6 · a importação a seco não escreve NADA"
# ═══════════════════════════════════════════════════════════════════════════
if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
contar() { psql -d "${1:-bossaos_dev}" -t -c \
  "SELECT (SELECT count(*) FROM products)+(SELECT count(*) FROM orders)" 2>/dev/null | tr -d ' '; }
ANTES="$(contar)"
cat > "$CAIXA/carta.csv" <<'CSV'
nome,preco,idioma,alergenios
Café con leche,1.50,es-ES,leite
Pan con tomate,2.50,es-ES,
,3.00,es-ES,gluten
CSV
# ── E corre com a ligação ENVENENADA ─────────────────────────────────────
#
# Contar linhas antes e depois prova que não escreveu **nesta** base. Apontar o
# `DATABASE_URL` para o nada prova mais: se tentasse ligar-se, rebentava. As duas
# medem coisas diferentes e por isso estão as duas aqui.
SECO="$(DATABASE_URL='postgres://ninguem:nada@127.0.0.1:1/nao_existe' \
        bash scripts/importar-a-seco.sh "$CAIXA/carta.csv" 2>&1)"
DEPOIS="$(contar)"
if [ -n "$ANTES" ] && [ "$ANTES" = "$DEPOIS" ]; then
  verde "a base não mexeu: $ANTES linhas antes, $DEPOIS depois"
elif [ -z "$ANTES" ]; then
  naomedi "não consegui contar linhas na base — a contagem antes/depois não foi feita"
else
  vermelho "a base MEXEU: $ANTES antes, $DEPOIS depois — «a seco» escreveu"
fi
printf '%s' "$SECO" | grep -q 'linhas lidas: 3' \
  && verde "e leu o ficheiro na mesma, com a ligação apontada para o nada" \
  || vermelho "não leu o ficheiro com a ligação envenenada"
printf '%s' "$SECO" | grep -q 'DESCONHECIDO, e não «não contém»' \
  && verde "o alergénio vazio sai como DESCONHECIDO, e nunca como «não contém»" \
  || vermelho "o alergénio vazio não avisou"
echo

# ═══════════════════════════════════════════════════════════════════════════
echo "CONTROLO 7 · a pilot.md distingue TRÊS estados e não tem célula vazia"
# ═══════════════════════════════════════════════════════════════════════════
#
# Uma linha vazia lê-se como uma linha aprovada, e as duas custam a mesma tinta.
celulas_vazias() {
  awk -F'|' '
    /^\|/ {
      # A linha de separação (|---|---|) não é dados.
      if ($0 ~ /^\|[ :-]*\|[ :-]*\|/ && $0 !~ /[A-Za-z0-9]/) next
      for (i = 2; i < NF; i++) { gsub(/^[ \t]+|[ \t]+$/, "", $i); if ($i == "") { print FILENAME": "NR; next } }
    }' "$1"
}
V="$(celulas_vazias docs/releases/pilot.md)"
[ -z "$V" ] && verde "nenhuma célula vazia na pilot.md" \
  || { vermelho "células vazias na pilot.md:"; printf '%s\n' "$V" | sed 's/^/           /'; }
for e in 'feito' 'pendente' 'não medido'; do
  grep -qi -- "$e" docs/releases/pilot.md && verde "usa o estado «${e}»" \
    || vermelho "a pilot.md não usa «${e}» — voltou a ter duas colunas"
done
# E O CONTROLO NEGATIVO: uma tabela com um buraco tem de ser apanhada.
printf '| a | b |\n|---|---|\n| cheio | |\n' > "$CAIXA/tabela-com-buraco.md"
[ -n "$(celulas_vazias "$CAIXA/tabela-com-buraco.md")" ] \
  && verde "  e a sonda apanha uma tabela com um buraco" \
  || vermelho "  a sonda NÃO apanha uma célula vazia — não mede nada"
echo

# ═══════════════════════════════════════════════════════════════════════════
echo "CONTROLO 8 · os TRÊS degraus verdadeiros passam pela regra"
# ═══════════════════════════════════════════════════════════════════════════
#
# ── A retenção do sénior, e porque é que a versão anterior não media nada ──
#
# Este controlo tinha duas metades que nunca se tocavam: contava `## Degrau `
# contra `**Plano de saída` no documento, e aplicava o `degrauPodeSubir` a
# objectos INVENTADOS (`{nome:"x", saida:null}`). A regra estava certa e nunca
# via um degrau verdadeiro.
#
# Ele mediu o buraco em vez de o supor: esvaziou o plano de saída do último
# degrau **deixando o cabeçalho intacto**, e a contagem respondeu
# `degraus=3 saidas=3`, verde, com o plano vazio. Contar títulos mede que
# alguém escreveu o título.
#
# Agora o documento passa pelo `lerDegraus` e cada degrau pelo `degrauPodeSubir`.
DOC=docs/releases/entrada-progressiva.md

# Devolve, por degrau: `ok<TAB>nome` ou `MAU<TAB>nome<TAB>razão`, e `N<TAB>quantos`.
julgar_degraus() {
  decidir '
import { lerDegraus, degrauPodeSubir } from "./packages/domain/src/implantacao.ts";
import { readFileSync } from "node:fs";
const degraus = lerDegraus(readFileSync(process.argv[1], "utf8"));
console.log("N\t" + degraus.length);
for (const d of degraus) {
  const v = degrauPodeSubir(d);
  console.log(v.ok ? "ok\t" + d.nome : "MAU\t" + d.nome + "\t" + v.razao);
}
' "$1"
}

JULGAMENTO="$(julgar_degraus "$DOC")"
QUANTOS="$(printf '%s\n' "$JULGAMENTO" | awk -F'\t' '$1=="N"{print $2}')"

# ── A população primeiro ─────────────────────────────────────────────────
# Um leitor partido devolve zero degraus, e «nenhum degrau falhou» sobre zero
# degraus é verde sobre população zero.
if [ "${QUANTOS:-0}" -eq 3 ]; then
  verde "li 3 degraus do documento"
else
  vermelho "li ${QUANTOS:-0} degraus e o documento tem 3 — o leitor está cego"
fi

MAUS="$(printf '%s\n' "$JULGAMENTO" | awk -F'\t' '$1=="MAU"{print $2" ("$3")"}')"
if [ -z "$MAUS" ] && [ "${QUANTOS:-0}" -eq 3 ]; then
  verde "e os três passam pelo degrauPodeSubir: critérios E plano de saída"
elif [ -n "$MAUS" ]; then
  vermelho "degrau(s) sem poder subir:"; printf '%s\n' "$MAUS" | sed 's/^/           /'
fi

# ── E O CONTROLO NEGATIVO É O FICHEIRO ADULTERADO DELE ───────────────────
# Cabeçalho do plano intacto, plano vazio. A contagem antiga dava verde aqui.
ADULTERADO="$CAIXA/entrada-sem-saida.md"
python3 -c '
import re, sys
texto = open(sys.argv[1], encoding="utf-8").read()
i = texto.rindex("**Plano de saída")
rotulo = texto[i:texto.index("\n", i)]
corte = re.sub(r"\s*—.*$", "", rotulo).rstrip(":")
open(sys.argv[2], "w", encoding="utf-8").write(texto[:i] + corte + "\n")
' "$DOC" "$ADULTERADO"

CONTROLO="$(julgar_degraus "$ADULTERADO")"
CQ="$(printf '%s\n' "$CONTROLO" | awk -F'\t' '$1=="N"{print $2}')"
CMAUS="$(printf '%s\n' "$CONTROLO" | awk -F'\t' '$1=="MAU"{print $2}')"
if [ "${CQ:-0}" -ne 3 ]; then
  vermelho "  controlo inválido: li ${CQ:-0} degraus no ficheiro adulterado, e têm de ser 3"
elif printf '%s' "$CMAUS" | grep -q 'Degrau 3'; then
  verde "  controlo: plano do Degrau 3 esvaziado com o cabeçalho intacto, e RECUSA"
  verde "  (a contagem antiga respondia degraus=3 saidas=3 e dava verde aqui)"
else
  vermelho "  CONTROLO NEGATIVO FALHOU: o plano vazio passou"
fi
# E o outro lado: não pode acusar os degraus que estão bem.
OUTROS="$(printf '%s\n' "$CMAUS" | grep -c 'Degrau [12]' || true)"
[ "${OUTROS:-0}" -eq 0 ] \
  && verde "  e não acusa os degraus 1 e 2, que continuam com plano" \
  || vermelho "  acusou degraus intactos — a leitura reprova tudo"
echo

# ═══════════════════════════════════════════════════════════════════════════
echo "═══════════════════════════════════════════════════════════════════════"
if [ "$falhas" -eq 0 ]; then
  echo "  0 falhas."
else
  echo "  $falhas falha(s)."
fi
exit $(( falhas > 0 ? 1 : 0 ))
