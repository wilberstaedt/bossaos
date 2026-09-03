import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..', '..');
const WEB = join(RAIZ, 'apps', 'web');

/**
 * Nenhuma rota toca em dados de inquilino sem atravessar a porta.
 *
 * Esta guarda **mudou de forma no E04**, e a mudança estava prevista. No E03 ela
 * dizia "nenhuma rota importa repositórios", porque não havia autenticação e o
 * comportamento seguro era não existirem rotas de dados. Agora existem — e a
 * pergunta deixa de ser *se* tocam na base e passa a ser *como lá chegam*.
 *
 * A regra: qualquer rota que use `@bossaos/db` tem de passar por
 * `resolverPedido` ou `actorDoPedido`. Não é uma verificação de que a
 * autorização está CERTA — isso é a prova de acesso, com o par (1)/(2). É a
 * verificação de que ela existe, que é a que apanha a rota nova escrita à
 * pressa numa sexta-feira.
 */

/** Cada excepção é justificada aqui. Uma excepção sem razão é uma porta. */
const EXCEPCOES = new Map<string, string>([
  ['app/api/ready/route.ts', 'sonda de prontidão: SELECT 1 e app_meta, zero dados de inquilino'],
  ['src/servidor.ts', 'raiz de composição: segura a ligação num sítio só'],
  ['src/sessao.ts', 'é a própria porta — não pode exigir-se a si mesma'],
  ['app/api/auth/[...all]/route.ts', 'a biblioteca de autenticação, com a credencial que não vê inquilinos'],
]);

const TOCA_NA_BASE = ['@bossaos/db', 'obterPrisma', 'obterBase', 'comEscopo'];
const ATRAVESSA_A_PORTA = ['resolverPedido', 'actorDoPedido', 'comEscopoDoPedido'];

function ficheirosDaWeb(): string[] {
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

function semPorta(): string[] {
  const maus: string[] = [];
  for (const ficheiro of ficheirosDaWeb()) {
    const relativo = relative(WEB, ficheiro);
    if (EXCEPCOES.has(relativo)) continue;
    const conteudo = readFileSync(ficheiro, 'utf8');
    const toca = TOCA_NA_BASE.some((m) => conteudo.includes(m));
    if (!toca) continue;
    const atravessa = ATRAVESSA_A_PORTA.some((m) => conteudo.includes(m));
    if (!atravessa) maus.push(relativo);
  }
  return maus;
}

describe('rotas: dados de inquilino só através da porta', () => {
  it('nenhuma rota toca na base sem resolver a sessão', () => {
    const maus = semPorta();
    assert.deepEqual(
      maus,
      [],
      'estas rotas usam a base sem passar por resolverPedido/actorDoPedido:\n' + maus.join('\n'),
    );
  });

  it('as rotas que existem passam mesmo pela porta — e são mais do que zero', () => {
    // Sem isto, o teste acima passaria num repositório sem rota nenhuma.
    const comBase = ficheirosDaWeb().filter((f) => {
      const rel = relative(WEB, f);
      if (EXCEPCOES.has(rel)) return false;
      return TOCA_NA_BASE.some((m) => readFileSync(f, 'utf8').includes(m));
    });
    assert.ok(comBase.length >= 4, `só ${comBase.length} rotas tocam na base — a varredura partiu-se?`);
  });

  it('cada excepção aponta a um ficheiro que existe e faz o que diz', () => {
    for (const [caminho, razao] of EXCEPCOES) {
      const completo = join(WEB, caminho);
      assert.doesNotThrow(() => statSync(completo), `excepção para ficheiro inexistente: ${caminho}`);
      assert.ok(razao.length > 20, `a excepção de ${caminho} precisa de uma razão escrita`);
    }
    // Uma excepção a mais é uma porta a mais: obriga a olhar.
    assert.equal(EXCEPCOES.size, 4, 'cada excepção nova tem de ser justificada aqui');
  });

  it('CONTROLO NEGATIVO: a varredura distingue mesmo com porta de sem porta', () => {
    const todos = ficheirosDaWeb();
    assert.ok(todos.length >= 10, `só ${todos.length} ficheiros`);

    const marcas = readFileSync(join(WEB, 'app/api/org/[orgSlug]/marcas/[id]/route.ts'), 'utf8');
    assert.ok(TOCA_NA_BASE.some((m) => marcas.includes(m)), 'a rota de marcas toca mesmo na base');
    assert.ok(ATRAVESSA_A_PORTA.some((m) => marcas.includes(m)), 'e atravessa mesmo a porta');
  });
});
