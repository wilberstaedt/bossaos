import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { Client } from 'pg';

/**
 * A JORNADA — J01, J02 e J11, de ponta a ponta.
 *
 * ── Porque é que isto não existia, e porque é que faltava ─────────────────
 *
 * A revisão do marco E11 reprovou o aceite 1 com uma contagem:
 *
 * > *«11 das 13 provas partem de fixtures, e as inspecções visitam páginas uma a
 * > uma. Cada passo está provado a partir de estado preparado. Nenhuma prova
 * > encadeia dois passos.»*
 *
 * E a razão, que é o que interessa: **provar a peça não prova o caminho.** Cada
 * segmento pode estar certo e o produto ser inutilizável se o estado que o passo
 * N *produz* não for o que o passo N+1 *aceita*. Uma unidade que nasce com moeda
 * por configurar, um menu sem secções, um endereço público ainda nulo — tudo isso
 * passa nas provas de segmento, porque a fixture entrega o estado já bom.
 *
 * O marco chama-se **primeiro marco utilizável**, e é esta a diferença entre
 * «todas as telas funcionam» e «alguém consegue usar isto».
 *
 * ── Como esta prova evita ser mais uma prova de segmento ──────────────────
 *
 * 1. **Parte de uma organização que não existe.** Nada aqui usa as fixtures: a
 *    conta é nova, a organização é nova, e o `slug` leva a marca do relógio.
 * 2. **Cria tudo pelas portas que uma pessoa usa** — os mesmos `POST` de
 *    formulário que os ecrãs submetem, com os mesmos bytes que um navegador
 *    envia. Nenhuma escrita passa por dentro da base.
 * 3. **Os identificadores vêm do REDIRECCIONAMENTO do produto**, que é o que o
 *    navegador segue. Ler um id da base a meio seria voltar a preparar estado.
 * 4. **Termina fora da sessão**: a carta e o site são pedidos como um estranho os
 *    pede, sem cookie nenhum.
 */

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3013';
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!MIG) throw new Error('MIGRATION_DATABASE_URL em falta');

const marca = Date.now();
const SENHA = 'jornada-Muito-Longa-2026';
const EMAIL = `jornada-${marca}@jornada.example`;
/** Quem opera a plataforma. Uma pessoa, com nome — «ana@…» e não «suporte@…». */
const OPERADOR = `ana-${marca}@jornada.example`;
const ORG_SLUG = `jornada-${marca}`;
const SLUG_PUBLICO = `jornada-${marca}`;

let sql: Client;
let cookie = '';

/** O que a jornada foi criando, sempre a partir do que o produto devolveu. */
const feito: Record<string, string> = {};

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Um `POST` de formulário, com os mesmos bytes que o navegador envia.
 *
 * `redirect: 'manual'` porque é o **destino** que carrega a informação: os ids
 * dos objectos criados vêm no `Location`, tal como o navegador os recebe. Seguir
 * o redireccionamento perdia-os e obrigava a ir buscá-los à base.
 */
async function submeter(caminho: string, campos: Record<string, string | string[]>) {
  const corpo = new URLSearchParams();
  for (const [k, v] of Object.entries(campos)) {
    if (Array.isArray(v)) v.forEach((x) => corpo.append(k, x));
    else corpo.set(k, v);
  }
  const r = await fetch(`${BASE}${caminho}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      origin: BASE,
      ...(cookie ? { cookie } : {}),
    },
    body: corpo.toString(),
    redirect: 'manual',
  });
  const destino = r.headers.get('location') ?? '';
  return { estado: r.status, destino, procura: new URLSearchParams(destino.split('?')[1] ?? '') };
}

/** Uma leitura COM sessão — o que a pessoa vê depois de submeter. */
async function ver(caminho: string) {
  const r = await fetch(`${BASE}${caminho}`, { headers: cookie ? { cookie } : {} });
  return { estado: r.status, texto: await r.text() };
}

/**
 * O montante como o ecrã o mostra, devolvido como o formulário o aceita.
 *
 * ── E lê-se o PARÁGRAFO inteiro, não até ao primeiro `<` ────────────────
 *
 * A primeira versão parava no primeiro `<` e vinha vazia: o React separa duas
 * expressões de texto com um comentário — `>Esperado<!-- --> 108,50 €<` — e o
 * número está do outro lado dele. Media o rótulo e não o valor.
 *
 * Lê-se o que está no ecrã e devolve-se na forma que o campo aceita. Calcular
 * aqui o valor esperado seria reimplementar a regra do lado da prova — a lição
 * do E30, onde a prova passava a concordar consigo própria.
 */
function montanteDoEcra(html: string, marcador: string) {
  const bloco = html.match(new RegExp(`data-teste="${marcador}"[^>]*>([\\s\\S]*?)</p>`))?.[1] ?? '';
  const limpo = bloco.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, '');
  const numero = limpo.match(/\d+(?:[.,]\d{2})?/)?.[0] ?? '';
  return numero.replace('.', ',');
}

/** Uma leitura SEM sessão nenhuma — o que um estranho vê. */
async function verComoEstranho(caminho: string) {
  const r = await fetch(`${BASE}${caminho}`);
  return { estado: r.status, texto: await r.text() };
}

/**
 * Uma conta criada pela porta do produto. O limitador de abuso é respeitado —
 * desligá-lo para a prova passar seria apagar um requisito para chegar ao verde.
 */
async function inscrever(email: string, nome: string) {
  let inscricao: Response | undefined;
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    inscricao = await fetch(`${BASE}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: BASE },
      body: JSON.stringify({ email, password: SENHA, name: nome }),
    });
    if (inscricao.status !== 429) break;
    await dormir(11_000);
  }
  assert.ok(inscricao?.ok, `inscrição de ${nome} falhou: ${inscricao?.status}`);
  return (inscricao.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();

  cookie = await inscrever(EMAIL, 'Jornada');
  assert.ok(cookie, 'a inscrição não devolveu sessão');

  // ── E uma PESSOA da BossaOS, porque o rasto guarda a pessoa ────────────
  //
  // Dar um plano é uma acção da plataforma, e o E33 exige que ela diga quem a
  // fez: `actor_id` e `actor_email` de uma pessoa, nunca o nome de um papel.
  // Quem opera o piloto é gente, e a jornada tem de a ter como tem tudo o
  // resto — criada pela porta do produto, e não escrita à mão na base.
  //
  // Não é a mesma conta do restaurante de propósito: uma organização a assinar
  // a própria concessão é um restaurante a dar-se um plano.
  await inscrever(OPERADOR, 'Ana da BossaOS');
});

