import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..', '..');
const WEB = join(RAIZ, 'apps', 'web');

/**
 * Nenhuma rota serve dados de inquilino enquanto não houver autenticação.
 *
 * O E03 diz: *"enquanto não houver autenticação real, exponha somente testes
 * locais e nenhuma rota de dados privados desprotegida"*. Sem uma guarda, essa
 * frase vale até alguém precisar de ver uma lista no ecrã — e aí a rota nasce,
 * funciona, e ninguém repara que não pede credencial nenhuma.
 *
 * A regra é grosseira de propósito: **nenhuma rota importa repositórios nem o
 * cliente Prisma**, ponto. A excepção é a sonda de prontidão, que faz `SELECT 1`
 * e lê uma tabela sem inquilino — e está nomeada aqui, não inferida.
 *
 * Quando o E04 trouxer autenticação, esta guarda muda de forma: passa a exigir
 * que a rota atravesse a porta de autorização. Até lá, exige que não exista.
 */

const EXCEPCOES = new Set([
  // Prontidão: `SELECT 1` e `app_meta`. Nenhum dado de inquilino, e é a única
  // rota que precisa mesmo de tocar na base antes de haver sessão.
  'app/api/ready/route.ts',
  // Raiz de composição (E01). Existe para segurar a ligação num sítio só, e é
  // por isso que ela pode importar o cliente — mas o que ela EXPÕE
  // (`obterBase`) está na lista de proibidos abaixo, para nenhuma rota apanhar
  // a base por esta porta lateral.
  'src/servidor.ts',
]);

const PROIBIDO = [
  '@bossaos/db',
  'obterPrisma',
  // A porta lateral: a raiz de composição pode ter a base, mas não a empresta.
  'obterBase',
  'comEscopo',
  'listarMarcas',
  'listarUnidades',
  'prisma.',
];

function rotas(): string[] {
  const encontrados: string[] = [];
  const visitar = (dir: string) => {
    for (const nome of readdirSync(dir)) {
      if (nome === 'node_modules' || nome === '.next' || nome.startsWith('.')) continue;
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) visitar(caminho);
      else if (/\.tsx?$/.test(nome)) encontrados.push(caminho);
    }
  };
  visitar(join(WEB, 'app'));
  visitar(join(WEB, 'src'));
  return encontrados;
}

describe('rotas: nenhum dado privado antes do E04', () => {
  it('nenhuma rota toca em repositórios de inquilino', () => {
    const maus: string[] = [];
    for (const ficheiro of rotas()) {
      const relativo = relative(WEB, ficheiro);
      if (EXCEPCOES.has(relativo)) continue;
      const conteudo = readFileSync(ficheiro, 'utf8');
      for (const marca of PROIBIDO) {
        if (conteudo.includes(marca)) maus.push(`${relativo}: usa "${marca}"`);
      }
    }
    assert.deepEqual(
      maus,
      [],
      'uma rota passou a servir dados de inquilino sem autorização:\n' + maus.join('\n'),
    );
  });

  it('CONTROLO NEGATIVO: a varredura lê mesmo as rotas', () => {
    // Sem isto, o teste acima passaria também se `rotas()` devolvesse lista
    // vazia — a forma mais comum de uma guarda destas não guardar nada.
    const ficheiros = rotas();
    assert.ok(ficheiros.length >= 6, `só ${ficheiros.length} ficheiros de rota encontrados`);

    const nomes = ficheiros.map((f) => relative(WEB, f));
    assert.ok(nomes.includes('app/api/ready/route.ts'), 'devia encontrar a sonda de prontidão');
    assert.ok(nomes.includes('app/api/health/route.ts'), 'e a de vivacidade');

    // E a excepção declarada existe mesmo — uma excepção para um ficheiro que
    // não existe seria uma autorização a pairar sobre nada.
    const prontidao = readFileSync(join(WEB, 'app/api/ready/route.ts'), 'utf8');
    assert.ok(prontidao.includes('obterBase'), 'a excepção é para uma rota que toca mesmo na base');

    const raiz = readFileSync(join(WEB, 'src/servidor.ts'), 'utf8');
    assert.ok(raiz.includes('obterPrisma'), 'a raiz de composição é mesmo quem segura a ligação');

    // E as duas excepções são as ÚNICAS: se alguém acrescentar uma terceira sem
    // pensar, o número muda e este teste obriga a olhar para ela.
    assert.equal(EXCEPCOES.size, 2, 'cada excepção nova tem de ser justificada aqui');
  });
});
