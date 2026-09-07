import { Client } from 'pg';
import { expect, test, type Page } from '@playwright/test';
// Ao módulo do domínio por caminho relativo: o `inspeccao/` não tem o pacote
// `@bossaos/domain` nas suas dependências, e a alternativa era ler a lista da
// tabela `allergens` — que é a CÓPIA na base, não a fonte. Se as duas
// divergirem, quero que esta prova siga a fonte e a divergência apareça.
import { ALERGENIOS_UE } from '../packages/domain/src/alergenios.ts';

/**
 * O caso extremo dos alérgenos, medido onde alguém o lê para decidir se come.
 *
 * ── O achado RV100-022 ────────────────────────────────────────────────────
 *
 * O §9.2 manda testar alérgenos e modificadores extensos, e o caso extremo
 * nunca foi renderizado. O domínio prova-o (`revisaoDaFicha` com a lista
 * completa), mas a interface nunca viu mais de um punhado: na base semeada, o
 * máximo declarado por prato é **um**.
 *
 * ── E são CATORZE, não treze ──────────────────────────────────────────────
 *
 * O `ALERGENIOS_UE` tem catorze entradas, que é o número do regulamento da UE.
 * Esta prova não fixa o número: conta o que o domínio diz, e se a lista crescer
 * a medição cresce com ela. Um número copiado à mão é um número que apodrece.
 *
 * ── Na CARTA PÚBLICA, e não no catálogo interno ───────────────────────────
 *
 * São superfícies diferentes com utilizadores diferentes. O ecrã que decide se
 * alguém come é o que o cliente lê, e é esse que se mede: a rota
 * `/r/[publicLocationSlug]/[locale]/menu/produto/[produtoId]`.
 *
 * ── O que se perde quando o cartão fica ilegível ──────────────────────────
 *
 * A regra do produto é que **NÃO DECLARADO não é NÃO CONTÉM**: a página lista só
 * o que foi declarado, e a nota diz ao cliente para perguntar à equipa. Um
 * cartão com catorze linhas que fique ilegível não perde só estética — perde a
 * distinção entre «contém» e «ninguém sabe». Por isso a nota é medida como
 * conteúdo obrigatório, e não como enfeite: se ela desaparecer ou for cortada,
 * é falha.
 */

const LARGURAS = [360, 390, 768, 1280, 1440];
const ALVO_DE_TOQUE = 44; // px, WCAG 2.2 2.5.8
const TEXTO_MINIMO = 12; // px: abaixo disto não é uma escolha de desenho

/** Estados reais, alternados: o caso extremo não é catorze «contém». */
const ESTADOS = ['CONTEM', 'PODE_CONTER', 'NAO_CONTEM'] as const;

interface Alvo { slug: string; produtoId: string; produtoNome: string }

async function comBase<T>(f: (sql: Client) => Promise<T>): Promise<T> {
  const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('MIGRATION_DATABASE_URL em falta');
  const sql = new Client({ connectionString: url });
  await sql.connect();
  try { return await f(sql); } finally { await sql.end(); }
}

/**
 * A unidade publicada e um prato da carta dela.
 *
 * Dizem de que casa são, como a `validar-alvos-com-casa` exige: com duas casas
 * na base, um `LIKE 'insp-%'` sozinho pode devolver a carta da demonstração.
 */
const ORG_A = '11111111-1111-4111-8111-111111111111';

async function alvoDaCarta(sql: Client): Promise<Alvo> {
  const { rows } = await sql.query(`
    SELECT l.public_slug AS slug, p.id AS produto, p.nome AS nome
      FROM locations l
      JOIN menus m           ON m.location_id = l.id AND m.organization_id = l.organization_id
      JOIN menu_categories mc ON mc.menu_id = m.id
      JOIN categories c       ON c.id = mc.category_id
      JOIN products p         ON p.category_id = c.id AND p.organization_id = l.organization_id
     WHERE l.organization_id = '${ORG_A}'
       AND l.public_slug IS NOT NULL
       AND l.archived_at IS NULL
     ORDER BY p.nome
     LIMIT 1`);
  const r = rows[0];
  if (!r) {
    throw new Error(
      'POPULACAO-ZERO: nenhuma unidade publicada com prato na carta. '
      + 'A semente publica `insp-marina-oropesa` na unidade `puerto` — corre o `arnes-pronto.sh`.',
    );
  }
  return { slug: String(r.slug), produtoId: String(r.produto), produtoNome: String(r.nome) };
}