after(async () => {
  // ── Esta prova NÃO limpa, e isso é uma decisão ────────────────────────
  //
  // A jornada cria uma organização real, e uma organização real deixa rasto em
  // `audit_events` — que é **append-only por gatilho**, para toda a gente,
  // incluindo a credencial de migração. É a decisão do E04 e está certa: um
  // registo de quem fez o quê que se possa apagar não é um registo.
  //
  // Apagar isto exige desligar o gatilho de propósito e voltar a ligá-lo, com
  // verificação de que ficou ligado. Isso é trabalho de script, não de teste: um
  // teste que morre a meio deixaria a auditoria sem protecção, e essa é
  // exactamente a classe de coisa que sobrevive a um commit distraído.
  //
  // `scripts/provar-jornada.sh` faz a limpeza, com trap e com a verificação
  // final de que o gatilho voltou.
  await sql.end();
});

// ═══════════════════════════════════════════════════════════════════════════
describe('J01 — de uma organização que NÃO EXISTE até uma unidade utilizável', () => {
  it('a organização não existe antes de a jornada começar', async () => {
    // O caso que impede a prova de medir estado herdado. Sem ele, uma passagem
    // anterior mal limpa fazia tudo o resto passar sem criar nada.
    const { rows } = await sql.query('SELECT count(*)::int AS n FROM organizations WHERE slug = $1', [ORG_SLUG]);
    assert.equal((rows[0] as { n: number }).n, 0, 'a organização já existia — a jornada não parte do zero');
  });

  it('criar a organização', async () => {
    const r = await submeter('/api/onboarding/organizacao', {
      idioma: 'es-ES', nome: `Jornada ${marca}`, slug: ORG_SLUG, chave: `org-${marca}`,
    });
    assert.equal(r.estado, 303, `esperava redireccionamento, veio ${r.estado}`);
    assert.ok(!r.procura.get('erro'), `recusou: ${r.procura.get('erro')}`);
    assert.equal(r.procura.get('org'), ORG_SLUG, 'o produto não confirmou a organização criada');
  });

  it('dar um plano à organização — e NÃO é auto-serviço', () => {
    // ── Este passo existe e não se pode saltar ────────────────────────────
    //
    // Sem plano, a criação da marca é recusada com `sem_plano` e um 402. Não é
    // defeito: o E05 decidiu que `subscriptions` é escrita só pela credencial de
    // migração — *«um catálogo comercial que o processo do restaurante reescreve
    // é um restaurante a dar-se um plano»* — e que a interface de escrita chega
    // na E33.
    //
    // Portanto a jornada percorre a porta REAL deste passo, que é o controlo de
    // plataforma auditado. Saltá-lo escrevendo na base seria a fixture a
    // preparar o meio do caminho, que é o que esta prova existe para não fazer.
    //
    // E fica dito o que isto significa para o marco: **hoje ninguém se
    // inscreve sozinho.** Uma pessoa cria a conta e a organização, e pára aqui
    // até alguém da BossaOS lhe dar um plano.
    const saida = execFileSync('node', [
      'scripts/plataforma.mjs', 'plano', ORG_SLUG, 'STARTER',
      '--por', OPERADOR,
      '--motivo', 'jornada do marco E11: o passo que hoje não é auto-serviço',
    ], { encoding: 'utf8' });
    assert.match(saida, /plano STARTER/, `o controlo de plataforma não confirmou: ${saida}`);
  });

  it('e HABILITAR o que foi contratado — porque plano não é habilitação', () => {
    // ── O passo que eu ia dar como defeito, e não é ───────────────────────
    //
    // Sem isto, criar a marca é recusado com `sem_plano`. A primeira leitura foi
    // «nenhuma organização consegue criar uma marca» — e está errada.
    //
    // A precificação di-lo por escrito: *«criar uma unidade na base NÃO é
    // contratar: a habilitação exige concessão explícita»*. E o E05 já tinha a
    // regra do lado do código: **quota por configurar significa NEGADO, não
    // ilimitado**. O produto está a cumprir as duas — recusa por ausência, que é
    // a mesma regra do alérgeno por declarar e do DNS que não responde.
    //
    // As quotas do catálogo comercial estão **declaradas como por definir** na
    // precificação. Por isso a jornada concede explicitamente, com motivo e
    // rasto, como quem fecha um contrato faria — e **não** inventa números no
    // catálogo de planos, que seria pôr política onde ainda não há decisão.
    for (const capacidade of ['marcas', 'unidades', 'produtos']) {
      const saida = execFileSync('node', [
        'scripts/plataforma.mjs', 'conceder', ORG_SLUG, capacidade,
        '--por', OPERADOR, '--quota', '1',
        '--motivo', 'jornada do marco E11: um estabelecimento contratado',
      ], { encoding: 'utf8' });
      assert.match(saida, new RegExp(capacidade), `não concedeu ${capacidade}: ${saida}`);
    }
  });

  it('criar a marca — e o id vem do redireccionamento, não da base', async () => {
    const r = await submeter(`/api/org/${ORG_SLUG}/marcas`, {
      idioma: 'es-ES', nome: 'Jornada Bistró', slug: 'jornada', chave: `marca-${marca}`,
      idiomaPrincipal: 'es-ES',
    });
    assert.ok(!r.procura.get('erro'), `recusou: ${r.procura.get('erro')}`);
    const id = r.procura.get('marca');
    assert.ok(id, `o produto não devolveu a marca criada: ${r.destino}`);
    feito.brandId = id;
  });

  it('criar a unidade, e encontrá-la onde a pessoa a encontra', async () => {
    // ── `SEM_MOEDA=1` percorre a jornada com a unidade POR CONFIGURAR ─────
    //
    // O E06 tirou `moeda` e `fuso` dos obrigatórios de propósito: exigi-los
    // obriga quem cria a arranjar um valor, e o valor que se arranja quando não
    // se sabe é o da unidade anterior. «Por configurar» é um estado que o
    // produto sabe representar — e a jornada tem de chegar ao fim com ele.
    //
    // O E06 deixa-a nascer assim de propósito — e o E07/E08 recusam publicar
    // preços numa moeda que a unidade não tem. A jornada tem de PARAR aí, com o
    // produto a dizer o que falta: é o segundo elo que a revisão do marco nomeou.
    const porConfigurar = process.env.SEM_MOEDA === '1';
    const r = await submeter(`/api/org/${ORG_SLUG}/unidades`, {
      idioma: 'es-ES', brandId: feito.brandId!, nome: 'Jornada Centro', slug: 'centro',
      ...(porConfigurar ? {} : { moeda: 'EUR', fuso: 'Europe/Madrid' }),
      chave: `unidade-${marca}`,
    });
    assert.ok(!r.procura.get('erro'), `recusou: ${r.procura.get('erro')}`);

    // Esta rota não devolve o id — a pessoa vê a unidade na LISTA. É por lá que
    // a jornada continua, e não por uma consulta à base.
    const lista = await ver(`/es-ES/app/${ORG_SLUG}/organization/unidades`);
    assert.equal(lista.estado, 200, 'a lista de unidades não abriu');
    const achado = lista.texto.match(
      new RegExp(`/es-ES/app/${ORG_SLUG}/organization/unidades/([0-9a-f-]{36})`));
    assert.ok(achado, 'a unidade criada não aparece na lista — o passo seguinte não a encontraria');
    feito.locationId = achado[1]!;
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('J02 — o catálogo, e a carta publicada', () => {
  it('criar a categoria', async () => {
    const r = await submeter(`/api/org/${ORG_SLUG}/categorias`, {
      idioma: 'es-ES', brandId: feito.brandId!, nome: 'Para compartir',
    });
    assert.ok(!r.procura.get('erro'), `recusou: ${r.procura.get('erro')}`);
    const id = r.destino.match(/categorias\/([0-9a-f-]{36})/)?.[1];
    assert.ok(id, `sem categoria no destino: ${r.destino}`);
    feito.categoryId = id;
  });

  it('criar o produto COM preço, na mesma submissão que o ecrã faz', async () => {
    const r = await submeter(`/api/org/${ORG_SLUG}/produtos`, {
      idioma: 'es-ES', brandId: feito.brandId!, categoryId: feito.categoryId!,
      nome: 'Croquetas de la casa', descricao: 'Elaboradas cada mañana.',
      montante: '8,50', moeda: 'EUR',
    });
    assert.ok(!r.procura.get('erro'), `recusou: ${r.procura.get('erro')}`);
    const id = r.destino.match(/produtos\/([0-9a-f-]{36})/)?.[1];
    assert.ok(id, `sem produto no destino: ${r.destino}`);
    feito.productId = id;
  });

  it('pôr o produto na CARTA — sem isto ele existe e não se vende', async () => {
    const r = await submeter(`/api/org/${ORG_SLUG}/produtos/${feito.productId}/canais`, {
      idioma: 'es-ES', canal: 'CARTA', visivel: '1',
    });
    assert.ok(!r.procura.get('erro'), `recusou: ${r.procura.get('erro')}`);
  });

  it('ACTIVAR o produto — criar não é pôr à venda', async () => {
    // ── O elo que a jornada destapou, e que estava certo ─────────────────
    //
    // Um produto nasce em RASCUNHO, e `montarRevisao` só leva os ACTIVOS. Sem
    // este passo a carta publica-se **vazia** — e o produto recusa, com
    // `carta_vazia`, em vez de pôr uma página em branco na internet aberta.
    //
    // Nenhuma prova de segmento via isto: as fixtures criam o produto já activo.
    // É exactamente a diferença entre o estado que o passo N produz e o que o
    // passo N+1 aceita.
    //
    // A versão vem do ECRÃ, como no formulário: é o bloqueio optimista do E07, e
    // inventar um número aqui era saltar-lhe por cima.
    const ecra = await ver(`/es-ES/app/${ORG_SLUG}/catalogo/produtos/${feito.productId}`);
    assert.equal(ecra.estado, 200, 'a ficha do produto não abriu');
    const versao = ecra.texto.match(/name="versao"[^>]*value="(\d+)"/)?.[1]
      ?? ecra.texto.match(/value="(\d+)"[^>]*name="versao"/)?.[1];
    assert.ok(versao, 'a ficha não traz a versão — o formulário não conseguiria guardar');

    // ── E manda-se o formulário INTEIRO, como o ecrã manda ───────────────
    //
    // A rota tem semântica de substituição: `categoryId: textoOuNulo(...) ?? null`
    // — um campo ausente vira `null`. A primeira versão desta jornada mandou só
    // `nome` e `estado`, e o produto ficou SEM CATEGORIA; a carta publicou-se
    // vazia e o motivo estava três passos atrás.
    //
    // Não é defeito da rota — o ecrã rende todos os campos e submete-os todos —,
    // mas é uma aresta afiada: qualquer submissão parcial apaga o resto. Fica
    // dito aqui porque foi isto que me custou duas passagens a perceber.
    const r = await submeter(`/api/org/${ORG_SLUG}/produtos/${feito.productId}`, {
      idioma: 'es-ES', nome: 'Croquetas de la casa',
      descricao: 'Elaboradas cada mañana.', categoryId: feito.categoryId!,
      estado: 'ACTIVO', versao,
    });
    assert.ok(!r.procura.get('erro'), `recusou: ${r.procura.get('erro')}`);
  });

  it('criar o menu COM a secção dentro', async () => {
    // Um menu vazio existe na lista, faz o item do arranque ficar verde, e não
    // pode ser publicado — a pessoa só descobre isso três ecrãs depois. É
    // exactamente o elo que esta jornada existe para exercer.
    const r = await submeter(`/api/org/${ORG_SLUG}/menus`, {
      idioma: 'es-ES', brandId: feito.brandId!, nome: 'Carta', juntar: [feito.categoryId!],
    });
    assert.ok(!r.procura.get('erro'), `recusou: ${r.procura.get('erro')}`);
    const id = r.destino.match(/menus\/([0-9a-f-]{36})/)?.[1];
    assert.ok(id, `sem menu no destino: ${r.destino}`);
    feito.menuId = id;
  });

  it('dar endereço público à unidade', async () => {
    const r = await submeter(
      `/api/org/${ORG_SLUG}/unidades/${feito.locationId}/endereco-publico`,
      { idioma: 'es-ES', locationSlug: 'centro', publicSlug: SLUG_PUBLICO },
    );
    assert.ok(!r.procura.get('erro'), `recusou: ${r.procura.get('erro')}`);
  });

  it('publicar a carta', async () => {
    const r = await submeter(`/api/org/${ORG_SLUG}/menus/${feito.menuId}/publicar`, {
      idioma: 'es-ES', canal: 'CARTA', locationId: feito.locationId!,
    });
    if (r.procura.get('erro')) {
      // ── Uma recusa que não diz o motivo obriga a adivinhar ──────────────
      //
      // A rota redirecciona com `erro=bloqueado` e mais nada — o motivo está no
      // ecrã de destino, e daqui não se vê. Em vez de adivinhar, a prova vai
      // buscar o estado que decide a publicação e diz o que encontrou.
      // O produto ESCREVE os bloqueios na auditoria. Lê-se de lá, em vez de os
      // deduzir: é a diferença entre dizer o motivo e adivinhá-lo.
      const { rows } = await sql.query(`
        SELECT detalhe FROM audit_events
         WHERE accao = 'menu.publicacao.bloqueada'
         ORDER BY created_at DESC LIMIT 1`);
      const { rows: estado } = await sql.query(`
        SELECT p.nome, p.estado, p.category_id IS NOT NULL AS tem_categoria,
               (SELECT count(*) FROM product_channels pc
                 WHERE pc.product_id = p.id AND pc.canal = 'CARTA' AND pc.visivel) AS na_carta,
               (SELECT count(*) FROM menu_categories mc
                 WHERE mc.menu_id = $1 AND mc.category_id = p.category_id) AS na_seccao
          FROM products p WHERE p.id = $2`, [feito.menuId, feito.productId]);
      assert.fail(
        `publicação bloqueada. Registado: ${JSON.stringify(rows[0]?.detalhe ?? 'nada')}` +
        ` · estado do produto: ${JSON.stringify(estado)}`,
      );
    }
    assert.equal(r.procura.get('publicado'), '1');
  });

  it('E UM ESTRANHO VÊ A CARTA — sem sessão, no endereço público', async () => {
    // O fim da corrente. Tudo o que veio antes foi feito com sessão; isto é
    // pedido como o cliente do restaurante o pede.
    const carta = await verComoEstranho(`/r/${SLUG_PUBLICO}/es-ES/menu`);
    assert.equal(carta.estado, 200, 'a carta pública não responde no fim da jornada');
    assert.ok(carta.texto.includes('Croquetas de la casa'),
      'a carta responde e não traz o produto que a jornada criou');
    assert.ok(carta.texto.includes('Jornada Centro'), 'a carta não traz a unidade');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('J11 — o site do restaurante, publicado', () => {
  it('escrever a página de início', async () => {
    const r = await submeter(`/api/org/${ORG_SLUG}/site/pagina`, {
      idioma: 'es-ES', locationSlug: 'centro', tipo: 'INICIO', seccao: '/inicio',
      titulo: 'Bienvenidos a Jornada Centro', corpo: 'Cocina de mercado, cada día.',
      visivel: '1',
    });
    assert.ok(!r.procura.get('erro'), `recusou: ${r.procura.get('erro')}`);
  });

  it('publicar o site', async () => {
    const r = await submeter(`/api/org/${ORG_SLUG}/site/publicar`, {
      idioma: 'es-ES', locationSlug: 'centro', accao: 'publicar',
    });
    assert.ok(!r.procura.get('erro'), `bloqueado: ${r.procura.get('erro')}`);
    assert.ok(r.procura.get('publicado'), 'o produto não confirmou a publicação');
  });

  it('E UM ESTRANHO VÊ O SITE — a corrente inteira, ponta a ponta', async () => {
    const site = await verComoEstranho(`/r/${SLUG_PUBLICO}/es-ES`);
    assert.equal(site.estado, 200, 'o site público não responde no fim da jornada');
    assert.ok(site.texto.includes('Bienvenidos a Jornada Centro'),
      'o site responde e não traz o que a jornada escreveu');
  });

  it('e o rascunho continua a não ser o público', async () => {
    // O aceite 1 do E10, agora medido dentro de uma jornada real e não sobre
    // fixtures: guardar não publica.
    await submeter(`/api/org/${ORG_SLUG}/site/pagina`, {
      idioma: 'es-ES', locationSlug: 'centro', tipo: 'INICIO', seccao: '/inicio',
      titulo: 'RASCUNHO QUE NAO PODE SAIR', corpo: 'x', visivel: '1',
    });
    const site = await verComoEstranho(`/r/${SLUG_PUBLICO}/es-ES`);
    assert.ok(!site.texto.includes('RASCUNHO QUE NAO PODE SAIR'),
      'o rascunho saiu para o público dentro da jornada');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('J09 — a caixa de um serviço: abrir, movimentar, contar, reconciliar, ENCERRAR', () => {
  /**
   * ── Porque é que esta jornada faltava, e porque é que é ela a primeira ───
   *
   * Há **182 casos** a provar segmentos destas jornadas — contas 39, plataforma
   * 31, mais-tarde 26, integrações 23, caixa 22, catálogo 21, fiscal 20 — e
   * **zero a percorrê-las**. E os dois defeitos que apareceram na noite de 06/09
   * vivem nas juntas: o fecho de caixa duplo é o **último passo desta jornada**.
   *
   * Uma prova de segmento não pode ver uma junta, por construção: a fixture
   * entrega ao passo N+1 o estado que o passo N devia ter produzido, e é
   * exactamente aí que o produto se parte.
   *
   * ── E esta corre em cima do que J01 e J02 deixaram ──────────────────────
   *
   * A unidade, a marca e o produto vêm dos passos anteriores desta mesma
   * corrida. Abrir aqui uma unidade nova seria preparar estado a meio — a
   * prática que descaracteriza uma jornada e que a `validar-jornada.sh` mede.
   */


  it('abrir a caixa do serviço', async () => {
    const r = await submeter(`/api/org/${ORG_SLUG}/tpv`, {
      idioma: 'es-ES', locationId: feito.locationId!, accao: 'abrir_caixa',
      nome: `Caja ${marca}`, fundo: '100,00',
    });
    assert.ok(!r.procura.get('erro'), `recusou: ${r.procura.get('erro')}`);
    const id = r.destino.match(/caixa\/([0-9a-f-]{36})/)?.[1];
    assert.ok(id, `o produto não devolveu a caixa aberta: ${r.destino}`);
    feito.registerId = id;
  });

  it('uma venda ao balcão paga em dinheiro — e o dinheiro ENTRA na gaveta', async () => {
    const conta = await submeter(`/api/org/${ORG_SLUG}/tpv`, {
      idioma: 'es-ES', locationId: feito.locationId!, accao: 'abrir_conta',
      nome: 'Croquetas de la casa', valor: '8,50',
    });
    assert.ok(!conta.procura.get('erro'), `recusou a conta: ${conta.procura.get('erro')}`);
    const billId = conta.destino.match(/conta\/([0-9a-f-]{36})/)?.[1];
    assert.ok(billId, `sem conta no destino: ${conta.destino}`);
    feito.billDinheiro = billId;

    const pago = await submeter(`/api/org/${ORG_SLUG}/tpv`, {
      idioma: 'es-ES', locationId: feito.locationId!, accao: 'pagar_dinheiro',
      billId, cobrar: '8,50', recebido: '10,00',
    });
    assert.ok(!pago.procura.get('erro'), `recusou o pagamento: ${pago.procura.get('erro')}`);

    // ── E a junta mede-se AQUI ──────────────────────────────────────────
    //
    // Pagar em dinheiro e o dinheiro entrar na gaveta são dois factos, e é o
    // segundo que a caixa vê. Uma prova de segmento do pagamento fica verde sem
    // este passo nunca ter acontecido.
    const fecho = await ver(`/es-ES/pos/${feito.locationId}/caixa/${feito.registerId}/fecho`);
    assert.equal(fecho.estado, 200, 'o ecrã de fecho não abriu');
    assert.equal(montanteDoEcra(fecho.texto, 'esperado'), '108,50',
      'o pagamento em dinheiro não chegou à gaveta — a venda existe e a caixa não a viu. '
      + `Ecrã: ${fecho.texto.match(/data-teste="esperado"[\s\S]{0,80}/)?.[0] ?? 'sem marcador'}`);
  });

  it('uma saída de caixa, com motivo', async () => {
    const r = await submeter(`/api/org/${ORG_SLUG}/tpv`, {
      idioma: 'es-ES', locationId: feito.locationId!, accao: 'movimentar',
      registerId: feito.registerId!, tipo: 'SAIDA', valor: '5,00',
      motivo: 'troco para o turno da noite',
    });
    assert.ok(!r.procura.get('erro'), `recusou: ${r.procura.get('erro')}`);
  });

  it('um cartão que fica POR RECONCILIAR — e o id vem do ecrã', async () => {
    const conta = await submeter(`/api/org/${ORG_SLUG}/tpv`, {
      idioma: 'es-ES', locationId: feito.locationId!, accao: 'abrir_conta',
      nome: 'Menú del día', valor: '14,00',
    });
    const billId = conta.destino.match(/conta\/([0-9a-f-]{36})/)?.[1];
    assert.ok(billId, `sem conta no destino: ${conta.destino}`);
    feito.billCartao = billId;

    const tentativa = await submeter(`/api/org/${ORG_SLUG}/tpv`, {
      idioma: 'es-ES', locationId: feito.locationId!, accao: 'cobrar_cartao', billId,
    });
    assert.ok(!tentativa.procura.get('erro'), `recusou: ${tentativa.procura.get('erro')}`);

    const ecra = await ver(`/es-ES/pos/${feito.locationId}/conta/${billId}`);
    assert.equal(ecra.estado, 200, 'o ecrã da conta não abriu');
    assert.ok(ecra.texto.includes('data-teste="por-reconciliar"'),
      'a conta não avisa que há uma tentativa por reconciliar');
    const attemptId = ecra.texto.match(/name="attemptId" value="([0-9a-f-]{36})"/)?.[1];
    assert.ok(attemptId, 'o ecrã não oferece a porta de reconciliação — não há por onde sair');
    feito.attemptId = attemptId;
  });

  it('contar a gaveta — e o valor esperado vem do ECRÃ, não de uma conta minha', async () => {
    // ── SEM_CONTAGEM=1 percorre a jornada SEM este passo ────────────────
    //
    // É o elo partido desta jornada, e parte-se onde dói: fechar sem contar. O
    // fecho tem de PARAR aí e o motivo tem de NOMEAR a contagem — uma paragem
    // que não diz o que falta é um beco, e quem está ao balcão às duas da manhã
    // não tem como adivinhar.
    if (process.env.SEM_CONTAGEM === '1') return;

    const antes = await ver(`/es-ES/pos/${feito.locationId}/caixa/${feito.registerId}/fecho`);
    const esperado = montanteDoEcra(antes.texto, 'esperado');
    assert.equal(esperado, '103,50', 'a saída de caixa não desceu o esperado');

    const r = await submeter(`/api/org/${ORG_SLUG}/tpv`, {
      idioma: 'es-ES', locationId: feito.locationId!, accao: 'contar',
      registerId: feito.registerId!, contado: esperado,
    });
    assert.ok(!r.procura.get('erro'), `recusou a contagem: ${r.procura.get('erro')}`);
  });

  it('o fecho RECUSA enquanto houver operação por reconciliar', async () => {
    // A junta entre a conta e a caixa: um cartão em aberto NOUTRA conta impede
    // encerrar o turno. Nenhuma prova de segmento da caixa via isto, porque a
    // fixture da caixa não tem contas com tentativas.
    const r = await submeter(`/api/org/${ORG_SLUG}/tpv`, {
      idioma: 'es-ES', locationId: feito.locationId!, accao: 'fechar_caixa',
      registerId: feito.registerId!,
    });
    assert.equal(r.procura.get('erro'), 'OPERACOES_PENDENTES',
      `o fecho não recusou pelo motivo certo — veio «${r.procura.get('erro')}»`);
  });

  it('reconciliar a tentativa — o acto que a tira do indeterminado', async () => {
    const r = await submeter(`/api/org/${ORG_SLUG}/tpv`, {
      idioma: 'es-ES', locationId: feito.locationId!, accao: 'reconciliar',
      billId: feito.billCartao!, attemptId: feito.attemptId!, resultado: 'CANCELADA',
    });
    assert.ok(!r.procura.get('erro'), `recusou: ${r.procura.get('erro')}`);
  });

  it('E A CAIXA ENCERRA — o turno fecha', async () => {
    const r = await submeter(`/api/org/${ORG_SLUG}/tpv`, {
      idioma: 'es-ES', locationId: feito.locationId!, accao: 'fechar_caixa',
      registerId: feito.registerId!,
    });
    assert.ok(!r.procura.get('erro'), `o fecho recusou: ${r.procura.get('erro')}`);

    const fecho = await ver(`/es-ES/pos/${feito.locationId}/caixa/${feito.registerId}/fecho`);
    assert.ok(/data-teste="estado-caixa"[^>]*>FECHADA/.test(fecho.texto),
      'o ecrã não mostra a caixa fechada depois de a fechar');
  });

  it('e fechar OUTRA VEZ é recusado — a junta que ontem deixava passar', async () => {
    // O defeito de 06/09, agora dentro da corrente: ontem entravam DOIS eventos
    // de FECHO, que são duas contagens e duas decisões de autorização de
    // divergência tomadas em separado.
    const r = await submeter(`/api/org/${ORG_SLUG}/tpv`, {
      idioma: 'es-ES', locationId: feito.locationId!, accao: 'fechar_caixa',
      registerId: feito.registerId!,
    });
    assert.ok(r.procura.get('erro'), 'o segundo fecho foi aceite');

    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM cash_register_events
        WHERE register_id = $1 AND tipo = 'FECHO'`, [feito.registerId]);
    assert.equal((rows[0] as { n: number }).n, 1,
      'a caixa fechou duas vezes dentro da jornada');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('J14 — a integração falha: preservar o facto, sinalizar, reprocessar SEM duplicar e reconciliar', () => {
  /**
   * ── A frase do critério, e onde ela se joga ─────────────────────────────
   *
   * «J14 · Integração falha · Preservar facto, sinalizar, reprocessar sem
   * duplicar e reconciliar.» O sítio é a porta do adquirente: a única do sistema
   * onde alguém de fora afirma que **dinheiro entrou**, e a única sem sessão —
   * o que autoriza é a assinatura.
   *
   * ── E era uma porta que ninguém tinha aberto de ponta a ponta ───────────
   *
   * `WEBHOOK_SEGREDO_*` não estava definido em lado nenhum do repositório: a
   * prova do E23 chama `receberWebhook` por dentro, e a rota HTTP — assinatura,
   * cabeçalho da organização, corpo cru, reconciliação na mesma transacção —
   * não era percorrida por ninguém. É outra vez a peça contra o caminho.
   */
  const SEGREDO = process.env.WEBHOOK_SEGREDO_JORNADA ?? '';
  const PROVEDOR = 'jornada';
  const CAPTURA = `captura-${marca}`;
  const DEVOLUCAO = `devolucao-${marca}`;

  /**
   * ── A ALAVANCA: o adquirente reenvia com identidade NOVA ────────────────
   *
   * `REENVIO_COM_IDENTIDADE_NOVA=1` faz o reenvio trazer outro `eventoId` para
   * o MESMO facto — um provedor que não preserva a identidade do acontecimento.
   * É o elo desta jornada, e parte-se onde dói: a identidade é a única coisa que
   * impede o reprocessamento de duplicar.
   *
   * E dói mais na DEVOLUÇÃO do que na captura, por uma assimetria que está no
   * `estadoAutorizado`: o capturado é uma **atribuição** (`= montante`, o último
   * carimbo manda) e o devolvido é uma **soma** (`+=`, porque devoluções
   * parciais acumulam). A soma está certa — e faz da identidade a única defesa
   * do lado do dinheiro que sai.
   */
  const identidade = (original: string) =>
    process.env.REENVIO_COM_IDENTIDADE_NOVA === '1' ? `${original}-reenvio` : original;

  // ── E a alavanca aponta à DEVOLUÇÃO, não à captura ──────────────────────
  //
  // Na captura, um reenvio com identidade nova mete um facto a mais no ecrã e o
  // dinheiro não muda: o `capturadoMenor` é uma ATRIBUIÇÃO, o último carimbo
  // manda. Parava a jornada, e parava antes de chegar ao sítio onde dói.
  //
  // Na devolução o `devolvidoMenor` é uma SOMA — e a chave idempotente do
  // reembolso inclui o montante. Identidade nova leva o devolvido de 40,00 a
  // 80,00, a chave muda, e nasce um SEGUNDO reembolso. É dinheiro a sair duas
  // vezes por causa de um reenvio, e é isso que o elo tem de mostrar.
  const identidadeDaCaptura = (original: string) => original;

  /**
   * O adquirente bate à porta como bate a sério: corpo **cru** e HMAC por cima
   * desse mesmo texto. Assinar um objecto reconvertido para JSON daria outra
   * ordem de chaves e outro espaçamento — e a assinatura nunca bateria, ou pior,
   * bateria sobre outra coisa. É a razão pela qual a rota lê `.text()`.
   */
  async function adquirenteDiz(facto: Record<string, unknown>) {
    const cru = JSON.stringify(facto);
    const r = await fetch(`${BASE}/api/webhooks/pagamentos/${PROVEDOR}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-bossaos-organizacao': feito.organizationId!,
        'x-bossaos-assinatura': createHmac('sha256', SEGREDO).update(cru, 'utf8').digest('hex'),
      },
      body: cru,
    });
    // ── Lê-se TEXTO e só depois se tenta o JSON ──────────────────────────
    //
    // Com `r.json()` directo, uma resposta vazia rebenta com «Unexpected end of
    // JSON input» e a prova morre a dizer que o JSON estava mal formado — não
    // que a porta devolveu **500 com o corpo vazio**. O diagnóstico ficava
    // escondido atrás do leitor.
    const texto = await r.text();
    let corpo: { recebido?: boolean; repetido?: boolean; erro?: string } = {};
    try { corpo = JSON.parse(texto) as typeof corpo; } catch { /* fica vazio */ }
    return { estado: r.status, texto, corpo };
  }

  /** Quantos acontecimentos do adquirente a CONTA mostra a quem a abre. */
  const acontecimentosNoEcra = (html: string) =>
    (html.match(/data-teste="estado-provedor"/g) ?? []).length;

  it('a organização tem de ser descoberta na BASE — e isso é um buraco declarado', async () => {
    // ── O único valor desta jornada que o produto não sabe dizer ──────────
    //
    // O webhook exige o cabeçalho `x-bossaos-organizacao`, e **nenhum ecrã
    // mostra o identificador da organização**: procurei por `name="organizationId"`
    // e por marcador de teste, e não existe em lado nenhum. Quem configura o
    // adquirente não tem onde ir buscar o valor que ele tem de enviar.
    //
    // Somado ao `WEBHOOK_SEGREDO_*` que ninguém define, isto quer dizer que a
    // integração de pagamentos **não é configurável hoje** — numa jornada que se
    // chama «a integração falha». Fica como pendência declarada, e este caso
    // existe para que ela não passe despercebida: o dia em que o produto expuser
    // o identificador, este passo é o que se apaga.
    const { rows } = await sql.query(
      'SELECT id FROM organizations WHERE slug = $1', [ORG_SLUG]);
    const id = (rows[0] as { id: string } | undefined)?.id;
    assert.ok(id, 'a organização da jornada desapareceu');
    feito.organizationId = id;

    const ecra = await ver(`/es-ES/pos/${feito.locationId}/pagamentos`);
    assert.equal(ecra.estado, 200, 'o ecrã do adquirente não abriu');
    assert.ok(!ecra.texto.includes(id),
      'o ecrã já mostra o identificador da organização — este passo deixou de fazer sentido');
  });

  it('a porta exige assinatura — e não diz porque recusou', async () => {
    // A fechadura primeiro. Sem isto, tudo o que vem a seguir podia estar a ser
    // feito por qualquer pessoa que saiba o endereço.
    const r = await fetch(`${BASE}/api/webhooks/pagamentos/${PROVEDOR}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-bossaos-organizacao': feito.organizationId!,
        'x-bossaos-assinatura': 'ff'.repeat(32),
      },
      body: JSON.stringify({ eventoId: 'nao-entra', tipo: 'captura' }),
    });
    assert.equal(r.status, 401, 'a porta aceitou uma assinatura forjada');
    assert.equal((await r.json() as { erro?: string }).erro, 'nao_autorizado',
      'a recusa explica o que faltou — e isso é um manual de como a forjar');
  });

  it('uma conta por cartão, e a tentativa fica SINALIZADA', async () => {
    const conta = await submeter(`/api/org/${ORG_SLUG}/tpv`, {
      idioma: 'es-ES', locationId: feito.locationId!, accao: 'abrir_conta',
      nome: 'Cena para dos', valor: '40,00',
    });
    const billId = conta.destino.match(/conta\/([0-9a-f-]{36})/)?.[1];
    assert.ok(billId, `sem conta no destino: ${conta.destino}`);
    feito.billJ14 = billId;

    await submeter(`/api/org/${ORG_SLUG}/tpv`, {
      idioma: 'es-ES', locationId: feito.locationId!, accao: 'cobrar_cartao', billId,
    });
    const ecra = await ver(`/es-ES/pos/${feito.locationId}/conta/${billId}`);
    assert.ok(ecra.texto.includes('data-teste="por-reconciliar"'),
      'a conta não sinaliza a tentativa em aberto — quem está ao balcão não sabe que não pode cobrar outra vez');
    const attemptId = ecra.texto.match(/name="attemptId" value="([0-9a-f-]{36})"/)?.[1];
    assert.ok(attemptId, 'não há por onde reconciliar');
    feito.attemptJ14 = attemptId;
    assert.equal(acontecimentosNoEcra(ecra.texto), 0,
      'a conta mostra acontecimentos do adquirente antes de ele ter dito seja o que for');
  });

  it('o adquirente diz que CAPTUROU — o facto fica preservado e reconciliado', async () => {
    const r = await adquirenteDiz({
      eventoId: CAPTURA, tipo: 'pagamento.capturado', estadoProvedor: 'CAPTURADO',
      montanteMenor: 4000, attemptId: feito.attemptJ14, billId: feito.billJ14,
      ocorridoEm: new Date().toISOString(),
    });
    assert.equal(r.estado, 200, `a porta recusou o facto: ${JSON.stringify(r.corpo)}`);
    assert.equal(r.corpo.repetido, false, 'o primeiro envio veio marcado como repetido');

    const ecra = await ver(`/es-ES/pos/${feito.locationId}/conta/${feito.billJ14}`);
    assert.equal(acontecimentosNoEcra(ecra.texto), 1,
      'o que o adquirente disse não chegou ao ecrã de quem tem de reconciliar');
    assert.equal(montanteDoEcra(ecra.texto, 'pago'), '40,00',
      'a captura não virou pagamento — o facto ficou e ninguém o aplicou');
    assert.ok(!ecra.texto.includes('data-teste="por-reconciliar"'),
      'a conta continua a pedir reconciliação depois de o adquirente ter falado');
  });

  it('o adquirente REENVIA a captura — e nada duplica', async () => {
    // Um adquirente que recebe erro reenvia, e reenviar tem de ser inofensivo.
    // A garantia é o índice único sobre a identidade do acontecimento, e não um
    // «se já existe»: entre a procura e a inserção cabe o segundo processo.
    const r = await adquirenteDiz({
      eventoId: identidadeDaCaptura(CAPTURA), tipo: 'pagamento.capturado', estadoProvedor: 'CAPTURADO',
      montanteMenor: 4000, attemptId: feito.attemptJ14, billId: feito.billJ14,
      ocorridoEm: new Date().toISOString(),
    });
    assert.equal(r.estado, 200,
      `a porta respondeu ${r.estado} ao REENVIO: «${r.texto.slice(0, 120)}». `
      + 'Um adquirente que recebe erro reenvia — e um erro no reenvio é um martelo.');
    assert.equal(r.corpo.repetido, true,
      'o reenvio do MESMO facto não foi reconhecido como repetido — entrou como facto novo');

    const ecra = await ver(`/es-ES/pos/${feito.locationId}/conta/${feito.billJ14}`);
    assert.equal(acontecimentosNoEcra(ecra.texto), 1, 'o mesmo facto está duas vezes na conta');
    assert.equal(montanteDoEcra(ecra.texto, 'pago'), '40,00', 'reprocessar duplicou o dinheiro');
  });

  it('o adquirente DEVOLVE — e a devolução entra uma vez', async () => {
    const r = await adquirenteDiz({
      eventoId: DEVOLUCAO, tipo: 'pagamento.devolvido', estadoProvedor: 'DEVOLVIDO',
      montanteMenor: 4000, attemptId: feito.attemptJ14, billId: feito.billJ14,
      ocorridoEm: new Date().toISOString(),
    });
    assert.equal(r.estado, 200, `a porta recusou a devolução: ${JSON.stringify(r.corpo)}`);
    assert.equal(r.corpo.repetido, false, 'a devolução veio marcada como repetida');
    assert.deepEqual(await devolvido(), { quantas: 1, total: 4000 },
      'a devolução do adquirente não foi aplicada uma vez');
  });

  it('e o adquirente REENVIA a devolução — o dinheiro que SAI não se duplica', async () => {
    // ── O passo onde a alavanca dói a sério ──────────────────────────────
    //
    // Aqui não é só um facto a mais no ecrã: o devolvido SOMA-se, e a chave
    // idempotente do reembolso inclui o montante. Um reenvio com identidade nova
    // leva `devolvidoMenor` de 40,00 a 80,00, a chave muda, e nasce um SEGUNDO
    // reembolso. É dinheiro a sair duas vezes por causa de um reenvio.
    const r = await adquirenteDiz({
      eventoId: identidade(DEVOLUCAO), tipo: 'pagamento.devolvido', estadoProvedor: 'DEVOLVIDO',
      montanteMenor: 4000, attemptId: feito.attemptJ14, billId: feito.billJ14,
      ocorridoEm: new Date().toISOString(),
    });
    assert.equal(r.estado, 200,
      `a porta respondeu ${r.estado} ao reenvio da devolução: «${r.texto.slice(0, 120)}»`);

    // ── O DINHEIRO primeiro, e o mecanismo a seguir ───────────────────────
    //
    // A primeira versão afirmava `repetido === true` antes de contar os
    // reembolsos, e por isso a jornada parava a dizer «entrou como facto novo» —
    // verdade, e o mecanismo. O que importa a quem lê é o que aconteceu ao
    // dinheiro, e isso é a contagem: com a alavanca posta são DOIS reembolsos,
    // 120,00 sobre um pagamento de 40,00. A ordem das asserções decide qual das
    // duas frases a paragem mostra.
    assert.deepEqual(await devolvido(), { quantas: 1, total: 4000 },
      'reprocessar duplicou o dinheiro que SAI');
    assert.equal(r.corpo.repetido, true, 'o reenvio da devolução entrou como facto novo');
  });

  /** O que a base tem de reembolsos desta tentativa. Leitura de verificação. */
  async function devolvido() {
    const { rows } = await sql.query(
      `SELECT count(*)::int AS quantas, coalesce(sum(r.montante_menor), 0)::int AS total
         FROM refunds r JOIN payments p ON p.id = r.payment_id
        WHERE p.attempt_id = $1`, [feito.attemptJ14]);
    return rows[0] as { quantas: number; total: number };
  }
});
