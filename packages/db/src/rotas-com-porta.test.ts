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
  [
    'app/api/convites/[token]/route.ts',
    'leitura de um convite antes de haver conta: a credencial é o token, ' +
      'e sem ela a tela AUTH-006 pediria para aceitar às cegas',
  ],
]);

/**
 * A carta pública (E09) — a segunda forma de excepção, e mais apertada.
 *
 * Estas rotas **não têm sessão por definição**: um cliente com o telemóvel na
 * mesa não entrou em lado nenhum. Pô-las na lista de cima seria dizer "confia",
 * e uma excepção sem verificação é uma porta.
 *
 * Por isso a excepção não as liberta: **troca a exigência**. Em vez de
 * `resolverPedido`, exige-se que só cheguem à base pelas três portas estreitas
 * do público — que são funções `SECURITY DEFINER` que devolvem apenas o que está
 * publicado, e não aceitam um identificador de organização.
 *
 * O efeito prático: uma rota pública que amanhã importe `comEscopo` ou
 * `obterPrisma` para fazer uma consulta própria fica **vermelha**. É a mesma
 * distinção do E04 — não se verifica que a autorização está certa, verifica-se
 * que ela existe.
 */
const PORTAS_DO_PUBLICO = ['cartaPublica', 'horarioPublico', 'registarConsulta', 'abertoAgora'];
const SO_PELO_PUBLICO = /^app\/r\//;
/** O que uma rota pública NÃO pode tocar: são os caminhos que exigem inquilino. */
const PROIBIDO_NO_PUBLICO = ['comEscopo', 'comIdentidade', 'obterPrisma'];

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
    const relativo = relative(WEB, ficheiro).split('\\').join('/');
    if (EXCEPCOES.has(relativo)) continue;
    const conteudo = readFileSync(ficheiro, 'utf8');
    const toca = TOCA_NA_BASE.some((m) => conteudo.includes(m));
    if (!toca) continue;

    if (SO_PELO_PUBLICO.test(relativo)) {
      // Não têm sessão; têm de ir pelas portas estreitas e por mais nada.
      const pelasPortas = PORTAS_DO_PUBLICO.some((m) => conteudo.includes(m));
      const pelaPortaErrada = PROIBIDO_NO_PUBLICO.some((m) => conteudo.includes(m));
      if (!pelasPortas || pelaPortaErrada) maus.push(relativo);
      continue;
    }

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
    assert.equal(EXCEPCOES.size, 5, 'cada excepção nova tem de ser justificada aqui');
  });

  it('a rota sem sessão valida mesmo o token — a excepção não é um cheque em branco', () => {
    // Isentar uma rota da porta não a isenta de ter uma credencial. Aqui a
    // credencial é o token do convite, e a rota tem de o resolver pela interface
    // mínima (`organizacao_do_convite`) antes de ler o que quer que seja.
    const conteudo = readFileSync(join(WEB, 'app/api/convites/[token]/route.ts'), 'utf8');
    assert.ok(
      conteudo.includes('organizacaoDoConvite'),
      'a leitura do convite tem de passar pela interface mínima do token',
    );
    assert.ok(
      conteudo.includes('comEscopo('),
      'e o resto tem de ser lido com escopo de inquilino, com a política activa',
    );
    // E não pode devolver o email convidado: daria a qualquer portador do link
    // o endereço de outra pessoa.
    const devolve = conteudo.slice(conteudo.lastIndexOf('NextResponse.json({'));
    assert.ok(!/\bemail\b/.test(devolve), 'a resposta não pode incluir o email convidado');
  });

  it('CONTROLO NEGATIVO: a varredura distingue mesmo com porta de sem porta', () => {
    const todos = ficheirosDaWeb();
    assert.ok(todos.length >= 10, `só ${todos.length} ficheiros`);

    const marcas = readFileSync(join(WEB, 'app/api/org/[orgSlug]/marcas/[id]/route.ts'), 'utf8');
    assert.ok(TOCA_NA_BASE.some((m) => marcas.includes(m)), 'a rota de marcas toca mesmo na base');
    assert.ok(ATRAVESSA_A_PORTA.some((m) => marcas.includes(m)), 'e atravessa mesmo a porta');
  });
});

describe('a carta pública tem a sua própria exigência, não uma dispensa', () => {
  it('as rotas de /r/ chegam à base pelas portas estreitas', () => {
    // Se a excepção fosse uma dispensa, bastava uma rota pública nova para
    // aparecer uma consulta directa a `menu_revisions` sem filtro de publicação.
    const publicas = ficheirosDaWeb()
      .map((f) => relative(WEB, f).split('\\').join('/'))
      .filter((f) => SO_PELO_PUBLICO.test(f));
    assert.ok(publicas.length > 0, 'não havia rotas públicas para medir');
    for (const f of publicas) {
      const conteudo = readFileSync(join(WEB, f), 'utf8');
      if (!TOCA_NA_BASE.some((m) => conteudo.includes(m))) continue;
      assert.ok(
        PORTAS_DO_PUBLICO.some((m) => conteudo.includes(m)),
        `${f}: toca na base sem passar por uma porta pública`,
      );
      for (const proibido of PROIBIDO_NO_PUBLICO) {
        assert.ok(
          !conteudo.includes(proibido),
          `${f}: usa \`${proibido}\`, que exige inquilino e não existe num pedido público`,
        );
      }
    }
  });
});
