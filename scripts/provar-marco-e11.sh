#!/usr/bin/env bash
#
# A segunda passagem do marco E11, executável.
#
# Escrita a 04/09 com as seis correcções ainda abertas, e é de propósito: uma
# reaprovação decidida depois de ver o trabalho é uma reaprovação que se molda ao
# que chegou. O parecer disse «só aceito o marco após rechecagem das falhas» —
# isto é essa rechecagem, e não a minha impressão dela.
#
# Não substitui o `provar-tudo.sh`. Corre o subconjunto que responde às SEIS
# falhas do parecer, uma a uma e pelo nome, para a resposta ser «qual» e não «se».
set -uo pipefail
cd "$(dirname "$0")/.."

# O ambiente carrega-se aqui, como nos outros 77 guiões `provar-*`. Sem isto o
# guião só passa numa shell que por acaso já tenha o `.env` exportado, e numa
# shell limpa fica vermelho pelo motivo errado — que é precisamente o defeito que
# um controlo negativo existe para não ter.
if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

falhas=0
pendentes=0
titulo() { echo; echo "── $1"; }
ok()   { echo "  ok       $1"; }
erro() { echo "  FALHA    $1"; falhas=$((falhas + 1)); }

# ── Um plante tem de VERIFICAR-SE ────────────────────────────────────────────
#
# Se a âncora já não existe, o `assert` do python dispara, o guião segue, e o
# `exigir_vermelho` corre contra um produto INTACTO: o produto passa, e o guião
# conclui que a asserção é vazia. É uma acusação falsa — e cinco das dez falhas
# do corredor de 06/09 eram exactamente isso.
#
# Aqui o código de saída do plante é lido. Se ele não pegou, a falha é do GUIÃO
# e diz-se assim, em vez de se atribuir ao produto.
plantar() {
  if ! python3 -; then
    vermelho "o plante NÃO APLICOU — a âncora mudou; isto não mediu nada"
    return 1
  fi
}
pend() { echo "  PENDENTE $1"; pendentes=$((pendentes + 1)); }

correr() { # $1 = descrição, $2… = comando
  local desc="$1"; shift
  if "$@" >/tmp/marco-e11.log 2>&1; then ok "$desc"; else
    erro "$desc"; tail -4 /tmp/marco-e11.log | sed 's/^/             /'
  fi
}

titulo "FALHA 1 — as telas até ao marco medidas em móvel"
correr "a dívida declarada bate com a realidade" bash scripts/validar-movel.sh
correr "quem alega móvel medido aparece numa inspecção" bash scripts/validar-movel-real.sh
# E a contagem, que é o que a falha 1 dizia: 66 de 112 por medir.
contagem=$(python3 - <<'PY'
import csv, re
PROVA = re.compile(r'm[oó]vel\s+medido', re.I)
ate11 = {f'E{n:02d}' for n in range(1, 12)}
linhas = [l for l in csv.DictReader(open('docs/progress/coverage.csv', encoding='utf-8-sig'))
          if (l['etapa_principal'] or '').strip() in ate11]
val = [l for l in linhas if (l['status'] or '').strip() == 'validado']
sem = [l['id'] for l in val if not PROVA.search(l['evidencia'] or '')]
print(len(linhas), len(val), len(sem))
PY
)
read -r n_ids n_val n_sem <<<"$contagem"
if [ "${n_sem:-1}" -eq 0 ] && [ "${n_val:-0}" -eq "${n_ids:-0}" ]; then
  ok "as $n_ids telas até ao marco estão validadas E medidas em móvel"
else
  erro "$n_val de $n_ids validadas, e $n_sem sem prova de móvel — a falha 1 continua aberta"
fi

titulo "FALHA 2 — o acesso cruzado negado NO PRODUTO"
# Um recurso ocupado nao e uma prova reprovada.
#
# A primeira versao disto marcou FALHA quando o arnes nao arrancou porque a porta
# 3010 estava tomada por quem estava a medir ao lado. Isso e NAO MEDI, e chamar-lhe
# falha e a mesma confusao que este marco existe para apanhar - com o agravante de
# ser eu a comete-la no instrumento que julga os outros.
if lsof -nP -tiTCP:3010 -sTCP:LISTEN >/dev/null 2>&1; then
  pend "a porta 3010 esta ocupada — nao corri a prova, e isso nao e o mesmo que ela falhar"
else
  correr "a recusa vê-se no ecrã, nos dois sentidos e a 360 px" \
    npx playwright test inspeccao/isolamento.spec.ts
fi

titulo "FALHA 3 — nenhuma acção decorativa"
correr "nenhum botão promete e não faz" bash scripts/validar-accoes.sh

titulo "FALHA 4 — a jornada percorre-se"
saida_j=$(bash scripts/validar-jornada.sh 2>&1)
if grep -q "PENDENTE" <<<"$saida_j"; then
  pend "não há prova de jornada — a falha 4 continua aberta"
elif grep -q "0 falhas" <<<"$saida_j"; then
  ok "a jornada existe e não semeia estado a meio"
else
  erro "a prova de jornada não passa:"; tail -4 <<<"$saida_j" | sed 's/^/             /'
fi

titulo "FALHA 5 — a identidade separada, e a tela de equipa a renderizar"
correr "o runtime vê zero utilizadores e a migração vê alguns" \
  bash scripts/provar-separacao-de-credenciais.sh
estado_telas=$(python3 - <<'PY'
import csv
alvo = {'ORG-007', 'ORG-008', 'STATE-014'}
por = {l['id'].strip(): (l['status'] or '').strip()
       for l in csv.DictReader(open('docs/progress/coverage.csv', encoding='utf-8-sig'))}
maus = [i for i in sorted(alvo) if por.get(i) != 'validado']
print(','.join(maus) if maus else 'todas')
PY
)
if [ "$estado_telas" = "todas" ]; then
  ok "ORG-007, ORG-008 e STATE-014 estão validadas"
else
  erro "ainda por validar: $estado_telas — a tela que devolvia 500 não fechou"
fi

titulo "FALHA 6 — o preço tem uma fonte só"
correr "nenhum preço escrito à mão, e a fonte em cêntimos inteiros" bash scripts/validar-precos.sh

echo
if [ "$falhas" -eq 0 ] && [ "$pendentes" -eq 0 ]; then
  echo "  As seis falhas do marco estão fechadas, medidas e não declaradas."
  echo "  A aprovação do marco é agora uma decisão sobre EVIDÊNCIA, não sobre impressão."
else
  echo "  Marco NÃO reaprovado: $falhas falha(s), $pendentes pendência(s)."
  echo "  Uma pendência não é uma falha — é uma medição que não aconteceu, e conta na mesma."
fi
exit "$falhas"
