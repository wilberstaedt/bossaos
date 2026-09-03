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
import pathlib, re, subprocess, sys

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
        # A 04/09 isto ancorava em `className=` e via só três formas. Uma classe
        # escrita como `className={a ? 'bo-x' : 'bo-y'}` — JSX corrente — era
        # INVISÍVEL: provei-o com a mesma classe inexistente nas duas formas, e a
        # simples reprovava enquanto a condicional dizia 0 falhas.
        #
        # A correcção não é acrescentar mais uma forma à expressão. Isso seria
        # vigiar um ESTILO de escrita em vez da propriedade, que é exactamente o
        # defeito que hoje custou uma retenção no E09 e dois buracos em guardas
        # minhas. Passa a ler os `bo-*` de QUALQUER cadeia literal do ficheiro —
        # aspas, plicas ou crases —, seja qual for a forma que os envolve.
        #
        # Comentários fora, pelo leitor comum: um `bo-*` num comentário é uma
        # menção e não um uso, e menção não é medição.
        limpo = subprocess.run(
            [sys.executable, 'scripts/sem-comentarios.py', str(f)],
            capture_output=True, text=True).stdout or texto
        for pedaco in re.findall(r'"([^"\n]*)"|\'([^\'\n]*)\'|`([^`]*)`', limpo):
            for parte in pedaco:
                for bruto in parte.split():
                    # Extrai-se o PREFIXO válido em vez de aparar pontuação caso a
                    # caso. Aparei aspas, apareceu `bo-botao--fantasma'}`; aparar
                    # símbolo a símbolo é perseguir a forma outra vez, que é o
                    # defeito que ando a corrigir hoje. Um nome de classe é
                    # [A-Za-z0-9_-]; tudo o resto é o literal à volta.
                    #
                    # Nome com interpolação fica de fora, e é deliberado: o sufixo
                    # de `bo-etiqueta--${tom}` só existe em execução, e o prefixo
                    # sozinho não é uma classe. Perder um uso é seguro nesta
                    # guarda — ela falha por "usada sem definição", por isso o erro
                    # conservador é ver de menos, nunca inventar de mais.
                    if '${' in bruto:
                        continue
                    achado = re.match(r'bo-[A-Za-z0-9_-]*', bruto)
                    if achado:
                        usadas.setdefault(achado.group(0), set()).add(str(f))

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

echo "3. CONTROLO NEGATIVO — a mesma classe na forma CONDICIONAL"
# Corre SEPARADO do anterior, e a razão é um erro meu de hoje: pus duas sondas no
# mesmo ficheiro e a primeira fazia a guarda falhar sozinha, mascarando a segunda
# — o controlo passava com o detector partido. Uma sonda que tapa outra mede a
# sonda mais fácil e não a propriedade.
#
# Esta forma era INVISÍVEL até 04/09: a leitura ancorava em `className=` e via só
# três formas, por isso `className={a ? 'bo-x' : 'bo-y'}` — JSX corrente — passava
# sem ninguém dar por ela. Provei-o com a mesma classe inexistente nas duas
# formas: a simples reprovava, a condicional dizia 0 falhas.
cp "$ALVO" "$COPIA"
python3 - "$ALVO" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
p.write_text(s.replace('className="bo-pagina"',
  "className={true ? 'bo-pagina bo-condicional-inexistente' : 'bo-pagina'}", 1), encoding='utf-8')
PY
if grep -q '^FALTA bo-condicional-inexistente' <<<"$(ler)"; then
  verde "apanhou a classe inventada na forma condicional"
else
  vermelho "a forma condicional voltou a ser invisível — a leitura está a vigiar um estilo"
fi
cp "$COPIA" "$ALVO"

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas falhas"; fi
exit $(( falhas > 0 ? 1 : 0 ))
