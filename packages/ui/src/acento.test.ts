import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..', '..');
const CAMINHO_CSS = join(AQUI, 'estilos.css');

/**
 * A guarda que faltava ao E02.
 *
 * `validarTema` avisa que o Coral Bossa não pode desenhar um controlo nem um
 * sinal — e o aviso **diz, não impede**. No mesmo dia em que essa regra passou a
 * aviso, o primeiro componente a usar o acento violou-a: o sublinhado do
 * separador activo, a 2,77:1 sobre a areia. Nada ficou vermelho.
 *
 * A polaridade é deliberada: **lista de permissão, não de proibição**. Uma lista
 * de selectores proibidos (`[aria-selected]`, `:checked`, `.bo-botao`…) protege
 * o que já existe e deixa passar o componente que alguém escrever amanhã. Aqui é
 * ao contrário — qualquer uso do acento num papel visual reprova, a menos que
 * traga uma justificação escrita a dizer porque é decoração.
 *
 * O escape existe porque a WCAG **não** exige contraste a decoração editorial, e
 * o coral é isso no manual. Mas quem o usar tem de o dizer por extenso.
 */

/** Variáveis do acento da marca. `--bo-acento-sinal` NÃO está aqui: é a corrigida. */
const ACENTOS = ['--bo-acento', '--bo-publico-acento'] as const;

/** Propriedades onde uma cor desenha alguma coisa que se vê. */
const PAPEIS_VISUAIS = [
  'color', 'background', 'background-color', 'background-image',
  'border', 'border-color', 'border-top-color', 'border-right-color',
  'border-bottom-color', 'border-left-color', 'outline', 'outline-color',
  'fill', 'stroke', 'box-shadow', 'text-decoration-color', 'caret-color',
];

/** A marca que autoriza, e obriga a explicar. */
const MARCA_DE_ESCAPE = 'decorativo:';

interface Uso {
  linha: number;
  propriedade: string;
  selector: string;
  justificado: boolean;
  texto: string;
}

/**
 * Lê declarações a sério, e não linha a linha.
 *
 * A primeira versão cortava no primeiro `:` da linha para achar a propriedade —
 * e numa regra escrita numa linha só, `.bo-botao--primario:hover { background:
 * var(--bo-acento); }`, esse `:` é o do `:hover`. A "propriedade" saía
 * `.bo-botao--primario`, não estava na lista de papéis visuais, e o uso passava.
 * Foi o controlo negativo que o apanhou: plantei a violação e a guarda ficou
 * verde. Daí esta máquina de estados, que separa selector de declaração pelas
 * chavetas e pelos ponto-e-vírgulas, como o CSS manda.
 */
function usosDoAcento(css: string): Uso[] {
  // Linhas onde há uma justificação escrita. Recolhidas ANTES de os comentários
  // saírem, senão a marca de escape desaparecia com eles.
  const linhasJustificadas = new Set<number>();
  {
    let linha = 1;
    for (const parte of css.split(/(\/\*[\s\S]*?\*\/)/)) {
      if (parte.startsWith('/*') && parte.includes(MARCA_DE_ESCAPE)) {
        for (let i = 0; i <= (parte.match(/\n/g)?.length ?? 0); i++) linhasJustificadas.add(linha + i);
      }
      linha += parte.match(/\n/g)?.length ?? 0;
    }
  }

  // Comentários fora, mas com as mudanças de linha preservadas: o número de
  // linha que a mensagem de erro imprime tem de bater com o ficheiro.
  const limpo = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ''));

  const usos: Uso[] = [];
  const pilha: string[] = [];
  let buffer = '';
  let linhaBuffer = 1;
  let linha = 1;

  const fechar = () => {
    const declaracao = buffer.trim();
    buffer = '';
    if (!declaracao.includes('var(')) return;
    if (!ACENTOS.some((a) => declaracao.includes(`var(${a})`))) return;

    const doisPontos = declaracao.indexOf(':');
    if (doisPontos < 0) return;
    const propriedade = declaracao.slice(0, doisPontos).trim();
    if (!PAPEIS_VISUAIS.includes(propriedade)) return;

    let justificado = false;
    for (let l = linhaBuffer; l >= linhaBuffer - 12; l--) {
      if (linhasJustificadas.has(l)) { justificado = true; break; }
    }

    usos.push({
      linha: linhaBuffer,
      propriedade,
      selector: pilha[pilha.length - 1] ?? '(desconhecido)',
      justificado,
      texto: declaracao.replace(/\s+/g, ' ') + ';',
    });
  };

  for (const c of limpo) {
    if (c === '\n') linha++;
    if (c === '{') {
      pilha.push(buffer.trim().replace(/\s+/g, ' '));
      buffer = '';
      linhaBuffer = linha;
    } else if (c === '}') {
      fechar();
      pilha.pop();
      linhaBuffer = linha;
    } else if (c === ';') {
      fechar();
      linhaBuffer = linha;
    } else {
      if (buffer.trim() === '') linhaBuffer = linha;
      buffer += c;
    }
  }
  return usos;
}

