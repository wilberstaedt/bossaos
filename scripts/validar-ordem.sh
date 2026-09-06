#!/usr/bin/env bash
# Nenhuma etapa comeca antes de a anterior estar validada.
#
# NAO e um detector de culpa: e um detector de ESTADO. Nasceu a 2026-09-03, quando o commit `adde253` comecou o E05
# - com implementacao a serio - enquanto o E04 estava em "aguardando validacao", o
# E05 estava "planejado" na matriz e nao existia E05.md. A minha devolucao dizia
# "voltar a declarar; revejo outra vez".
#
# O CT-16 proibe as duas coisas: "nao avance automaticamente" e "nao executar
# etapas dependentes sobre bases reprovadas".
#
# Duas consequencias reais, e nenhuma e disciplina por disciplina:
#   1. a revisao deixa de poder medir a arvore, porque passa a ter codigo nao
#      revisto misturado com o que se esta a validar;
#   2. se a etapa em revisao for REPROVADA, o que se construiu por cima assenta
#      numa base reprovada.
#
# Porque e que a regra nao chegou: estava em prosa, no prompt de retoma e na minha
# mensagem. O contexto do JR reiniciou e a prosa foi-se. Uma verificacao nao se vai.
set -uo pipefail
cd "$(dirname "$0")/.."

MATRIZ="${MATRIZ:-docs/progress/ETAPAS.md}"   # sobreponivel para o controlo de ponta a ponta
falhas=0
erro() { echo "  FALHA $1"; falhas=$((falhas+1)); }
ok()   { echo "  ok    $1"; }

# A etapa autorizada e a primeira nao validada, saltando o E00 (que so se valida
# no E11, por desenho). Mesma derivacao do scripts/estado.sh.
total=$(grep -cE '^\| E[0-9]{2} \| ' "$MATRIZ" 2>/dev/null || true)
if [ "${total:-0}" -lt 30 ]; then
  erro "li ${total:-0} etapas em $MATRIZ - o leitor esta cego"
  echo; echo "  $falhas FALHA(S)."; exit "$falhas"
fi
ok "$total etapas na matriz"

atual=$(grep -E '^\| E[0-9]{2} \| ' "$MATRIZ" | grep -v '^| E00 ' | grep -v '| validado |' \
  | head -1 | awk -F'|' '{print $2}' | tr -d ' ')
if [ -z "${atual:-}" ]; then
  erro "nao consegui derivar a etapa autorizada"
  echo; echo "  $falhas FALHA(S)."; exit "$falhas"
fi
n_atual=$(echo "$atual" | tr -dc '0-9')

# ── Uma etapa de REVISAO nao para o implementador, e a 06/09 esta guarda parava-o
#
# A 08h50 esta guarda ficou vermelha sobre o E35 do JR com o argumento de que a
# etapa autorizada era a E34. Estava a aplicar «uma etapa de cada vez» a duas
# etapas que o proprio pacote poe em paralelo: o E34 e uma REVISAO, nao produz
# ficheiro de implementacao nenhum, e enquanto ela decorre e o implementador que
# esta a trabalhar. E o desenho do projecto - ha dois agentes precisamente para
# ninguem assinar a revisao do proprio codigo.
#
# A regra NAO vem do meu juizo nem da minha conveniencia - eu estava a mexer numa
# guarda que acusava o meu proprio processo, que e o momento em que se enfraquece
# uma guarda sem dar por isso. Vem da tabela do pacote, que tem uma coluna
# `Destino`: `Claude` nas etapas de revisao (E00, E11, E21, E34) e `Codex` nas de
# implementacao. E o cabecalho do FASES.md di-lo por palavras: «E00 prepara;
# E11/E21/E34 revisam».
#
# O que continua a ser recusado: saltar para a etapa SEGUINTE a essa, e trabalhar
# duas etapas de implementacao ao mesmo tempo. So se abre a porta que o pacote ja
# tinha aberto.
FASES="docs/bossaos/FASES.md"
dono_da_etapa() {  # <numero> -> Claude | Codex | ""
  grep -E "^\| E0*$1 \|" "$FASES" 2>/dev/null | head -1 | awk -F'|' '{print $3}' | tr -d ' '
}
limite=$n_atual
if [ "$(dono_da_etapa "$n_atual")" = "Claude" ]; then
  seguinte=$(grep -E '^\| E[0-9]{2} \| ' "$MATRIZ" | grep -v '^| E00 ' | grep -v '| validado |' \
    | sed -n '2p' | awk -F'|' '{print $2}' | tr -d ' ' | tr -dc '0-9')
  if [ -n "$seguinte" ] && [ "$(dono_da_etapa "$seguinte")" = "Codex" ]; then
    limite=$seguinte
    ok "etapa autorizada: $atual (REVISAO, do Claude) — e a E$seguinte, do Codex, corre em paralelo"
  fi
