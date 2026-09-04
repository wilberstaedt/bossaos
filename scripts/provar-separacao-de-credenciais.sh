#!/usr/bin/env bash
#
# Prova o aceite 2 do E01: "runtime não tem privilégios de alterar o schema".
#
# Uma afirmação destas não vale por estar escrita no README. Este script põe a
# credencial do runtime a TENTAR alterar o schema e exige que o Postgres a
# recuse. E, porque uma recusa também aconteceria se a credencial estivesse
# simplesmente partida, começa por exigir que ela CONSIGA fazer o seu trabalho
# normal — o controlo negativo. Sem essa primeira metade, um DATABASE_URL com a
# senha errada dava "tudo verde".
#
# Uso: ./scripts/provar-separacao-de-credenciais.sh
set -uo pipefail

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

falhas=0
# Quantas verificações correram de facto.
#
# Acrescentado depois de o verificador do E03 conseguir dizer verde sem ter
# medido nada. Um contador de FALHAS a zero só diz que nada correu mal; não diz
# que alguma coisa correu. São perguntas diferentes, e é sempre a segunda que
# falta.
verificacoes=0
# O mínimo vive numa variável só. Ao provar que este portão dispara, vi a
# mensagem dizer "esperadas 8" enquanto a comparação usava outro número: tinha o
# valor escrito duas vezes. Uma régua que se descreve a si própria de forma
# diferente da que aplica é uma régua que ninguém pode acreditar.
MINIMO_VERIFICACOES=9

verde() { printf '  \033[32mok\033[0m   %s\n' "$1"; verificacoes=$((verificacoes + 1)); }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); verificacoes=$((verificacoes + 1)); }

# Corre SQL com a credencial do runtime. Devolve 0 se o Postgres aceitou.
runtime() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "$1" >/dev/null 2>&1; }

echo "1. Controlo negativo — a credencial do runtime está viva e trabalha?"
if runtime "SELECT key FROM app_meta"; then
  verde "lê app_meta"
else
  vermelho "não lê app_meta — a credencial está partida, e então as recusas abaixo não provam nada"
  echo; echo "Interrompido: sem esta metade, o resto seria verde vazio."
  exit 1
fi
if runtime "INSERT INTO app_meta (key, value, updated_at) VALUES ('prova_runtime', 'ok', NOW())
            ON CONFLICT (key) DO UPDATE SET updated_at = NOW()"; then
  verde "escreve em app_meta"
else
  vermelho "não escreve em app_meta — o runtime não conseguiria funcionar"
fi

echo
echo "2. O que o runtime NÃO pode fazer (cada linha tem de ser recusada):"
for sql in \
  "CREATE TABLE prova_ddl (id int)" \
  "ALTER TABLE app_meta ADD COLUMN prova_ddl text" \
  "DROP TABLE app_meta" \
  "CREATE INDEX prova_ddl_idx ON app_meta (value)" \
  "TRUNCATE app_meta"
do
  if runtime "$sql"; then
    vermelho "PERMITIDO (devia ser recusado): $sql"
    # Desfaz o estrago que acabámos de provar ser possível.
    psql "$MIGRATION_DATABASE_URL" -q -c "DROP TABLE IF EXISTS prova_ddl" >/dev/null 2>&1
    psql "$MIGRATION_DATABASE_URL" -q -c "ALTER TABLE app_meta DROP COLUMN IF EXISTS prova_ddl" >/dev/null 2>&1
  else
    verde "recusado: $sql"
  fi
done

echo
echo "3. A credencial de migração consegue o que o runtime não consegue?"
if psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -q \
     -c "CREATE TABLE prova_migracao (id int)" -c "DROP TABLE prova_migracao" >/dev/null 2>&1; then
  verde "migração cria e larga tabelas"
else
  vermelho "migração não altera schema — as migrações não correriam"
fi

psql "$DATABASE_URL" -q -c "DELETE FROM app_meta WHERE key = 'prova_runtime'" >/dev/null 2>&1

echo
echo
echo "4. A IDENTIDADE fica fora do alcance do runtime"
# Acrescentado a 04/09, e nasce de um defeito real e nao de uma ideia.
#
# A tela de equipa (ORG-007) devolvia 500 e NUNCA tinha funcionado: lia `users`
# pelo cliente do runtime, e o runtime nao ve `users`. A juncao devolvia nulos e a
# pagina rebentava. Isso nao e defeito da base - e ESTA separacao, e esta certa.
#
# O conserto errado e obvio e tentador: dar ao runtime permissao de ler `users` e
# a tela passa a renderizar. Isso trocava um ecra partido por um buraco de
# seguranca, e NENHUMA verificacao aqui o apanhava, porque a seccao 2 so mede DDL.
#
# O par que da sentido: o runtime nao ve NENHUMA linha e a migracao ve algumas. Sem
# a segunda metade, uma base vazia passaria isto de olhos fechados.
n_runtime=$(psql "$DATABASE_URL" -tAc "SELECT count(*) FROM users" 2>/dev/null | tr -d ' ')
n_migracao=$(psql "$MIGRATION_DATABASE_URL" -tAc "SELECT count(*) FROM users" 2>/dev/null | tr -d ' ')
if [ -z "$n_migracao" ] || [ "${n_migracao:-0}" -eq 0 ]; then
  vermelho "a migracao nao ve utilizadores — sem populacao, a recusa abaixo nao prova nada"
elif [ "${n_runtime:-1}" -ne 0 ]; then
  vermelho "o runtime ve $n_runtime utilizadores — a identidade deixou de estar separada"
else
  verde "o runtime ve 0 de $n_migracao utilizadores — identidade separada, com populacao a provar"
fi

if (( verificacoes < MINIMO_VERIFICACOES )); then
  echo
  echo "VERDE COM ZERO MEDIDO: só $verificacoes verificações correram, esperadas $MINIMO_VERIFICACOES."
  echo "A prova não correu inteira — não conclua nada dela."
  exit 1
fi

if (( falhas == 0 )); then
  echo "Separação de credenciais provada: $falhas falhas."
else
  echo "Separação de credenciais NÃO provada: $falhas falha(s)."
  exit 1
fi