/**
 * Declara os catorze no prato — na REVISÃO PUBLICADA, que é o que o cliente lê.
 *
 * ── O que eu estava a fazer errado, e o controlo negativo apanhou-o ────────
 *
 * A primeira versão escrevia em `product_allergens` e media a carta. Verde. Mas
 * o controlo negativo — declarar só quatro — continuou verde, e foi aí que se
 * viu: **a carta pública serve uma REVISÃO PUBLICADA**, um instantâneo em JSON
 * (`publico_carta` devolve `conteudo` e `revision_id`). Escrever nas linhas
 * vivas não muda uma vírgula do que a página mostra até alguém republicar.
 *
 * E o instantâneo já traz os catorze, com `DESCONHECIDO` nos não declarados —
 * é assim que o produto cumpre «não declarado não é não contém». Por isso
 * contar LINHAS dá catorze sempre, e o que distingue o caso extremo é quantas
 * trazem um estado DECLARADO. No instantâneo semeado, uma.
 *
 * O que isto faz: publica uma revisão nova com os catorze declarados, e repõe
 * a publicação na revisão anterior no fim, apagando a que criou.
 */
async function publicarComOsCatorze(sql: Client, slug: string): Promise<{
  produtoId: string; produtoNome: string; desfazer: () => Promise<void>;
}> {
  const { rows: pub } = await sql.query(`
    SELECT mp.id AS pub, mp.revision_id AS antiga, mr.menu_id, mr.numero, mr.organization_id,
           mr.conteudo::text AS conteudo
      FROM locations l
      JOIN menus m            ON m.location_id = l.id
      JOIN menu_publications mp ON mp.menu_id = m.id
      JOIN menu_revisions mr   ON mr.id = mp.revision_id
     WHERE l.public_slug = $1 AND l.organization_id = '${ORG_A}'`, [slug]);
  if (pub.length === 0) {
    throw new Error('POPULACAO-ZERO: a unidade publicada não tem revisão publicada — corre o `arnes-pronto.sh`.');
  }
  const base = pub[0];
  const conteudo = JSON.parse(String(base.conteudo)) as Array<{
    productId: string; nome: string;
    alergenos?: Array<{ codigo: string; estado: string }>;
    alergenosPorDeclarar?: string[];
  }>;
  const primeiro = conteudo[0];
  if (!primeiro) throw new Error('POPULACAO-ZERO: a revisão publicada não tem um único produto');

  // Os catorze DECLARADOS, com estados alternados: o caso extremo não é catorze
  // «contém» — é catorze linhas que dizem coisas diferentes, que é o que enche
  // a cápsula de texto e estica o cartão.
  primeiro.alergenos = ALERGENIOS_UE.map((codigo, i) => ({
    codigo, estado: ESTADOS[i % ESTADOS.length] as string,
  }));
  // O instantâneo guarda as duas metades. Declarar os catorze e deixar a lista
  // do «por declarar» cheia seria escrever um estado que o produto não pode ter.
  primeiro.alergenosPorDeclarar = [];

  const { rows: nova } = await sql.query(`
    INSERT INTO menu_revisions (id, organization_id, menu_id, numero, conteudo, criada_por, created_at)
    VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, 'rv100-022@inspeccao.example', now())
    RETURNING id`,
  [base.organization_id, base.menu_id, Number(base.numero) + 1000, JSON.stringify(conteudo)]);
  const novaId = String(nova[0].id);

  const { rows: apontavam } = await sql.query(
    'SELECT id FROM menu_publications WHERE revision_id = $1', [base.antiga]);
  await sql.query('UPDATE menu_publications SET revision_id = $1 WHERE revision_id = $2',
    [novaId, base.antiga]);

  return {
    // O id vem do INSTANTÂNEO e não da base viva: é o produto que eu editei, e
    // a carta pública resolve o endereço pelo que está publicado. A chave
    // chama-se `productId` — usei `id` à primeira e a carta deu 404.
    produtoId: String(primeiro.productId),
    produtoNome: String(primeiro.nome),
    desfazer: async () => {
      for (const a of apontavam) {
        await sql.query('UPDATE menu_publications SET revision_id = $1 WHERE id = $2', [base.antiga, a.id]);
      }
      await sql.query('DELETE FROM menu_revisions WHERE id = $1', [novaId]);
    },
  };
}

