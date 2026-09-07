#!/usr/bin/env bash
#
# O QUARTO PILAR da pagina de confianca tem de dizer a verdade sobre offline.
#
# ── Porque este guarda existe ─────────────────────────────────────────────
#
# Os outros tres pilares da /trust tem guarda cada um: a exportacao por
# `provar-publicacao.sh`, os alergenios por `validar-alergenios.sh`, o
# isolamento por `validar-rls.sh` e `provar-isolamento-no-produto.sh`. Uma
# afirmacao nova sem guarda seria a unica da pagina sustentada so pela minha
# palavra.
#
# E o assunto deste pilar e' precisamente aquele sobre o qual a FAQ mentiu: o
# `faq4` prometia que «a sala continua a trabalhar e sincroniza quando a ligacao
# volta», e as duas metades eram falsas. Uma promessa desmentida uma vez merece
# a guarda mais apertada da pagina, nao a mais frouxa.
#
# ── O que se verifica, e porque assim ─────────────────────────────────────
#
#   1. a lista fechada continua a existir e a ser lida da FONTE;
#   2. cada membro dela tem nome nas TRES linguas;
#   3. compor um pedido NAO exige rede — o par positivo, sem o qual o pilar
#      diria «nada funciona offline», que e' falso ao contrario;
#   4. nenhuma das chaves do pilar escreve o NUMERO a mao;
#   5. controlo negativo: com uma accao a mais na lista, o guarda fica VERMELHO.
#
# O ponto 5 e' o que separa este guarda de um que passa sempre.
set -uo pipefail
cd "$(dirname "$0")/.."

falhas=0
ok()   { printf '  \033[32mok\033[0m    %s\n' "$1"; }
mau()  { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

echo "1. A lista fechada, lida da fonte"
node --experimental-strip-types - <<'JS' 2>/dev/null
import { ACCOES_QUE_EXIGEM_REDE, exigeRede, podeOffline } from './packages/fila/src/sincronizacao.ts';
import { readFileSync } from 'node:fs';

const LINGUAS = ['es-ES', 'pt-BR', 'en'];
const MAPA = {
  'pagamento': 'accaoRedePagamento',
  'reserva.confirmar': 'accaoRedeReservaConfirmar',
  'conta.fechar': 'accaoRedeContaFechar',
  'desconto.autorizar': 'accaoRedeDescontoAutorizar',
};
let falhas = 0;
const ok = (m) => console.log(`  \x1b[32mok\x1b[0m    ${m}`);
const mau = (m) => { console.log(`  \x1b[31mFALHA\x1b[0m ${m}`); falhas++; };

if (ACCOES_QUE_EXIGEM_REDE.length === 0) mau('a lista fechada esta VAZIA — o pilar nao teria o que delimitar');
else ok(`${ACCOES_QUE_EXIGEM_REDE.length} accoes exigem rede: ${ACCOES_QUE_EXIGEM_REDE.join(', ')}`);

// 2 · cada membro tem nome nas tres linguas
for (const lingua of LINGUAS) {
  const m = JSON.parse(readFileSync(`packages/i18n/src/mensagens/${lingua}.json`, 'utf8')).mktE10;
  const semNome = ACCOES_QUE_EXIGEM_REDE.filter((a) => !MAPA[a] || !m[MAPA[a]]);
  if (semNome.length) mau(`${lingua}: sem nome para ${semNome.join(', ')}`);
  else ok(`${lingua}: as ${ACCOES_QUE_EXIGEM_REDE.length} accoes tem nome na pagina`);
}

// 3 · O PAR POSITIVO. Sem isto o pilar podia dizer «nada funciona sem rede».
if (podeOffline('pedido.enviar').pode !== true) {
  mau('compor/enfileirar um pedido passou a exigir rede — o pilar deixou de ser verdade');
} else ok('compor e enfileirar um pedido continua a NAO exigir rede (o par positivo)');

// 4 · o numero nao se escreve a mao
const NUM = /\b(cuatro|quatro|four|cinco|five|tres|three)\b/i;
for (const lingua of LINGUAS) {
  const m = JSON.parse(readFileSync(`packages/i18n/src/mensagens/${lingua}.json`, 'utf8')).mktE10;
  const maus = ['confianca4Texto', 'confianca4Nota'].filter((k) => NUM.test(m[k] ?? ''));
  if (maus.length) mau(`${lingua}: numero escrito a mao em ${maus.join(', ')} — envelhece sozinho`);
  else ok(`${lingua}: nenhum numero de accoes escrito a mao`);
}

// 5 · CONTROLO NEGATIVO: uma accao a mais tem de ficar sem nome.
const inventada = 'accao.que.nao.existe';
const m = JSON.parse(readFileSync('packages/i18n/src/mensagens/es-ES.json', 'utf8')).mktE10;
const listaComExtra = [...ACCOES_QUE_EXIGEM_REDE, inventada];
const detectou = listaComExtra.some((a) => !MAPA[a] || !m[MAPA[a]]);
if (!detectou) mau('CONTROLO NEGATIVO: o detector nao viu uma accao sem nome — nao esta a medir nada');
else ok('controlo negativo: uma accao a mais na lista fica sem nome e o detector ve');
if (exigeRede(inventada)) mau('CONTROLO NEGATIVO: exigeRede aceitou uma accao inventada');
else ok('controlo negativo: exigeRede recusa a accao inventada');

process.exit(falhas === 0 ? 0 : 1);
JS
saida=$?
[ "$saida" -eq 0 ] || falhas=$((falhas + 1))

echo
echo "2. E a pagina le a fonte, em vez de copiar a lista"
if grep -q "ACCOES_QUE_EXIGEM_REDE" "apps/web/app/[idioma]/trust/page.tsx"; then
  ok "a /trust importa a lista fechada do @bossaos/fila"
else
  mau "a /trust deixou de ler a fonte — a lista passou a ser copia e envelhece sozinha"
fi
if grep -qE "Record<AccaoQueExigeRede" "apps/web/app/[idioma]/trust/page.tsx"; then
  ok "o mapa e' Record<AccaoQueExigeRede, …> — uma accao nova parte o build"
else
  mau "o mapa deixou de ser tipado pela lista fechada: uma accao nova passaria em silencio"
fi

echo
if [ "$falhas" -eq 0 ]; then echo "O quarto pilar diz o que a fonte diz: 0 falhas."; exit 0; fi
echo "O quarto pilar NAO esta provado: $falhas falha(s)."; exit 1
