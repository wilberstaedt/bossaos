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
# `apps/web/src` FALTAVA, e com ele todos os componentes de cliente do produto —
# `src/componentes/` desde o E02, `src/staff/` desde o E15. A guarda dizia «167
# classes usadas, todas definidas» e não tinha lido metade do JSX que existe.
#
# É a mesma família das outras cegueiras deste projecto: o verificador que dizia
# verde com zero grupos, a varredura cega ao padrão que interessava, o `[A-Z]{3,6}`
# que não via `QR-001`. Um instrumento que não alcança o alvo tem de FALHAR, e
# este contava zero — por isso o controlo negativo 4, mais abaixo, planta o
# defeito exactamente dentro desta raiz.
raizes = [
    pathlib.Path('apps/web/app'),
    pathlib.Path('apps/web/src'),
    pathlib.Path('packages/ui/src'),
]
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

# ── O NOME É NOVO EM CADA CORRIDA, e isso não é enfeite ───────────────────
#
# A 06/09 um plante do controlo 3 ficou COMMITADO na árvore — a corrida anterior
# morreu antes do `trap`. Consequência dupla, e a segunda é a que interessa:
#
#   1. codigo falso em produção;
#   2. **o controlo 2 deixou de medir**. Ele substitui `className="bo-pagina"`,
#      e o resíduo tinha comido essa âncora. O plante não aplicou, o `grep` não
#      achou nada, e a guarda disse «não mede nada» sem dizer porquê.
#
# Com um nome novo por corrida, um resíduo nunca se confunde com o plante desta
# — e a ÂNCORA verifica-se antes, que é o que faltava.
MARCA="$$-$(date +%s)"

# ── E o plante prova que aplicou ──────────────────────────────────────────
#
# É o `plantar()` dos guiões do E31 e do E32, trazido para aqui: se a âncora
# mudou — ou já foi comida por um resíduo —, isto diz-o em vez de medir o
# vazio. Um controlo que não aplicou e reporta é pior do que um que falha.
plantar_classe() {
  local antes; antes=$(md5 -q "$ALVO" 2>/dev/null || md5sum "$ALVO" | cut -d' ' -f1)
  python3 - "$ALVO" "$1" "$2" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding='utf-8')
p.write_text(s.replace('className="bo-pagina"', sys.argv[2].replace('@@', sys.argv[3]), 1),
             encoding='utf-8')
PY
  local depois; depois=$(md5 -q "$ALVO" 2>/dev/null || md5sum "$ALVO" | cut -d' ' -f1)
  if [[ "$antes" == "$depois" ]]; then
    vermelho "o plante NAO APLICOU — a ancora className=\"bo-pagina\" nao esta em $ALVO"
    echo "        Provavel residuo de uma corrida anterior morta a meio. Isto nao mediu nada."
    return 1
  fi
}

if ! plantar_classe 'className="bo-pagina bo-classe-que-nao-existe-@@"' "$MARCA"; then
  :
elif grep -q "^FALTA bo-classe-que-nao-existe-$MARCA" <<<"$(ler)"; then
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

echo "4. CONTROLO NEGATIVO — a raiz que a guarda NAO lia"
# Este controlo existe por um defeito encontrado a 04/09, no E15: a leitura só
# percorria `apps/web/app` e `packages/ui/src`. Todo o `apps/web/src` ficava de
# fora — os componentes de cliente do produto, lá desde o E02 — e a guarda dizia
# «167 classes usadas, todas definidas» sem ter lido metade do JSX que existe.
# Seis classes do E15 estavam a ser usadas sem CSS nenhum, e nada acendeu.
#
# Os controlos 2 e 3 plantavam sempre no MESMO ficheiro, dentro de uma raiz que
# era lida. Provavam que o detector reconhece a FORMA, e nunca que ele ALCANÇA o
# alvo — que é a diferença entre um detector calibrado ao sintoma e um que mede a
# propriedade. Este planta noutra raiz de propósito, e é ele que impede a
# cegueira de voltar sem barulho.
ALVO2="apps/web/src/staff/PainelDaFila.tsx"
COPIA2=$(mktemp); cp "$ALVO2" "$COPIA2"
trap 'cp "$COPIA" "$ALVO"; cp "$COPIA2" "$ALVO2"; rm -f "$COPIA" "$COPIA2"' EXIT INT TERM
python3 -c '
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text(encoding="utf-8")
p.write_text(s.replace("className=\"bo-fila\"", "className=\"bo-fila bo-fora-do-alcance\"", 1), encoding="utf-8")
' "$ALVO2"
if grep -q '^FALTA bo-fora-do-alcance' <<<"$(ler)"; then
  verde "alcança apps/web/src — os componentes de cliente são lidos"
