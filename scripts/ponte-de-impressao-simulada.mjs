#!/usr/bin/env node
/**
 * A ponte de impressão SIMULADA — e o nome é literal.
 *
 * ── O que isto é, e sobretudo o que não é ─────────────────────────────────
 *
 * Isto implementa o contrato de dispositivo (`POST` / `PATCH entregue` /
 * `PATCH respondeu`) e serve para exercitar os três estados sem hardware.
 *
 * **Simular não é homologar.** Nada do que corre aqui pode aparecer na matriz
 * de homologação como testado — a matriz diz por palavras o que ficou por medir
 * com aparelho a sério, porque uma linha vazia lê-se como uma linha aprovada.
 *
 * ── Os três modos existem para provar o «não sei» ─────────────────────────
 *
 *   --modo=imprime   o aparelho responde ok
 *   --modo=recusa    o aparelho responde «sem papel» — que é INFORMAÇÃO
 *   --modo=mudo      a ponte entrega e o aparelho NÃO responde
 *
 * O terceiro é o que interessa. É ele que produz o estado que o produto tem de
 * saber mostrar como não sei — e é o único dos três que não se consegue
 * observar com uma impressora que funciona.
 *
 * Uso:
 *   node scripts/ponte-de-impressao-simulada.mjs \
 *     --base=http://localhost:3000 --org=<slug> --impressora=<id> \
 *     --job=<id> --modo=mudo --cookie="<sessao>"
 */

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)]; }),
);

const preciso = ['base', 'org', 'impressora', 'job'];
const faltam = preciso.filter((k) => !args[k]);
if (faltam.length > 0) {
  console.error(`faltam argumentos: ${faltam.join(', ')}`);
  process.exit(2);
}

const MODOS = { imprime: ['IMPRIMIU', 'ok: 1 talao'], recusa: ['RECUSOU', 'sem papel'] };
const modo = args.modo ?? 'imprime';
if (modo !== 'mudo' && !MODOS[modo]) {
  console.error(`modo desconhecido: ${modo} (imprime | recusa | mudo)`);
  process.exit(2);
}

const url = `${args.base}/api/org/${args.org}/impressoras/${args.impressora}/enviar`;
const cabecalhos = {
  'content-type': 'application/json',
  ...(args.cookie ? { cookie: args.cookie } : {}),
};

async function falar(corpo) {
  const r = await fetch(url, { method: 'PATCH', headers: cabecalhos, body: JSON.stringify(corpo) });
  const texto = await r.text();
  // O estado HTTP e o corpo, os dois. Um 200 não prova que o outro lado fez o
  // que se pediu — é a mesma lição que este módulo inteiro existe para aplicar.
  console.log(`${corpo.mensagem}: HTTP ${r.status} ${texto}`);
  return r.ok;
}

// 1. A ponte entrega. Isto é o software a fazer a sua parte, e mais nada.
if (!await falar({ jobId: args.job, mensagem: 'entregue' })) process.exit(1);

if (modo === 'mudo') {
  // E cala-se. O produto vai ficar com «entregue à ponte» e sem resposta, e
  // passado o limite tem de dizer NÃO SEI — nem impresso, nem falhado.
  console.log('modo mudo: o aparelho não responde. O envio fica por resolver, de propósito.');
  process.exit(0);
}

const [resultado, resposta] = MODOS[modo];
if (!await falar({ jobId: args.job, mensagem: 'respondeu', resultado, resposta })) process.exit(1);
