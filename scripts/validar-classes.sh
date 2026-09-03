#!/usr/bin/env bash
#
# Uma classe `bo-` que não existe no CSS não dá erro em lado nenhum.
#
# ── Porque é que este guarda existe ────────────────────────────────────────
#
# É a mesma família do `var(--bo-primaria-texto)` que não existia e pintava
# #102E35 sobre #102E35: **o navegador não se queixa**. O elemento aparece sem
# estilo, o `tsc` não vê dentro de uma cadeia de caracteres, o teste de contraste
# lê o que está pintado — e o que está pintado é o que herdou do pai, que passa.
#
# Encontrei quatro no E07 escritas por mim (`bo-alergenio`, `bo-campo__envolvente`,
# `bo-lista`, `bo-tabela__legenda`), e nenhuma delas caiu em nada.
set -uo pipefail
cd "$(dirname "$0")/.."

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

ler() {
  python3 - "$@" <<'PY'
import pathlib, re, sys

css = set()
for f in pathlib.Path('packages/ui/src').rglob('*.css'):
    css |= set(re.findall(r'\.(bo-[A-Za-z0-9_-]+)', f.read_text(encoding='utf-8')))

usadas: dict[str, set[str]] = {}
raizes = [pathlib.Path('apps/web/app'), pathlib.Path('packages/ui/src')]
for raiz in raizes:
    for f in raiz.rglob('*.tsx'):
        if '.next' in f.parts:
            continue
        texto = f.read_text(encoding='utf-8')
        # `className="a b"` e `className={'a b'}` / crases. Só cadeias literais:
        # um nome montado em tempo de execução não se pode verificar aqui, e
        # fingir que sim seria pior do que não olhar.
        for m in re.findall(r'className=(?:"([^"]*)"|\{`([^`{}]*)`\}|\{\'([^\']*)\'\})', texto):
            for pedaco in m:
                for c in pedaco.split():
                    if c.startswith('bo-'):
                        usadas.setdefault(c, set()).add(str(f))

# Guarda de leitor cego: se o CSS não for lido, tudo "existe" por vacuidade.
if len(css) < 100:
    print(f'LEITOR_CEGO {len(css)}')
    raise SystemExit(2)

faltam = {c: v for c, v in usadas.items() if c not in css}
print(f'CONTAGENS {len(css)} {len(usadas)}')
for c, v in sorted(faltam.items()):
    print(f'FALTA {c} {sorted(v)[0]}')
PY
}

echo "1. Classes bo- usadas no JSX existem no CSS?"
saida=$(ler) || { vermelho "o leitor de CSS não leu nada — o guarda está cego"; echo "$saida"; exit 2; }
read -r _ n_css n_uso <<<"$(grep '^CONTAGENS' <<<"$saida")"
faltam=$(grep -c '^FALTA' <<<"$saida" || true)
if [[ "$faltam" == "0" ]]; then
  verde "$n_uso classes usadas, todas definidas ($n_css no CSS)"
else
  vermelho "$faltam classes usadas sem definição no CSS:"
  grep '^FALTA' <<<"$saida" | sed 's/^FALTA /    /'
fi

echo
echo "2. CONTROLO NEGATIVO — uma classe inventada"
# Planta o defeito real: uma classe que ninguém definiu, num ficheiro a sério.
ALVO="apps/web/app/[idioma]/app/[orgSlug]/catalogo/page.tsx"
COPIA=$(mktemp); cp "$ALVO" "$COPIA"
trap 'cp "$COPIA" "$ALVO"; rm -f "$COPIA"' EXIT INT TERM
python3 - "$ALVO" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
p.write_text(s.replace('className="bo-pagina"', 'className="bo-pagina bo-classe-que-nao-existe"', 1), encoding='utf-8')
PY
if grep -q '^FALTA bo-classe-que-nao-existe' <<<"$(ler)"; then
  verde "apanhou a classe inventada"
else
  vermelho "não apanhou uma classe que não existe — o guarda não mede nada"
fi
cp "$COPIA" "$ALVO"

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas falhas"; fi
exit $(( falhas > 0 ? 1 : 0 ))