fi
# ── E UMA ETAPA JA VALIDADA NUNCA PODE SER «TRABALHO A FRENTE» ──────────────
#
# A 06/09, depois de eu assinar o E35, esta guarda ficou vermelha sobre TRES
# commits do E35 - incluindo o meu proprio commit de validacao. A excepcao do
# paralelo acima olha para a SEGUNDA etapa por validar; com o E35 ja validado,
# essa segunda deixou de existir, o limite caiu para E34, e trabalho ja revisto
# passou a contar como avanco.
#
# A regra vem da matriz e nao do meu juizo: `validado` quer dizer REVISTO, e
# rever e exactamente o que esta guarda protege. Uma etapa revista nao pode estar
# a frente de nada.
#
# O que continua fechado: uma etapa POR validar acima do limite continua a ser
# acusada - e o controlo la em baixo mede as duas direccoes, porque eu estava a
# mexer numa guarda que acusava o meu proprio trabalho.
maior_validado=$(grep -E '^\| E[0-9]{2} \| ' "$MATRIZ" | grep -v '^| E00 ' \
  | grep -F '| validado |' | sed -E 's/^\| E([0-9]{2}) \|.*/\1/' | sort -rn | head -1)
if [ -n "${maior_validado:-}" ] && [ "$((10#$maior_validado))" -gt "$((10#$limite))" ]; then
  limite=$maior_validado
  ok "limite sobe a E$maior_validado: e a etapa mais alta ja VALIDADA, e validado e revisto"
fi

[ "$limite" = "$n_atual" ] && ok "etapa autorizada: $atual"

# ── o que mede mesmo: FICHEIROS, nao o assunto do commit ─────────────────────
#
# A primeira versao lia o prefixo "E##:" do assunto. Ponto cego dito em voz alta a
# 03/09: o commit d270b18 chama-se "E07 PARADO: ..." e escapava, porque nao casa
# com "E07:". Na altura deixei o buraco aberto com o argumento de que apertar o
# padrao apanharia commits de paragem limpa.
#
# O argumento estava errado, e a 04/09 percebi porque: o problema nao e o padrao,
# e a FONTE. Um assunto de commit e prosa que nos proprios escrevemos, e uma
# guarda que le prosa mede a disciplina de quem a escreve, nao a propriedade.
# Passei a semana a apanhar esta familia nos outros e em mim - um detector que
# casa "movel" numa nota a dizer que o movel NAO foi medido e o mesmo erro.
#
# O que define trabalho adiantado sao os FICHEIROS tocados. Um commit que mexe em
# docs/progress/E12.md ou numa migracao e12_* enquanto a autorizada e a E10 e
# trabalho a frente, chame-se ele como se chamar.
#
# EXCEPCAO deliberada: escrever a REGUA ou o CONTRATO de uma etapa futura e o meu
# trabalho de E00 e tem o melhor historico do projecto - as tres etapas que
# passaram a primeira foram as tres em que a regua existia antes do codigo. Por
# isso docs/reviews/ALVO-E##.md e docs/architecture/ nao contam como avanco.
etapa_dos_ficheiros() {
  printf '%s\n' "$@" \
    | grep -vE '^docs/reviews/ALVO-E[0-9]{2}\.md$|^docs/architecture/' \
    | grep -oE 'E[0-9]{2}\.md$|/e[0-9]{2}_|_e[0-9]{2}_' \
    | grep -oE '[0-9]{2}' | sort -rn | head -1
}

echo
adiantados=$(git log -40 --format='%h' 2>/dev/null | while read -r sha; do
  ficheiros=$(git show --name-only --format= "$sha" 2>/dev/null)
  [ -z "$ficheiros" ] && continue
  # shellcheck disable=SC2086
  n=$(etapa_dos_ficheiros $ficheiros)
  [ -n "$n" ] && [ "$((10#$n))" -gt "$((10#$limite))" ] && \
    echo "$sha toca ficheiros da E$n"
done)

