import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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

/** Uma leitura SEM sessão nenhuma — o que um estranho vê. */
async function verComoEstranho(caminho: string) {
  const r = await fetch(`${BASE}${caminho}`);
  return { estado: r.status, texto: await r.text() };
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();

  // A conta é criada pela porta do produto. O limitador de abuso é respeitado —
  // desligá-lo para a prova passar seria apagar um requisito para chegar ao verde.
  let inscricao: Response | undefined;
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    inscricao = await fetch(`${BASE}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: BASE },
      body: JSON.stringify({ email: EMAIL, password: SENHA, name: 'Jornada' }),
    });
    if (inscricao.status !== 429) break;
    await dormir(11_000);
  }
  assert.ok(inscricao?.ok, `inscrição falhou: ${inscricao?.status}`);
  cookie = (inscricao.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  assert.ok(cookie, 'a inscrição não devolveu sessão');
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
        '--quota', '1',
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
