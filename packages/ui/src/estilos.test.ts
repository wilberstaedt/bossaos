import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..', '..');
const CSS = readFileSync(join(AQUI, 'estilos.css'), 'utf8');

/** Todo o código que pode usar uma classe: componentes daqui e páginas da app. */
function ficheirosDeCodigo(): string[] {
  const encontrados: string[] = [];
  const visitar = (dir: string) => {
    for (const nome of readdirSync(dir)) {
      if (nome === 'node_modules' || nome === '.next' || nome.startsWith('.')) continue;
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) visitar(caminho);
      // Os próprios testes ficam de fora, por duas razões: uma classe usada só
      // num teste não está a ser usada pelo produto, e — como este ficheiro
      // aprendeu — incluí-los faz o controlo negativo encontrar-se a si próprio.
      else if (/\.(tsx?|css)$/.test(nome) && !nome.endsWith('estilos.css') && !/\.test\.tsx?$/.test(nome)) {
        encontrados.push(caminho);
      }
    }
  };
  visitar(join(RAIZ, 'packages'));
  visitar(join(RAIZ, 'apps'));
  return encontrados;
}

describe('folha de estilos', () => {
  it('nenhuma classe declarada fica sem quem a use', () => {
    // Foi assim que apareceu `.bo-admin__inferior`: o CSS da barra inferior do
    // telemóvel estava escrito e nenhum componente a rendia. Um estilo que
    // ninguém usa não dá erro nem aviso — só não existe no ecrã, e ninguém
    // repara enquanto não compara com o desenho.
    const declaradas = new Set(
      [...CSS.matchAll(/\.(bo-[a-z0-9_-]+)/gi)].map((m) => m[1] as string),
    );
    const codigo = ficheirosDeCodigo()
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');

    const orfas = [...declaradas].filter((classe) => {
      if (codigo.includes(classe)) return false;
      // Variantes compostas em tempo de execução: `bo-botao--${tom}` nunca
      // aparece por extenso. Aceita-se a classe se o prefixo for interpolado.
      const raiz = classe.split('--')[0];
      return !codigo.includes(`${raiz}--\${`);
    });

    assert.deepEqual(
      orfas.sort(),
      [],
      `classes declaradas e nunca usadas:\n  ${orfas.sort().join('\n  ')}`,
    );
  });

  it('CONTROLO NEGATIVO: a varredura lê mesmo os ficheiros', () => {
    const ficheiros = ficheirosDeCodigo();
    assert.ok(ficheiros.length > 15, `só ${ficheiros.length} ficheiros — a varredura partiu-se?`);
    const codigo = ficheiros.map((f) => readFileSync(f, 'utf8')).join('\n');
    assert.ok(codigo.includes('bo-botao'), 'devia encontrar a classe do botão');
    assert.ok(!codigo.includes('bo-classe-que-nao-existe'), 'e não encontrar o que não existe');
  });

  it('o movimento reduzido é respeitado', () => {
    assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(CSS, /animation-duration:\s*0\.01ms\s*!important/);
  });

  it('o foco tem uma regra sem excepções', () => {
    assert.match(CSS, /:focus-visible\s*\{[^}]*outline:/);
    // `outline: none` sem substituto é a forma mais comum de apagar o foco.
    const apagados = [...CSS.matchAll(/outline:\s*(none|0)\s*;/gi)];
    assert.equal(apagados.length, 0, 'há um `outline: none` na folha de estilos');
  });
});
