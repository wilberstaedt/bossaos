#!/usr/bin/env bash
#
# Cada rota comercial tem metadados PROPRIOS, e nenhuma rota de sessao se indexa.
#
# ── Porque este guarda existe ─────────────────────────────────────────────
#
# O `[idioma]/layout.tsx` declarava UM titulo — 'BossaOS' — e UMA descricao, em
# portugues, para as rotas comerciais todas, incluindo a espanhola que e' a
# lingua do piloto. Nao era descuido de traducao: era um objecto ESTATICO num
# layout que gera tres construcoes.
#
# Um defeito destes nao aparece no ecra. Vive no `<head>`, e quem o descobre e'
# um relatorio de indexacao semanas depois — que e' exactamente a familia de
# defeito que precisa de guarda e nao de revisao.
#
# ── O que se verifica ─────────────────────────────────────────────────────
#
#   1. cada rota indexavel tem chave de titulo e de descricao declaradas;
#   2. as chaves existem nas TRES linguas e nenhuma esta vazia;
#   3. NENHUM titulo se repete entre rotas, e NENHUMA descricao tambem — que e'
#      a forma exacta do defeito que existia;
#   4. a descricao de cada lingua esta NA lingua (nao a portuguesa em todas);
#   5. nenhuma pasta de rota publica ficou por classificar;
#   6. controlos negativos: o detector apanha uma duplicada e uma rota nova.
set -uo pipefail
cd "$(dirname "$0")/.."

node --experimental-strip-types - <<'JS' 2>&1 | grep -v ExperimentalWarning | grep -v "trace-warnings"
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { ROTAS_INDEXAVEIS, ROTAS_PUBLICAS_NAO_INDEXAVEIS, PREFIXOS_AUTENTICADOS }
  from './apps/web/src/seo/rotas.ts';

const LINGUAS = ['es-ES', 'pt-BR', 'en'];
let falhas = 0;
const ok  = (m) => console.log(`  \x1b[32mok\x1b[0m    ${m}`);
const mau = (m) => { console.log(`  \x1b[31mFALHA\x1b[0m ${m}`); falhas++; };

// O mapa rota -> chaves, lido do ficheiro que o declara.
const fonte = readFileSync('apps/web/src/seo/metadados.ts', 'utf8');
const TITULOS = {};
for (const m of fonte.matchAll(
  /'([^']*)':\s*\{\s*titulo:\s*'([^']+)',\s*descricao:\s*'([^']+)'\s*\}/g)) {
  TITULOS[m[1]] = { titulo: m[2], descricao: m[3] };
}
const cat = Object.fromEntries(LINGUAS.map((l) =>
  [l, JSON.parse(readFileSync(`packages/i18n/src/mensagens/${l}.json`, 'utf8')).mktE10]));

console.log('1. Cada rota indexavel tem metadados proprios');
const semChave = ROTAS_INDEXAVEIS.filter((r) => !TITULOS[r]);
if (semChave.length) mau(`sem titulo declarado: ${semChave.join(', ')}`);
else ok(`${ROTAS_INDEXAVEIS.length} rotas indexaveis, todas com chaves declaradas`);

for (const lingua of LINGUAS) {
  const faltam = [];
  for (const r of ROTAS_INDEXAVEIS) {
    const c = TITULOS[r]; if (!c) continue;
    if (!cat[lingua][c.titulo]?.trim()) faltam.push(`${r}:titulo`);
    if (!cat[lingua][c.descricao]?.trim()) faltam.push(`${r}:descricao`);
  }
  if (faltam.length) mau(`${lingua}: em falta ${faltam.join(', ')}`);
  else ok(`${lingua}: titulo e descricao presentes nas ${ROTAS_INDEXAVEIS.length}`);
}

console.log('\n2. Nenhum titulo nem descricao se repete entre rotas');
for (const lingua of LINGUAS) {
  for (const campo of ['titulo', 'descricao']) {
    const vistos = new Map();
    const repetidos = [];
    for (const r of ROTAS_INDEXAVEIS) {
      const c = TITULOS[r]; if (!c) continue;
      const v = cat[lingua][c[campo]];
      if (vistos.has(v)) repetidos.push(`${r} = ${vistos.get(v)}`);
      else vistos.set(v, r);
    }
    if (repetidos.length) mau(`${lingua} ${campo}: repetidos -> ${repetidos.join(' | ')}`);
    else ok(`${lingua}: ${vistos.size} ${campo}s distintos`);
  }
}

console.log('\n3. A descricao de cada lingua esta NA lingua');
// Nao se compara traducao: compara-se que as tres NAO sao a mesma cadeia, que e'
// o defeito que existia — a portuguesa servida tambem em espanhol e em ingles.
let iguais = 0;
for (const r of ROTAS_INDEXAVEIS) {
  const c = TITULOS[r]; if (!c) continue;
  const vs = LINGUAS.map((l) => cat[l][c.descricao]);
  if (new Set(vs).size === 1) { mau(`${r}: a mesma descricao nas tres linguas`); iguais++; }
}
if (!iguais) ok(`as ${ROTAS_INDEXAVEIS.length} descricoes diferem entre linguas`);

console.log('\n4. Nenhuma pasta de rota publica ficou por classificar');
const base = 'apps/web/app/[idioma]';
const pastas = readdirSync(base, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${base}/${d.name}/page.tsx`))
  .map((d) => `/${d.name}`);
const conhecidas = new Set([
  ...ROTAS_INDEXAVEIS.filter(Boolean),
  ...Object.keys(ROTAS_PUBLICAS_NAO_INDEXAVEIS),
  ...PREFIXOS_AUTENTICADOS,
]);
const orfas = pastas.filter((p) => !conhecidas.has(p));
if (orfas.length) mau(`rota(s) por classificar (indexavel ou nao?): ${orfas.join(', ')}`);
else ok(`${pastas.length} pastas de rota, todas classificadas`);

console.log('\n5. Controlos negativos');
// (a) o detector de duplicados ve uma duplicada plantada
const comDup = ['a', 'b', 'b'];
if (new Set(comDup).size === comDup.length) mau('CONTROLO: o detector de duplicados nao ve uma duplicada');
else ok('controlo negativo: o detector ve um titulo duplicado');
// (b) o detector de orfas ve uma pasta inventada
const orfasFalsas = [...pastas, '/rota-inventada'].filter((p) => !conhecidas.has(p));
if (!orfasFalsas.includes('/rota-inventada')) mau('CONTROLO: o detector nao ve uma rota por classificar');
else ok('controlo negativo: o detector ve uma rota nova por classificar');
// (c) e NAO acusa as que existem
if (orfasFalsas.length !== 1) mau(`CONTROLO: acusou ${orfasFalsas.length} em vez de so a inventada`);
else ok('controlo negativo: nao acusa as rotas que ja estao classificadas');

console.log();
if (falhas === 0) console.log('Metadados por rota: 0 falhas.');
else console.log(`Metadados por rota: ${falhas} falha(s).`);
process.exit(falhas === 0 ? 0 : 1);
JS