/** Ficheiros de produto (sem testes) que podem pintar com estilo em linha. */
function ficheirosDeProduto(): string[] {
  const encontrados: string[] = [];
  const visitar = (dir: string) => {
    for (const nome of readdirSync(dir)) {
      if (nome === 'node_modules' || nome === '.next' || nome.startsWith('.')) continue;
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) visitar(caminho);
      else if (/\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome)) encontrados.push(caminho);
    }
  };
  visitar(join(RAIZ, 'packages'));
  visitar(join(RAIZ, 'apps'));
  return encontrados;
}

describe('o acento não desenha controlos nem sinais', () => {
  it('nenhum uso do acento em papel visual sem justificação escrita', () => {
    const usos = usosDoAcento(readFileSync(CAMINHO_CSS, 'utf8'));
    const semJustificacao = usos.filter((u) => !u.justificado);

    assert.deepEqual(
      semJustificacao.map((u) => `estilos.css:${u.linha}  ${u.selector} { ${u.texto} }`),
      [],
      'o acento da marca não chega a 3:1 sobre as superfícies do produto.\n' +
        `Use --bo-acento-sinal, ou escreva um comentário com "${MARCA_DE_ESCAPE} <razão>" ` +
        'a explicar porque é decoração editorial e não um indicador.',
    );
  });

  it('nenhum estilo em linha pinta com o acento da marca', () => {
    // O CSS não é o único sítio onde se pinta: `style={{ borderColor: ... }}`
    // num componente escapa a qualquer varredura de folha de estilos.
    const proibido = /(?:background|backgroundColor|borderColor|border[A-Z]\w*Color|fill|stroke|outlineColor)\s*:\s*[^,;\n}]*\b(?:marca\.acento|--bo-acento\b|--bo-publico-acento)/;
    const maus: string[] = [];
    for (const ficheiro of ficheirosDeProduto()) {
      const conteudo = readFileSync(ficheiro, 'utf8');
      conteudo.split('\n').forEach((linha, i) => {
        if (proibido.test(linha)) maus.push(`${relative(RAIZ, ficheiro)}:${i + 1}  ${linha.trim()}`);
      });
    }
    assert.deepEqual(maus, [], `acento em estilo em linha:\n${maus.join('\n')}`);
  });

  it('CONTROLO NEGATIVO: a varredura encontra mesmo os usos, e distingue-os', () => {
    // Sem isto, o teste acima passaria também se `usosDoAcento` devolvesse
    // sempre uma lista vazia — que é como esta guarda falharia em silêncio.
    const fingido = [
      '.bo-qualquer-coisa[aria-selected="true"] {',
      '  border-bottom-color: var(--bo-acento);',
      '}',
      // Regra numa linha só, com pseudo-classe: o caso que a primeira versão
      // desta guarda deixava passar.
      '.bo-botao--primario:hover { background: var(--bo-acento); }',
      '/* decorativo: traço editorial acima do título, não é indicador. */',
      '.bo-outra-coisa::before {',
      '  background: var(--bo-acento);',
      '}',
      ':root {',
      '  --bo-publico-acento: var(--bo-acento);',
      '}',
    ].join('\n');

    const usos = usosDoAcento(fingido);
    assert.equal(usos.length, 3, 'a definição da variável não conta como papel visual');
    assert.equal(usos[0]?.justificado, false);
    assert.match(usos[0]?.selector ?? '', /aria-selected/);
    assert.match(usos[1]?.selector ?? '', /:hover/, 'a regra numa linha só tem de ser vista');
    assert.equal(usos[1]?.propriedade, 'background');
    assert.equal(usos[1]?.justificado, false);
    assert.equal(usos[2]?.justificado, true, 'o comentário de escape tem de ser reconhecido');
  });

  it('CONTROLO NEGATIVO: a folha de estilos real tem mesmo o que ler', () => {
    const css = readFileSync(CAMINHO_CSS, 'utf8');
    assert.ok(css.includes('--bo-acento:'), 'o acento da marca continua declarado');
    assert.ok(css.includes('--bo-acento-sinal:'), 'o acento de sinal existe');
    // E o separador activo já NÃO usa o da marca.
    const bloco = css.slice(css.indexOf(".bo-separadores__botao[aria-selected='true']"));
    const ateFechar = bloco.slice(0, bloco.indexOf('}'));
    assert.ok(ateFechar.includes('--bo-acento-sinal'), 'o separador activo usa o acento de sinal');
    assert.ok(!/var\(--bo-acento\)/.test(ateFechar), 'e já não usa o da marca');
  });
});
