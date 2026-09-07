import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  acentoSinal, alvoDeToque, espaco, estado, foco, grade, linha, marca, movimento,
  raio, superficie, texto, tipografia,
} from './fichas.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(AQUI, 'estilos.css'), 'utf8');

/** As custom properties declaradas no bloco `:root`. */
function variaveisDaRaiz(): Map<string, string> {
  const bloco = CSS.slice(CSS.indexOf(':root {'), CSS.indexOf('\n}', CSS.indexOf(':root {')));
  const mapa = new Map<string, string>();
  for (const linha of bloco.split('\n')) {
    const m = linha.match(/^\s*(--bo-[a-z0-9-]+)\s*:\s*([^;]+);/i);
    if (m?.[1] && m[2]) mapa.set(m[1], m[2].trim());
  }
  return mapa;
}

/**
 * A correspondência entre a folha de estilos e as fichas em TypeScript.
 *
 * Os mesmos valores vivem nos dois sítios porque servem tempos diferentes: o CSS
 * pinta, o TypeScript calcula contraste no servidor. Esta tabela é o que impede
 * as duas cópias de se afastarem — e a asserção do fim garante que ninguém
 * acrescenta um token só a um dos lados.
 */
const CORRESPONDENCIA: Record<string, string> = {
  '--bo-primaria': marca.primaria,
  '--bo-acento': marca.acento,
  '--bo-acento-sinal': acentoSinal,
  '--bo-realce': marca.realce,
  '--bo-superficie-base': superficie.base,
  '--bo-superficie-suave': superficie.suave,
  '--bo-superficie-elevada': superficie.elevada,
  '--bo-superficie-inversa': superficie.inversa,
  '--bo-texto-primario': texto.primario,
  '--bo-texto-secundario': texto.secundario,
  '--bo-texto-inverso': texto.inverso,
  '--bo-borda': linha.borda,
  '--bo-estado-sucesso': estado.sucesso,
  '--bo-estado-aviso': estado.aviso,
  '--bo-estado-perigo': estado.perigo,
  '--bo-estado-info': estado.info,
  '--bo-foco-cor': foco.cor,
  '--bo-foco-espessura': `${foco.espessura}px`,
  '--bo-foco-afastamento': `${foco.afastamento}px`,
  '--bo-espaco-xs': `${espaco.xs}px`,
  '--bo-espaco-sm': `${espaco.sm}px`,
  '--bo-espaco-md': `${espaco.md}px`,
  '--bo-espaco-lg': `${espaco.lg}px`,
  '--bo-espaco-xl': `${espaco.xl}px`,
  '--bo-espaco-xxl': `${espaco.xxl}px`,
  '--bo-espaco-xxxl': `${espaco.xxxl}px`,
  '--bo-espaco-gigante': `${espaco.gigante}px`,
  '--bo-raio-cartao': `${raio.cartao}px`,
  '--bo-raio-controlo': `${raio.controlo}px`,
  '--bo-raio-capsula': `${raio.capsula}px`,
  '--bo-movimento-rapido': `${movimento.rapido}ms`,
  '--bo-movimento-base': `${movimento.base}ms`,
  '--bo-movimento-lento': `${movimento.lento}ms`,
  '--bo-toque-publico': `${alvoDeToque.publico}px`,
  '--bo-toque-operacao': `${alvoDeToque.operacao}px`,
  '--bo-foco-contraste': foco.contraste,
  '--bo-largura-maxima': `${grade.larguraMaxima}px`,
  '--bo-margem-movel': `${grade.margem.movel}px`,
  '--bo-margem-secretaria': `${grade.margem.secretaria}px`,
};

