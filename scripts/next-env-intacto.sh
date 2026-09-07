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
NEXT_ENV_FICHEIRO="apps/web/next-env.d.ts"
NEXT_ENV_COPIA=""

guardar_next_env() {
  [ -f "$NEXT_ENV_FICHEIRO" ] || return 0
  NEXT_ENV_COPIA="$(mktemp -t next-env)"
  cp "$NEXT_ENV_FICHEIRO" "$NEXT_ENV_COPIA"
}

# Repõe o que estava ANTES desta corrida — e não o que está no `git`. Se quem
# corre tinha alterações locais legítimas, elas sobrevivem: o trabalho desta
# função é desfazer o que o build fez, não arrumar a árvore de outra pessoa.
repor_next_env() {
  [ -n "$NEXT_ENV_COPIA" ] && [ -f "$NEXT_ENV_COPIA" ] || return 0
  if ! cmp -s "$NEXT_ENV_COPIA" "$NEXT_ENV_FICHEIRO"; then
    cp "$NEXT_ENV_COPIA" "$NEXT_ENV_FICHEIRO"
  fi
  rm -f "$NEXT_ENV_COPIA"
  NEXT_ENV_COPIA=""
}