else
  vermelho "apps/web/src voltou a ficar fora do alcance: a guarda conta zero em vez de falhar"
fi
cp "$COPIA2" "$ALVO2"

echo
echo "5. As VARIAVEIS do tema tambem tem de existir"
# ── O buraco que isto fecha, e apanhou-me a 06/09 ──────────────────────────
#
# Esta guarda contava classes e nao contava `var(--bo-...)`. Escrevi
# `var(--bo-superficie-2)` e `var(--bo-raio-sm)` — que NAO EXISTEM — e a guarda
# disse 0 falhas. Uma classe por definir e um buraco visivel; uma variavel por
# definir e pior: o CSS nao da erro nenhum, a propriedade cai para o valor
# inicial, e o cartao aparece transparente sem ninguem saber porque.
#
# Mesma familia de tudo o resto neste ficheiro: o detector reconhecia UMA forma
# de escrever o defeito e chamava-lhe cobertura.
declarar_variaveis() {
  python3 - <<'PY'
import pathlib, re, sys

definidas, usadas = set(), {}
for f in pathlib.Path('packages/ui/src').rglob('*.css'):
    texto = f.read_text(encoding='utf-8')
    definidas |= set(re.findall(r'^\s*(--bo-[A-Za-z0-9_-]+)\s*:', texto, re.M))
    for v in re.findall(r'var\(\s*(--bo-[A-Za-z0-9_-]+)', texto):
        usadas.setdefault(v, set()).add(str(f))

em_falta = sorted(v for v in usadas if v not in definidas)
for v in em_falta:
    print(f"FALTA {v} — usada em {sorted(usadas[v])[0]}")
print(f"CONTAGEM {len(definidas)} definidas, {len(usadas)} usadas")
PY
}

saida=$(declarar_variaveis)
if grep -q '^FALTA ' <<<"$saida"; then
  vermelho "variavel de tema usada sem estar definida:"
  grep '^FALTA ' <<<"$saida" | head -4 | sed 's/^/          /'
else
  verde "$(grep '^CONTAGEM' <<<"$saida" | sed 's/^CONTAGEM //')"
fi

# Controlo negativo: a mesma leitura tem de acusar uma inventada e NAO acusar
# uma real. Sem isto, esta seccao nascia sem nunca ter reprovado nada — que foi
# como a queda em NAO_CONTEM viveu semanas no validar-alergenios.
SONDA_CSS="packages/ui/src/sonda-variaveis.tmp.css"
printf '.bo-sonda { color: var(--bo-nao-existe-mesmo); background: var(--bo-espaco-sm); }\n' \
  > "$SONDA_CSS"
sonda=$(declarar_variaveis)
rm -f "$SONDA_CSS"
if grep -q 'FALTA --bo-nao-existe-mesmo' <<<"$sonda" \
   && ! grep -q 'FALTA --bo-espaco-sm' <<<"$sonda"; then
  verde "controlo negativo: apanha a inventada e NAO acusa a que existe"
else
  vermelho "CONTROLO NEGATIVO FALHOU na leitura das variaveis"
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas falhas"; fi
exit $(( falhas > 0 ? 1 : 0 ))
