#!/usr/bin/env bash
# Nenhum segredo entra no repositorio.
#
# Existe por causa de um incidente real noutro produto meu: o WORKER_SECRET do
# Norte saia em texto limpo nos logs da API 36 vezes, e os logs nao rodavam. Duas
# falhas independentes na mesma linha, e ninguem deu por ela durante semanas
# porque nada estava a procurar.
#
# CT-04: "logs tecnicos minimizam dados de clientes e NAO CONTEM SEGREDOS".
# docs/architecture/operacao-e-recuperacao.md exige o controlo negativo que esta
# aqui dentro: uma varredura que nunca encontrou nada pode estar a olhar para o
# sitio errado, e nesse caso o verde dela nao vale nada.
set -uo pipefail
cd "$(dirname "$0")/.."

falhas=0
erro()   { echo "  FALHA $1"; falhas=$((falhas+1)); }
ok()     { echo "  ok    $1"; }

# Padroes de coisas que nunca podem estar versionadas. Cada um com nome, para a
# mensagem dizer O QUE encontrou e nao so "encontrei".
PADROES=(
  "chave privada:-----BEGIN [A-Z ]*PRIVATE KEY"
  "token do GitHub:gh[pousr]_[A-Za-z0-9]{30,}"
  "chave da AWS:AKIA[0-9A-Z]{16}"
  "chave da OpenAI:sk-[A-Za-z0-9]{32,}"
  "chave da Stripe:[sr]k_live_[A-Za-z0-9]{16,}"
  # Segredo de nome generico com valor literal longo. Faltava, e foi encontrado a
  # 2026-09-03 a LER O REGISTO DA CI: o BETTER_AUTH_SECRET aparecia em claro no
  # ci.yml enquanto a DATABASE_URL vinha mascarada, e esta varredura dizia
  # "nenhum segredo na arvore". Eu so lhe tinha ensinado cinco formas de
  # fornecedor - e a forma mais comum num ficheiro de configuracao e esta.
  # Precisao MEDIDA a 2026-09-03, nao presumida: 11 sitios em codigo de produto
  # mencionam SECRET/TOKEN/KEY e nenhum tem valor literal - todos leem do ambiente
  # ou sao nomes de tipo. O padrao dispara so sobre literais, que e a forma de um
  # segredo escrito a mao. Um detector que grita por tudo acaba desligado.
  "segredo de nome generico:(SECRET|TOKEN|PASSWORD|PASSWD|API_?KEY)[\"']?[[:space:]]*[:=][[:space:]]*[\"']?[A-Za-z0-9_.@/+-]{16,}"
  "senha em ligacao:postgres(ql)?://[^:@/[:space:]]+:[^@/$$\{[:space:]]{8,}@"
)

# Valores literais que PODEM ficar, com o motivo escrito. Um segredo declarado e
# uma decisao; um segredo em silencio e um defeito. Mesma forma da lista de
# scripts/validar-testes.sh.
DECLARADOS="segredo-de-ci-descartavel-com-32-caracteres:valor da CI, descartavel e sem valor fora do runner - o nome di-lo"

declarado() { # $1 = linha; devolve 0 se a linha contem um valor declarado
  # Here-doc e nao cano: um `while` dentro de um cano corre numa SUBSHELL, e um
  # `exit 0` la dentro sai da subshell em vez de devolver da funcao - a primeira
  # versao disto devolvia sempre 1 e o filtro nunca filtrava nada. Apanhado a
  # 2026-09-03 por a varredura acusar um valor que estava na lista.
  local linha="$1" par valor
  while IFS= read -r par; do
    [ -z "$par" ] && continue
    valor="${par%%:*}"
    case "$linha" in *"$valor"*) return 0 ;; esac
  done <<FIMDECL
$DECLARADOS
FIMDECL
  return 1
}

# O .env.example e documentacao: valores descartaveis e comentados, e e suposto
# estar versionado. Tudo o resto e alvo.
#
# E os POR RASTREAR tambem, desde 04/09. Provei que o mesmo ficheiro com o mesmo
# segredo era invisivel por rastrear e apanhado depois de rastreado - e o risco
# real nao e o ficheiro estar solto, e o `git add .` que vem a seguir. Varrer so
# o que ja esta versionado avisa DEPOIS de o segredo entrar; varrer o que esta
# prestes a entrar avisa a tempo.
#
# --exclude-standard mantem os ignorados de fora, e isso e deliberado: um
# ficheiro que o .gitignore cobre nao pode ser adicionado por acidente, e varre-lo
# encheria isto de ruido de node_modules e artefactos de build.
# FUNCAO e nao variavel, para o controlo de alcance poder chama-la depois de
# criar a sonda. Escrita como variavel, o controlo tinha de reimplementar a lista
# a mao - e foi o que fiz primeiro: media a MINHA COPIA da logica em vez da que a
# guarda usa, por isso passava mesmo com o alcance estreitado de volta. Um
# controlo que reimplementa o que devia medir mede-se a si proprio.
alvos() {
  { git ls-files; git ls-files --others --exclude-standard; } \
    | grep -vE '^\.env\.example$|^pnpm-lock\.yaml$|^scripts/varrer-segredos\.sh$|\.png$' \
    | sort -u
}
ALVOS=$(alvos)