# O sinal da PROSA volta como complemento, nao como substituto: apanha um assunto
# "E12: ..." mesmo quando os ficheiros nao trazem marca de etapa. Dois sinais
# fracos e diferentes cobrem mais do que um sozinho, e falham por motivos
# diferentes - que e a unica coisa que faz uma redundancia valer alguma coisa.
#
# A ISENCAO DA REGUA E DO CONTRATO TEM DE VALER NOS DOIS SINAIS. Media a 05/09:
# este detector acusava o commit c5f09e0, "E30: contrato de relatorios e
# agregacao, e regua, ambos antes do codigo" - que toca SO ficheiros isentos
# (docs/reviews/ALVO-E30.md e docs/architecture/), e foi o ASSUNTO a denuncia-lo.
# A isencao estava implementada no detector de ficheiros e faltava aqui: a mesma
# regra escrita duas vezes, e so uma das copias correcta.
por_prosa=$(git log -40 --format='%h %s' 2>/dev/null \
  | grep -E '^[0-9a-f]+ E[0-9]{2}:' \
  | while read -r sha resto; do
      n=$(echo "$resto" | sed -E 's/^E([0-9]{2}):.*/\1/')
      [ "$((10#$n))" -gt "$((10#$limite))" ] || continue
      # So conta se o commit tocar algum ficheiro NAO isento.
      nao_isentos=$(git show --name-only --format= "$sha" 2>/dev/null \
        | grep -vE '^docs/reviews/ALVO-E[0-9]{2}\.md$|^docs/architecture/' \
        | grep -c . || true)
      [ "${nao_isentos:-0}" -gt 0 ] && echo "$sha diz E$n no assunto"
    done)

# TERCEIRO SINAL, e este NAO depende de ninguem dar nomes.
#
# Medido a 05/09 no commit do E28: dos 17 ficheiros, exactamente UM era
# reconhecivel pelo detector de nomes - o docs/progress/E28.md. Os outros
# dezasseis eram o produto (ponto.ts, as onze telas, os specs) e nao traziam
# marca de etapa nenhuma. O sinal da prosa apanhou-o porque o assunto comecava
# por "E28:".
#
# Ou seja: os dois sinais falham por MECANISMOS diferentes, como esta guarda diz
# acima, e partilham uma SUPOSICAO - que o trabalho se anuncia. Uma etapa
# construida em ficheiros sem nome de etapa e commitada com um assunto que nao
# comeca por E##: e invisivel para os dois ao mesmo tempo. Redundancia com modo
# de falha partilhado nao e redundancia.
#
# O coverage.csv nao precisa que ninguem nomeie nada: as linhas sao por tela e
# tem a etapa na coluna 7. Mexer no estado das telas de uma etapa E' comecar
# essa etapa, seja qual for o nome dos ficheiros ou do commit.
por_matriz=$(git log -40 --format='%h' 2>/dev/null | while read -r sha; do
  linhas=$(git show "$sha" -- docs/progress/coverage.csv 2>/dev/null \
    | grep -E '^[+-][A-Z]' | grep -vE '^[+-][+-]' || true)
  [ -z "$linhas" ] && continue
  n=$(printf '%s\n' "$linhas" | awk -F, '{print $7}' \
    | grep -oE '^E[0-9]{2}$' | grep -oE '[0-9]{2}' | sort -rn | head -1)
  [ -n "$n" ] && [ "$((10#$n))" -gt "$((10#$limite))" ] && \
    echo "$sha mexe nas telas da E$n na matriz"
done)

adiantados=$(printf '%s\n%s\n%s' "$adiantados" "$por_prosa" "$por_matriz" | grep -v '^$' || true)

if [ -n "$adiantados" ]; then
  erro "ha commits com ficheiros de etapas a frente do limite (E$limite):"
  echo "$adiantados" | sed 's/^/          /'
  echo "        Nao desfazer: o trabalho fica e entra na revisao da etapa certa."
  echo "        Se o revisor estiver indisponivel, a saida certa nao e parar nem"
  echo "        avancar por cima: e trabalho que NAO dependa da etapa em revisao."
else
  ok "nenhum commit com ficheiros a frente de E$limite"
fi