interface Leitura {
  linhas: number;
  declarados: number;
  semEstado: number;
  transbordos: string[];
  alvosPequenos: string[];
  alvosDaPagina: string[];
  textoMiudo: string[];
  temNota: boolean;
  notaCortada: boolean;
}

/** O que a página mostra, medido na caixa e não no HTML. */
async function lerCartao(page: Page, alvoDeToque: number, textoMinimo: number): Promise<Leitura> {
  return page.evaluate(([toque, minimo]) => {
    const escondido = (el: HTMLElement): boolean => {
      for (let n: HTMLElement | null = el; n && n !== document.documentElement; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.visibility === 'hidden' || s.display === 'none' || s.opacity === '0') return true;
        const b = n.getBoundingClientRect();
        if ((b.width <= 1 || b.height <= 1) && /hidden|clip/.test(`${s.overflowX}${s.overflowY}`)) return true;
      }
      return false;
    };
    const cortado = (el: HTMLElement): number => {
      const caixa = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      let excesso = /hidden|clip/.test(s.overflowX) ? el.scrollWidth - el.clientWidth : 0;
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        if (a.clientWidth === 0) continue;
        const sa = getComputedStyle(a);
        if (/auto|scroll/.test(sa.overflowX)) return excesso;
        if (/hidden|clip/.test(sa.overflowX)) {
          const ca = a.getBoundingClientRect();
          const borda = parseFloat(sa.borderLeftWidth) || 0;
          excesso = Math.max(excesso, Math.round(caixa.right - (ca.left + borda + a.clientWidth)));
          break;
        }
      }
      return Math.max(excesso, Math.round(caixa.right - document.documentElement.clientWidth));
    };

    const lista = document.querySelector('ul.bo-publico__alergenos');
    const itens = lista ? Array.from(lista.querySelectorAll<HTMLElement>(':scope > li')) : [];

    const transbordos: string[] = [];
    const textoMiudo: string[] = [];
    let semEstado = 0;
    let declarados = 0;
    for (const li of itens) {
      const nome = (li.querySelector('span')?.textContent ?? '').trim();
      // ── Contar o FACTO, e não a etiqueta HTML ─────────────────────────
      //
      // A primeira versão procurava «um filho que não seja SPAN» para achar o
      // estado. O `Etiqueta` renderiza um `<span>`: a regra nunca encontrava
      // nada e acusou catorze linhas de não terem o estado escrito, em cinco
      // larguras, quando o estado está lá em todas. O que interessa é que a
      // linha diga DUAS coisas — o nome e o estado —, e é isso que se conta.
      const comTexto = Array.from(li.children)
        .filter((c) => (c.textContent ?? '').trim().length > 0);
      if (comTexto.length < 2) semEstado += 1;

      // ── Catorze LINHAS não é catorze DECLARADOS ────────────────────────
      //
      // A página lista sempre os catorze e marca como desconhecidos os que
      // ninguém declarou — é assim que ela cumpre «não declarado não é não
      // contém». Portanto contar linhas dá catorze SEMPRE, e um detector que
      // contasse linhas passava com quatro declarados: foi o que o meu fez, e
      // o controlo negativo apanhou-o. O que distingue é o tom da cápsula:
      // `bo-etiqueta` sozinha é neutra (ninguém declarou), com modificador é
      // uma declaração real.
      const capsula = li.querySelector('.bo-etiqueta');
      if (capsula && /bo-etiqueta--/.test(capsula.className)) declarados += 1;
      for (const parte of Array.from(li.querySelectorAll<HTMLElement>('*'))) {
        if (parte.children.length > 0 || escondido(parte)) continue;
        const excesso = cortado(parte);
        if (excesso > 1) transbordos.push(`«${(parte.textContent ?? '').trim().slice(0, 24)}» +${excesso}px`);
        const tamanho = parseFloat(getComputedStyle(parte).fontSize) || 0;
        if (tamanho > 0 && tamanho < minimo) textoMiudo.push(`«${nome}» a ${tamanho}px`);
      }
    }

    // ── Alvos: os do cartão reprovam, os da página declaram-se ────────────
    //
    // Esta prova é sobre o caso extremo dos alérgenos. Um alvo pequeno DENTRO do
    // cartão é o defeito que ela persegue; um alvo pequeno no cabeçalho da
    // página é um achado verdadeiro e de outra dona — e reprovar por ele fazia
    // esta guarda nascer vermelha por uma razão que não é a dela. Conta-se e
    // diz-se, em vez de se esconder ou de se confundir com o alvo.
    const alvosPequenos: string[] = [];
    const alvosDaPagina: string[] = [];
    const seccao = lista?.closest('section') ?? null;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('a[href], button'))) {
      if (escondido(el)) continue;
      const c = el.getBoundingClientRect();
      if (c.width >= toque && c.height >= toque) continue;
      const etiqueta = `${el.tagName}«${(el.textContent ?? '').trim().slice(0, 20)}» ${Math.round(c.width)}×${Math.round(c.height)}`;
      if (seccao?.contains(el)) alvosPequenos.push(etiqueta);
      else alvosDaPagina.push(etiqueta);
    }

    const nota = document.querySelector<HTMLElement>('p.bo-publico__aviso');
    return {
      linhas: itens.length,
      declarados,
      semEstado,
      transbordos,
      alvosPequenos,
      alvosDaPagina,
      textoMiudo,
      temNota: Boolean(nota && (nota.textContent ?? '').trim().length > 0),
      notaCortada: nota ? cortado(nota) > 1 : false,
    };
  }, [alvoDeToque, textoMinimo] as [number, number]);
}