# Hospedeiros que nao sao um endpoint real: local, ou um nome sem ponto nenhum
# (docker, fixtures, exemplos). Uma ligacao a 127.0.0.1 com senha de dev nao e um
# segredo - e configuracao de desenvolvimento, e esta em dev-db.sh de proposito.
LOCAIS='@(127\.0\.0\.1|localhost|host|db|postgres|servidor)[:/]'

varrer() { # $1 = ficheiro unico; vazio = arvore versionada. Devolve nr de padroes achados.
  local achados=0 nome padrao casos
  for entrada in "${PADROES[@]}"; do
    nome="${entrada%%:*}"; padrao="${entrada#*:}"
    # -e e OBRIGATORIO: sem ele o grep le um padrao que comeca por '-' como opcao,
    # e o da chave privada NUNCA correu. Apanhado pelo controlo negativo em baixo,
    # a 2026-09-03, com a varredura a dizer 2 de 3.
    if [ -n "${1:-}" ]; then
      casos=$(grep -nIE -e "$padrao" "$1" 2>/dev/null | grep -vE "$LOCAIS" || true)
      [ -n "$casos" ] && { echo "$nome"; achados=$((achados+1)); }
    else
      casos=$(echo "$ALVOS" | xargs grep -nIE -e "$padrao" 2>/dev/null | grep -vE "$LOCAIS" || true)
      casos=$(printf '%s\n' "$casos" | while IFS= read -r l; do [ -n "$l" ] && ! declarado "$l" && printf '%s\n' "$l"; done)
      [ -n "$casos" ] && { erro "$nome: $(echo "$casos" | head -3 | tr '\n' ' ')"; achados=$((achados+1)); }
    fi
  done
  return $achados
}

echo "1. CONTROLO NEGATIVO — a varredura tem de conseguir encontrar"
postico=$(mktemp); trap 'rm -f "$postico"' EXIT
{
  echo "-----BEGIN RSA PRIVATE KEY-----"
  echo "AKIAIOSFODNN7EXAMPLE"
  # Hospedeiro COM ponto, de proposito: a primeira versao deste postico usava
  # "servidor", que esta na lista de hospedeiros locais que eu proprio escrevi -
  # ou seja, estava a testar contra a minha propria excepcao e a varredura levava
  # a culpa. Um controlo negativo mal construido acusa o instrumento certo.
  echo "postgresql://utilizador:senhamuitosecreta@base.exemplo-postico.net:5432/base"
} > "$postico"
encontrados=$(varrer "$postico" | wc -l | tr -d ' ')
if [ "$encontrados" -ge 3 ]; then
  ok "encontrou os 3 segredos posticos ($encontrados de 3)"
else
  erro "so encontrou $encontrados de 3 segredos posticos — a varredura esta cega"
fi

echo
echo "2. Quantos ficheiros e que ela olha"
n_alvos=$(echo "$ALVOS" | grep -c . || true)
if [ "${n_alvos:-0}" -lt 50 ]; then
  erro "so $n_alvos ficheiros na varredura — a lista esta vazia ou partida"
else
  ok "$n_alvos ficheiros versionados sob varredura"
fi

# ── controlo do ALCANCE, e nao so dos padroes ──────────────────────────────
# O controlo 1 prova que os PADROES encontram. Este prova que a varredura CHEGA
# aos ficheiros certos - que e outra propriedade e falhava sozinha ate 04/09: um
# ficheiro por rastrear com um segredo era invisivel, e so aparecia depois de
# `git add`. Ou seja, a varredura avisava DEPOIS de o segredo entrar.
#
# Corre separado do controlo 1 de proposito: se as duas sondas partilhassem a
# mesma passagem, a que falha mais cedo mascarava a outra e o controlo passava com
# metade da guarda partida. Ja me aconteceu hoje noutra guarda.
echo
echo "2b. CONTROLO — o alcance: por rastrear entra, ignorado nao"
SONDA_DIR="packages/db/src/__controlo_alcance"
mkdir -p "$SONDA_DIR"
printf "export const K = { API_KEY: 'sk_live_CONTROLO_0000000000' };\n" > "$SONDA_DIR/x.ts"
if alvos | grep -q "^$SONDA_DIR/x.ts$"; then
  ok "um ficheiro por rastrear entra na lista de alvos"
else
  erro "um ficheiro por rastrear NAO entra na lista - a varredura avisa tarde demais"
fi
rm -rf "$SONDA_DIR"
if alvos | grep -q '^node_modules/'; then
  erro "ficheiros ignorados entraram na lista - isto vai encher-se de ruido"
else
  ok "os ignorados ficam de fora, como devem"
fi

echo
echo "3. A arvore versionada E o que esta prestes a entrar"
varrer || true
[ "$falhas" -eq 0 ] && ok "nenhum segredo na arvore"

echo
[ "$falhas" -eq 0 ] && echo "  Sem segredos: 0 falhas." || echo "  $falhas FALHA(S)."
exit $falhas
