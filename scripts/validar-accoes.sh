#!/usr/bin/env bash
#
# Um botão que anuncia uma acção e não a faz é pior do que um botão ausente: o
# utilizador conclui que o produto está avariado, e tem razão.
#
# `<Botao>` sem atributo nenhum rende `type="button"` (é o valor por omissão do
# componente) sem manipulador, sem formulário à volta e sem destino. Não faz nada.
#
# Nasceu do marco E11, a 04/09: encontrei 19 no repositório e SETE eram legítimas.
# A separação importa e é por isso que as isenções são declaradas por CAMINHO e
# não por contagem — somar tudo dava um número maior e uma conclusão pior.
set -uo pipefail
cd "$(dirname "$0")/.."

# Vitrinas de componentes: existem para MOSTRAR a forma, não para agir. Um botão
# inerte aqui é o conteúdo da página, não um defeito.
VITRINAS='app/\[idioma\]/interno/'

falhas=0
erro() { echo "  FALHA $1"; falhas=$((falhas+1)); }
ok()   { echo "  ok    $1"; }

# Os comentários saem ANTES da busca, pelo leitor comum do projecto. A primeira
# versão desta guarda não o fazia e acusou logo um falso positivo: o JR tinha
# substituído um botão inerte por um `<a>` com destino e deixado um comentário a
# explicar, e o `<Botao>` DENTRO desse comentário foi contado como defeito.
#
# Foi o terceiro sítio hoje onde esta mesma armadilha apareceu, e o projecto já a
# tinha resolvido: a validar-dinheiro e a validar-alergenios usam este leitor pela
# mesma razão. Escrevi uma guarda nova e repeti o erro que estava corrigido ao
# lado - uma guarda que castiga quem documenta ensina a não documentar.
procurar() { # $1 = raiz a varrer
  python3 - "$1" "$VITRINAS" <<'PY'
import pathlib, re, subprocess, sys
raiz, vitrinas = pathlib.Path(sys.argv[1]), sys.argv[2].replace('\\', '')
ficheiros = [f for f in sorted(raiz.rglob('*.tsx')) if vitrinas not in str(f)]
if not list(raiz.rglob('*.tsx')):
    print(f'LEITOR_CEGO {raiz}'); raise SystemExit(2)
for f in ficheiros:
    saida = subprocess.run([sys.executable, 'scripts/sem-comentarios.py', str(f)],
                           capture_output=True, text=True).stdout
    for linha in saida.splitlines():
        # `caminho:numero:conteudo`, como as outras guardas o consomem.
        partes = linha.split(':', 2)
        if len(partes) < 3:
            continue
        m = re.search(r'<Botao>\s*\{?\s*([^<}\n]{0,60})', partes[2])
        if m:
            print(f'INERTE {f}:{partes[1]} {m.group(1).strip()[:44]}')
PY
}

echo "1. Botões que prometem uma acção e não a fazem"
saida=$(procurar apps/web/app)
if grep -q '^LEITOR_CEGO' <<<"$saida"; then
  erro "não encontrei ficheiros .tsx - o leitor está cego"
else
  n=$(grep -c '^INERTE' <<<"$saida" || true)
  if [ "${n:-0}" -gt 0 ]; then
    erro "$n botão(ões) inerte(s) fora das vitrinas de componentes:"
    grep '^INERTE' <<<"$saida" | sed 's|^INERTE apps/web/app/|          |' | head -14
    echo "        Ou ganham acção — onClick, formulário, ou destino — ou saem da tela."
  else
    ok "nenhum botão inerte fora das vitrinas"
  fi
fi

# ── controlo negativo ────────────────────────────────────────────────────────
# Numa CÓPIA da árvore, nunca no ficheiro de trabalho: hoje já reescrevi um
# ficheiro que o JR estava a editar e só não lhe comi trabalho por sorte.
echo
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/app/paginas"
printf 'export const P = () => <div><Botao>{m.qualquer.accao}</Botao></div>;\n' > "$TMP/app/paginas/p.tsx"
if grep -q '^INERTE' <<<"$(procurar "$TMP/app")"; then
  ok "controlo negativo: apanha um Botao inerte plantado"
else
  erro "CONTROLO NEGATIVO FALHOU: não viu um Botao inerte plantado"
fi
# E o outro lado: um botão COM acção não pode ser acusado.
printf 'export const P = () => <div><Botao type="submit">{m.a.b}</Botao></div>;\n' > "$TMP/app/paginas/p.tsx"
if grep -q '^INERTE' <<<"$(procurar "$TMP/app")"; then
  erro "CONTROLO NEGATIVO FALHOU: acusou um botão que TEM acção"
else
  ok "controlo negativo: não acusa um botão com acção"
fi

echo
[ "$falhas" -eq 0 ] && echo "  Nenhuma acção decorativa: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"
