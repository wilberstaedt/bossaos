#!/usr/bin/env bash
# ── O `next-env.d.ts` é VERSIONADO e o build reescreve-o ───────────────────
#
# Este ficheiro não corre sozinho: é lido (`.`) por quem constrói com um
# directório de build isolado.
#
# ── O defeito, provado e não suposto ──────────────────────────────────────
#
# `apps/web/next-env.d.ts` contém `import "./.next/types/routes.d.ts"`, e esse
# caminho **segue o directório de build**. Um arranque com `NEXT_DIST_DIR`
# reescreve-o: medido a 07/09 com `.next-prova`, os imports mudaram em nove
# segundos. O ficheiro está no repositório — o próprio Next manda comitá-lo.
#
# Seis guiões da casa usam `NEXT_DIST_DIR` e nenhum o repunha. Quem corresse um
# deles e comitasse a seguir levava para o repositório um `next-env.d.ts` a
# apontar para um directório que não existe em mais lado nenhum, **partindo o
# typecheck de quem clonasse**.
#
# ── Latente, e é isso que o torna perigoso ────────────────────────────────
#
# Verificado no histórico: o ficheiro mudou **uma vez**, quando nasceu, e nenhum
# commit levou um caminho isolado. Nunca disparou — e não disparou por
# **vigilância**, não por mecanismo: foi apanhado a olhar para a árvore suja
# antes de comitar. Uma defesa que depende de alguém reparar é uma defesa que
# funciona até ao dia em que a pessoa tem pressa.
#
# ── Porquê duas funções e não um trap aqui dentro ─────────────────────────
#
# Um `trap … EXIT` posto por este ficheiro **substituiria** o trap de quem o
# lê — o `provar-mestres.sh` já tem um, que mata o servidor. Um trap silencioso
# a apagar outro seria uma cura pior do que a doença. Por isso a mecânica vive
# aqui e a decisão de quando repor fica com cada guião, à vista.
# ── Caminho ABSOLUTO, e a razão foi medida ────────────────────────────────
#
# Isto foi `apps/web/next-env.d.ts`, relativo, e funcionava porque nenhum dos
# seis guiões muda de directório depois de armar o trap — verifiquei os seis.
# Só que essa é uma condição que vive na cabeça de quem escrever o sétimo.
#
# Medido a 07/09 com um arnês que fazia `cd apps/web` antes do build: o trap
# disparou, o `cp` falhou com «No such file or directory», e **o ficheiro ficou
# sujo à mesma**. O trap correu e não repôs nada. Resolver a partir da posição
# deste ficheiro, e não do directório de quem o lê, fecha isso de vez.
# Guarda: `BASH_SOURCE` é do bash. Lido por zsh devolvia
# `/Users/mw/Developer/projects/apps/web/next-env.d.ts` — **errado e calado**,
# medido a 07/09. Um caminho errado em silêncio é o defeito do dia inteiro; mais
# vale recusar-se a arrancar. Os seis guiões são bash, portanto isto nunca
# dispara para eles: dispara para o sétimo, que é quem precisa de ser avisado.
if [ -z "${BASH_SOURCE[0]:-}" ]; then
  echo "next-env-intacto.sh: tem de ser lido por bash (BASH_SOURCE vazio) — abortado" >&2
  return 1 2>/dev/null || exit 1
fi
NEXT_ENV_FICHEIRO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/apps/web/next-env.d.ts"
# ── Ler o ajudante DUAS vezes não pode apagar o que a primeira guardou ────
#
# Isto era `NEXT_ENV_COPIA=""`, e a segunda leitura punha-o a vazio. Medido em
# bash: depois de `guardar` e de um segundo `.` do ficheiro, a variável vinha
# vazia, o `repor` devolvia **0 sem repor nada** e o temporário ficava órfão.
#
# O sintoma que se vê é o ficheiro esquecido; o que custa é o outro — a
# protecção fica **desarmada em silêncio**, que é a terceira porta para a mesma
# doença deste ficheiro. As outras duas já estão fechadas acima.
#
# `:-` em vez de vazio: quem lê primeiro define, quem lê a seguir não estraga.
NEXT_ENV_COPIA="${NEXT_ENV_COPIA:-}"

# ── Ausente é caminho errado, nunca «ainda não há» ────────────────────────
#
# Isto era `[ -f … ] || return 0`, e o JR apanhou-o na revisão de a2da008: com o
# ficheiro ausente a cópia ficava vazia, o `repor` desistia também, e a protecção
# ficava **armada a não fazer nada, sem uma palavra** — a forma exacta que a
# guarda do `BASH_SOURCE` existe para impedir. Eu tinha fechado uma porta para o
# caminho errado calado e deixado a outra aberta.
#
# O `next-env.d.ts` é versionado e existe em qualquer checkout. «Ausente» não
# significa «ainda não foi gerado»: significa sempre que o caminho está errado.
#
# E é `exit`, não `return`: os seis correm com `set -uo pipefail` e **sem `-e`**.
# Um `return 1` seria ruidoso e deixava a protecção desligada à mesma, que é
# trocar um defeito calado por um defeito com legenda.
guardar_next_env() {
  if [ ! -f "$NEXT_ENV_FICHEIRO" ]; then
    echo "next-env-intacto.sh: nao encontrei $NEXT_ENV_FICHEIRO — o caminho esta errado, abortado" >&2
    exit 1
  fi
  # Uma cópia anterior desta corrida sai antes de nascer a nova, senão um
  # segundo `guardar` deixa a primeira órfã — medido: os temporários subiam de
  # oito para dez em duas chamadas.
  [ -n "$NEXT_ENV_COPIA" ] && rm -f "$NEXT_ENV_COPIA"
  # `mktemp -t next-env` é a forma ANTIGA: no BSD o argumento é um prefixo, no
  # GNU é um template e sem `XXXXXX` recusa-se. Um template completo com o
  # caminho é aceite pelos dois. O `%/` tira a barra final que o `TMPDIR` do
  # macOS já traz, para não sair um caminho com `//` no meio.
  NEXT_ENV_TMP="${TMPDIR:-/tmp}"
  NEXT_ENV_COPIA="$(mktemp "${NEXT_ENV_TMP%/}/next-env.XXXXXX")"
  cp "$NEXT_ENV_FICHEIRO" "$NEXT_ENV_COPIA"
}

# Repõe o que estava ANTES desta corrida — e não o que está no `git`. Se quem
# corre tinha alterações locais legítimas, elas sobrevivem: o trabalho desta
# função é desfazer o que o build fez, não arrumar a árvore de outra pessoa.
repor_next_env() {
  [ -n "$NEXT_ENV_COPIA" ] && [ -f "$NEXT_ENV_COPIA" ] || return 0
  # A mesma porta, do outro lado: um `cp` que falha aqui deixava o ficheiro sujo
  # e o trap dava-se por cumprido. Corre dentro de um trap, portanto não pode
  # abortar — mas tem de DIZER, senão volta a ser a protecção calada.
  if ! cmp -s "$NEXT_ENV_COPIA" "$NEXT_ENV_FICHEIRO"; then
    cp "$NEXT_ENV_COPIA" "$NEXT_ENV_FICHEIRO" \
      || echo "next-env-intacto.sh: NAO consegui repor $NEXT_ENV_FICHEIRO — ficou sujo" >&2
  fi
  rm -f "$NEXT_ENV_COPIA"
  NEXT_ENV_COPIA=""
}