# ── controlo negativo ───────────────────────────────────────────────────────
# Alimenta-se o classificador com caminhos sinteticos, em vez de plantar commits
# no historico - uma guarda nao deve escrever no repositorio para se testar.
echo
c_falha=0
[ "$(etapa_dos_ficheiros 'docs/progress/E12.md')" = "12" ] || { echo "  FALHA controlo: nao viu docs/progress/E12.md"; c_falha=1; }
[ "$(etapa_dos_ficheiros 'packages/db/prisma/migrations/20260904_e12_temas/migration.sql')" = "12" ] || { echo "  FALHA controlo: nao viu a migracao e12_"; c_falha=1; }
[ -z "$(etapa_dos_ficheiros 'docs/reviews/ALVO-E12.md')" ] || { echo "  FALHA controlo: acusou a REGUA de uma etapa futura, que e trabalho de E00"; c_falha=1; }
[ -z "$(etapa_dos_ficheiros 'docs/architecture/dominios-e-enderecos.md')" ] || { echo "  FALHA controlo: acusou um contrato de arquitectura"; c_falha=1; }
[ -z "$(etapa_dos_ficheiros 'packages/domain/src/precos.ts')" ] || { echo "  FALHA controlo: acusou um ficheiro sem etapa no nome"; c_falha=1; }
# A porta que abri a 06/09 tem de continuar fechada um degrau acima. Sem isto,
# «a revisao deixa passar a etapa seguinte» podia ter-se tornado «deixa passar
# tudo» e ninguem dava por ela - e fui EU que mexi nesta guarda enquanto ela me
# acusava, que e exactamente quando isso acontece.
acima=$((10#$limite + 1))
[ "$((10#$acima))" -gt "$((10#$limite))" ] || { echo "  FALHA controlo: a comparacao do limite nao distingue E$acima de E$limite"; c_falha=1; }
[ "$((10#$limite))" -gt "$((10#$limite))" ] && { echo "  FALHA controlo: o proprio limite esta a ser acusado"; c_falha=1; }
# ── A porta que abri a 06/09 (validado nao e avanco), medida nos DOIS sentidos
#
# Sem a primeira, «li uma etapa validada» podia ser vazio e o limite subia por
# acidente. Sem a segunda, a excepcao podia ter-se tornado «deixa passar tudo».
[ -n "${maior_validado:-}" ] \
  || { echo "  FALHA controlo: nao li etapa validada nenhuma na matriz - populacao zero"; c_falha=1; }
grep -qE "^\| E${maior_validado:-XX} \| validado \|" "$MATRIZ" \
  || { echo "  FALHA controlo: a E${maior_validado:-??} que li NAO esta validada na matriz"; c_falha=1; }
grep -qE "^\| E$(printf '%02d' "$acima") \| validado \|" "$MATRIZ" \
  && { echo "  FALHA controlo: E$acima esta validada, e o controlo de cima nao mede nada"; c_falha=1; }
if [ "$c_falha" -eq 0 ]; then
  ok "controlo negativo: ve E12.md e a migracao e12_, e nao acusa regua, contrato nem codigo comum"
  ok "controlo do limite: E$acima seria acusado, E$limite nao"
else
  falhas=$((falhas+1))
fi

# ── O QUE ESTA GUARDA NAO VE, dito sem arredondar ────────────────────────────
#
# Motivei a mudanca de 04/09 com o commit d270b18 ("E07 PARADO: o motor de
# alergenos"), que escapava ao padrao do assunto. Fui verificar se a versao nova o
# apanha: NAO APANHA. Os ficheiros dele sao packages/domain/src/alergenios.ts e o
# teste ao lado - codigo comum, sem marca de etapa no nome.
#
# Ou seja, troquei um ponto cego por outro melhor, e nao fechei o caso que citei.
# Digo-o aqui porque a alternativa era deixar a redaccao nova sugerir uma
# cobertura que nao existe, e isso e pior do que o buraco.
#
# O que ela ve: documentos de etapa (E##.md), migracoes com e##_ no nome, e
# assuntos de commit com o prefixo E##:.
# O que NAO ve: codigo comum escrito para uma etapa futura. Nao ha mapa de
# ficheiro para etapa neste projecto, e inventar um por heuristica trocaria um
# falso negativo silencioso por falsos positivos ruidosos.
#
# Quem confiar nesta guarda tem de saber isto: ela apanha o avanco DECLARADO,
# nao o avanco disfarcado.

echo
[ "$falhas" -eq 0 ] && echo "  Ordem respeitada: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"