/** Derivadas (apontam a outras variáveis) ou substituídas pelo tema público. */
const DERIVADAS = new Set([
  // ── O contrato de superfície ─────────────────────────────────────────────
  //
  // Estes quatro não têm valor próprio: apontam a outro token, e cada superfície
  // reaponta-os. `.bo-inverso` e `.bo-kds` põem a acção a creme; a
  // `.ns-seccao--verde` põe-na a coral. Perguntar-lhes «que cor és» é a
  // pergunta errada — a certa é «o que promete esta superfície».
  //
  // Entraram no CSS a 07/09 com a cura do anel de foco e ficaram sem ficha
  // durante um dia: o `--bo-foco-contraste`, que TEM valor, está na
  // correspondência acima; estes quatro estão aqui, que é onde os derivados
  // vivem. Um token sem ficha é um valor solto com outro nome.
  '--bo-sobre-superficie',
  '--bo-accao',
  '--bo-sobre-accao',
  '--bo-navegacao-activa',
  '--bo-fonte-titulo',
  '--bo-fonte-corpo',
  '--bo-publico-primaria',
  '--bo-publico-primaria-texto',
  '--bo-publico-acento',
  '--bo-publico-fundo',
  '--bo-publico-texto',
]);

describe('fichas de design', () => {
  it('cada variável do CSS tem o mesmo valor que a ficha em TypeScript', () => {
    const css = variaveisDaRaiz();
    for (const [nome, esperado] of Object.entries(CORRESPONDENCIA)) {
      assert.equal(
        css.get(nome)?.toUpperCase(),
        esperado.toUpperCase(),
        `${nome}: o CSS diz ${css.get(nome)} e a ficha diz ${esperado}`,
      );
    }
  });

  it('nenhum token existe só de um dos lados', () => {
    const css = variaveisDaRaiz();
    const conhecidos = new Set([...Object.keys(CORRESPONDENCIA), ...DERIVADAS]);

    const soNoCss = [...css.keys()].filter((k) => !conhecidos.has(k));
    assert.deepEqual(
      soNoCss,
      [],
      `token no CSS sem ficha correspondente: ${soNoCss.join(', ')} — declare-o em fichas.ts`,
    );

    const soNaFicha = Object.keys(CORRESPONDENCIA).filter((k) => !css.has(k));
    assert.deepEqual(soNaFicha, [], `ficha sem variável no CSS: ${soNaFicha.join(', ')}`);
  });

  it('CONTROLO NEGATIVO: a comparação apanha mesmo uma divergência', () => {
    // Sem isto, os dois testes acima passariam também se `variaveisDaRaiz()`
    // devolvesse um mapa vazio e todos os `get` dessem `undefined` — desde que
    // as fichas também estivessem vazias. Aqui provo que o leitor lê e que a
    // igualdade tem substância.
    const css = variaveisDaRaiz();
    assert.ok(css.size >= 30, `só ${css.size} variáveis lidas — o leitor de CSS partiu-se?`);
    assert.notEqual(css.get('--bo-primaria'), '#000000');
    assert.throws(() => {
      assert.equal(css.get('--bo-primaria'), '#000000');
    });
  });

  it('os alvos de toque cumprem o padrão interno, que é mais exigente que a WCAG', () => {
    const MINIMO_WCAG_22 = 24;
    assert.equal(alvoDeToque.publico, 44);
    assert.equal(alvoDeToque.operacao, 48);
    assert.ok(alvoDeToque.publico > MINIMO_WCAG_22);
    assert.ok(alvoDeToque.operacao > alvoDeToque.publico, 'a operação exige mais que o público');
  });

  it('a escala tipográfica respeita o mínimo do manual', () => {
    for (const [nome, e] of Object.entries(tipografia.escala)) {
      assert.ok(
        e.tamanho >= tipografia.tamanhoMinimo,
        `${nome} tem ${e.tamanho}px, abaixo do mínimo de ${tipografia.tamanhoMinimo}px`,
      );
      assert.ok(e.entrelinha > e.tamanho, `${nome}: entrelinha tem de ser maior que o corpo`);
    }
  });

  it('a grade é toda múltipla de 4', () => {
    for (const [nome, v] of Object.entries(espaco)) {
      assert.equal(v % grade.base, 0, `espaco.${nome} = ${v} não assenta na grade de ${grade.base}`);
    }
  });

  it('os cinco pontos de inspecção do E02 estão declarados', () => {
    assert.deepEqual([...grade.pontosDeInspeccao], [360, 390, 768, 1280, 1440]);
  });
});
