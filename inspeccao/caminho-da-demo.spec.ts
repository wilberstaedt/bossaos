import { expect, test } from '@playwright/test';
import { Client } from 'pg';

/**
 * O CAMINHO DA DEMONSTRAÇÃO — a régua de `docs/reviews/ALVO-CAMINHO-DA-DEMO.md`.
 *
 * ── O critério que manda aqui ─────────────────────────────────────────────
 *
 * *«Cinco páginas a dar 200 não provam um caminho, porque o caminho tem um POST
 * no meio e é aí que ele parte.»* Por isso o centro desta prova não são as
 * rotas: é a **volta inteira** — submeter, chegar ao obrigado, e **confirmar na
 * base que o registo ficou**. A régua reprova explicitamente o contrário:
 * agradecer sem ter guardado é pior do que um erro, porque o prospecto vai
 * embora a pensar que alguém o vai contactar.
 *
 * O runtime **não tem `SELECT`** em `demo_requests` — a migração faz `REVOKE
 * ALL … FROM bossaos_app`, de propósito. A confirmação usa a ligação de
 * migração, só para ler, e é essa a razão de ela aparecer numa prova.
 */

const IDIOMAS = ['es-ES', 'pt-BR', 'en'] as const;
const DESTINOS = ['/demo', '/faq', '/plans', '/product', '/trust'] as const;
const CONTROLO = '/pt-BR/naoexiste';

/** Bastidores que já apanhámos noutras telas e que aqui seriam fatais. */
const BASTIDORES: [string, RegExp][] = [
  ['correio técnico', /@bossaos\.invalid|@inspeccao\.example|@exemplo\.example/],
  ['bloco de depuração', /Not sent:|DEBUG|console\.log/],
  ['chave de tradução crua', /\b(mkt|publico|painel|comum)[A-Z]?\d*\.[a-z][A-Za-z0-9]+\b/],
];