test.describe('Alérgenos: o caso extremo, na carta que o cliente lê', () => {
  test('os catorze cabem, lêem-se, e a nota continua lá — nas cinco larguras', async ({ page }) => {
    test.setTimeout(600_000);

    await comBase(async (sql) => {
      const alvo = await alvoDaCarta(sql);
      const { produtoId, produtoNome, desfazer } = await publicarComOsCatorze(sql, alvo.slug);
      try {
        const falhas: string[] = [];
        const daPagina = new Set<string>();
        let ultimoDeclarados = 0;
        let medidas = 0;

        for (const largura of LARGURAS) {
          await page.setViewportSize({ width: largura, height: 900 });
          const resposta = await page.goto(
            `/r/${alvo.slug}/es-ES/menu/produto/${produtoId}`,
            { waitUntil: 'domcontentloaded' },
          );
          expect(resposta?.status(), `POPULACAO-ZERO: a carta pública devolveu ${resposta?.status()} a ${largura}px`)
            .toBe(200);

          const l = await lerCartao(page, ALVO_DE_TOQUE, TEXTO_MINIMO);
          medidas += 1;
          ultimoDeclarados = l.declarados;

          // ── A armadilha nomeada: quatro não provam nada sobre catorze ────
          if (l.linhas !== ALERGENIOS_UE.length) {
            falhas.push(`${largura}px · a carta mostra ${l.linhas} linhas e a lista do domínio tem ${ALERGENIOS_UE.length}`);
          }
          if (l.declarados !== ALERGENIOS_UE.length) {
            falhas.push(`${largura}px · ${l.declarados} de ${ALERGENIOS_UE.length} com estado DECLARADO — o resto ficou neutro`);
          }
          if (l.semEstado > 0) {
            falhas.push(`${largura}px · ${l.semEstado} linha(s) sem o estado escrito — fica a cor a dizer sozinha`);
          }
          for (const t of l.transbordos.slice(0, 4)) falhas.push(`${largura}px · cortado: ${t}`);
          for (const t of l.textoMiudo.slice(0, 3)) falhas.push(`${largura}px · miúdo: ${t}`);
          for (const a of l.alvosPequenos.slice(0, 3)) falhas.push(`${largura}px · alvo pequeno no cartão: ${a}`);
          for (const a of l.alvosDaPagina) daPagina.add(`${largura}px · ${a}`);

          // ── E a distinção que se perde em silêncio ───────────────────────
          if (!l.temNota) falhas.push(`${largura}px · a nota «pergunte à equipa» desapareceu`);
          if (l.notaCortada) falhas.push(`${largura}px · a nota «pergunte à equipa» está cortada`);
        }

        console.log(
          `AMBITO alergenios=${ALERGENIOS_UE.length} larguras=${medidas} falhas=${falhas.length} declarados=${ultimoDeclarados}`
          + ` alvosDaPagina=${daPagina.size} prato="${produtoNome}" slug="${alvo.slug}"`,
        );
        for (const a of daPagina) console.log(`ALVO-DA-PAGINA ${a}`);
        expect(medidas, 'POPULACAO-ZERO: nenhuma largura foi medida').toBe(LARGURAS.length);
        expect(falhas, `o caso extremo dos alérgenos não aguenta:\n${falhas.join('\n')}`).toEqual([]);
      } finally {
        await desfazer();
      }
    });
  });

  test('SONDA: o contador conta, e não se contenta com «alguns»', async ({ page }) => {
    // ── A armadilha nomeada, do outro lado ──────────────────────────────────
    //
    // Um detector que dissesse «há alérgenos na página» passaria com quatro e
    // passaria com catorze, e era exactamente esse o buraco: a interface nunca
    // viu mais de um punhado e ninguém deu por isso. O que se prova aqui é que
    // o contador devolve o NÚMERO — planta-se catorze e exige-se catorze,
    // planta-se quatro e exige-se quatro.
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/en');
    await page.waitForLoadState('domcontentloaded');

    const contar = async (quantos: number) => {
      await page.evaluate((n) => {
        document.querySelector('ul.bo-publico__alergenos')?.remove();
        const ul = document.createElement('ul');
        ul.className = 'bo-publico__alergenos';
        for (let i = 0; i < n; i++) {
          const li = document.createElement('li');
          li.innerHTML = `<span>alergénio ${i}</span><em>contém</em>`;
          ul.append(li);
        }
        document.body.append(ul);
      }, quantos);
      return (await lerCartao(page, ALVO_DE_TOQUE, TEXTO_MINIMO)).linhas;
    };

    expect(await contar(ALERGENIOS_UE.length), 'SONDA: plantei catorze e o contador não viu catorze')
      .toBe(ALERGENIOS_UE.length);
    expect(await contar(4), 'SONDA: plantei quatro e o contador não viu quatro — não conta, só detecta presença')
      .toBe(4);

    console.log('SONDA-ACENDEU contador-de-alergenios');
  });

  test('SONDA: o detector vê um cartão cortado e a nota em falta', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 });
    await page.goto('/en');
    await page.waitForLoadState('domcontentloaded');

    const l = await page.evaluate(async () => {
      document.querySelector('ul.bo-publico__alergenos')?.remove();
      const caixa = document.createElement('div');
      caixa.style.cssText = 'width:60px;overflow:hidden';
      const ul = document.createElement('ul');
      ul.className = 'bo-publico__alergenos';
      const li = document.createElement('li');
      li.innerHTML = '<span>frutos de casca rija e sementes de sésamo</span><em>contém</em>';
      ul.append(li);
      caixa.append(ul);
      document.body.append(caixa);
      return true;
    });
    expect(l).toBe(true);

    const leitura = await lerCartao(page, ALVO_DE_TOQUE, TEXTO_MINIMO);
    expect(leitura.transbordos.length, 'SONDA: um nome de alérgeno cortado a 60px não foi visto — o detector do corte está cego')
      .toBeGreaterThan(0);
    expect(leitura.temNota, 'SONDA: a nota não existe nesta página e o detector diz que existe')
      .toBe(false);

    console.log('SONDA-ACENDEU corte-e-nota');
  });
});