test.describe('O caminho da demonstração', () => {
  test('a volta inteira, e o POST que é onde ele parte', async ({ page }) => {
    test.setTimeout(900_000);
    const falhas: string[] = [];
    let medidas = 0;

    // ── 1 · Os cinco destinos, nas três línguas ──────────────────────────
    for (const idioma of IDIOMAS) {
      for (const d of DESTINOS) {
        const rota = `/${idioma}${d}`;
        const r = await page.goto(rota, { waitUntil: 'domcontentloaded' });
        medidas += 1;
        if (r?.status() !== 200) {
          falhas.push(`DESTINO ${rota} deu ${r?.status()}`);
          continue;
        }
        if (!new URL(page.url()).pathname.startsWith(`/${idioma}`)) {
          falhas.push(`DESTINO ${rota} saiu do idioma para ${page.url()}`);
        }
        // ── 3 · Nada de bastidores no que ele vê ────────────────────────
        const visivel = await page.locator('body').innerText();
        for (const [nome, re] of BASTIDORES) {
          const m = visivel.match(re);
          if (m) falhas.push(`BASTIDOR ${rota} · ${nome}: «${m[0]}»`);
        }
      }
    }
    const ctl = await page.request.get(CONTROLO);
    console.log(`CONTROLO ${CONTROLO} -> ${ctl.status()}`);

    // ── 2 · A volta inteira: submeter, agradecer, E TER FICADO ───────────
    //
    // A marca é única por corrida: sem ela a confirmação leria a linha de uma
    // corrida anterior e ficava verde sem esta ter gravado nada.
    const marca = `caminho-${Date.now()}@bossaos.invalid`;
    await page.goto('/es-ES/demo', { waitUntil: 'domcontentloaded' });
    await page.fill('#nome', 'Inspeccao do caminho');
    await page.fill('#email', marca);
    await page.fill('#restaurante', 'Casa da Inspeccao');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('domcontentloaded');
    const caminhoFinal = new URL(page.url()).pathname;
    console.log(`ENVIO caminho=${caminhoFinal}`);
    if (!caminhoFinal.endsWith('/demo/thanks')) {
      falhas.push(`ENVIO válido não chegou ao obrigado: ${caminhoFinal}`);
    }

    const ligacao = process.env.MIGRATION_DATABASE_URL;
    if (!ligacao) {
      // Pendência declarada, não simulação: sem a ligação privilegiada esta
      // prova NÃO sabe se o registo ficou, e dizer que sabe seria o defeito.
      falhas.push('NAO-MEDI: sem MIGRATION_DATABASE_URL não se confirma o registo');
    } else {
      const cliente = new Client({ connectionString: ligacao });
      await cliente.connect();
      try {
        const q = await cliente.query('SELECT nome, restaurante FROM demo_requests WHERE email = $1', [marca]);
        console.log(`REGISTO linhas=${q.rowCount} nome=${q.rows[0]?.nome ?? '(nenhuma)'}`);
        if (q.rowCount !== 1) {
          falhas.push(`AGRADECER-POR-NADA: o obrigado apareceu e há ${q.rowCount} registos para ${marca}`);
        }
        // Controlo da própria consulta: se ela disser «sim» a um endereço que
        // nunca foi submetido, o «sim» de cima não valia nada.
        const nunca = await cliente.query(
          'SELECT 1 FROM demo_requests WHERE email = $1', [`nunca-submetido-${Date.now()}@bossaos.invalid`]);
        console.log(`CONTROLO-CONSULTA linhas=${nunca.rowCount}`);
        expect(nunca.rowCount, 'CONSULTA-CEGA: encontrou o que nunca foi submetido').toBe(0);
      } finally { await cliente.end(); }
    }

    // ── A1 · A recusa devolve o que a pessoa escreveu ────────────────────
    //
    // `joao@gmail` é o caso REAL e não um forjado: o `type="email"` do
    // navegador ACEITA-o (tem arroba e domínio) e o servidor recusa-o, porque
    // o padrão exige um ponto no domínio. Quem se esquece do `.com` cai aqui —
    // e, antes desta correcção, perdia os cinco campos de uma vez.
    const escrito = {
      nome: 'Joao da Silva', email: 'joao@gmail',
      restaurante: 'Tasca do Joao', telefone: '+34 600 111 222',
      mensagem: 'Somos dois turnos e queremos ver o KDS a funcionar.',
    };
    await page.goto('/es-ES/demo', { waitUntil: 'domcontentloaded' });
    for (const [campo, valor] of Object.entries(escrito)) await page.fill(`#${campo}`, valor);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('domcontentloaded');
    const urlRecusa = new URL(page.url());
    console.log(`RECUSA erro=${urlRecusa.searchParams.get('erro') ?? '(nenhum)'}`);
    if (urlRecusa.searchParams.get('erro') !== 'campos') {
      // Se a validação nativa travar o envio, este caso deixa de ser
      // alcançável e a prova não mede nada — tem de o dizer, não passar.
      falhas.push(`POPULACAO-ZERO: a recusa não aconteceu (${urlRecusa.search || 'sem erro'})`);
    }
    for (const [campo, valor] of Object.entries(escrito)) {
      const devolvido = await page.inputValue(`#${campo}`);
      console.log(`REPOSTO ${campo}=«${devolvido}»`);
      if (devolvido !== valor) {
        falhas.push(`PERDEU ${campo}: escreveu «${valor}» e voltou «${devolvido}»`);
      }
    }

    console.log(`AMBITO destinos=${medidas} falhas=${falhas.length}`);
    for (const f of falhas) console.log(`FALHA ${f}`);

    expect(medidas, 'POPULACAO-ZERO: nenhum destino medido').toBe(IDIOMAS.length * DESTINOS.length);
    expect(ctl.status(), 'CONTROLO-CEGO: uma rota inventada não deu 404').toBe(404);
    expect(falhas, `o caminho da demonstração está partido:\n${falhas.join('\n')}`).toEqual([]);
  });
});
