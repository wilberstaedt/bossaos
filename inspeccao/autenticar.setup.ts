import { expect, test as preparar } from '@playwright/test';
import { Client } from 'pg';
import {
  EMAIL_DO_ARNES, EMAIL_DO_ARNES_B, EMAIL_DO_ARNES_C,
  FICHEIRO_DE_SESSAO, FICHEIRO_DE_SESSAO_B, FICHEIRO_DE_SESSAO_C,
} from './caminhos.ts';

/**
 * A sessão do arnês do navegador — e porque é que ela custou a existir.
 *
 * ── O que estava a bloquear ────────────────────────────────────────────────
 *
 * Doze das vinte e nove telas do E10 vivem atrás de sessão, e o arnês não sabia
 * entrar. Ficava a mesma escolha do E09: ou se declarava a dívida de móvel para
 * doze telas novas — que é o que a régua do E10 existe para impedir —, ou se
 * ensinava o arnês a entrar.
 *
 * As cinco telas internas que o E09 deixou por medir (CHAN-001, QR-001, QR-003,
 * QR-004, REP-001) estavam bloqueadas pela mesma coisa, e saem daqui juntas.
 *
 * ── A sessão é REAL, não simulada ─────────────────────────────────────────
 *
 * O contrato reprova «dependência externa simulada». Por isso não se forja um
 * cookie: regista-se uma conta pela porta que o produto usa, e o cookie é o que
 * a biblioteca de autenticação emitir. É o mesmo caminho que a prova de acesso
 * do E04 faz por HTTP.
 *
 * O que **é** feito por SQL é a pertença e o papel — como na prova do E04, pela
 * mesma razão: o caminho de convidar alguém tem prova própria, e refazê-lo aqui
 * mediria o convite em vez de medir as telas.
 *
 * ── E o registo espera pelo limitador em vez de o desligar ────────────────
 *
 * A protecção contra abuso na autenticação devolve 429 ao fim de alguns
 * registos seguidos, e é suposto estar lá. Desligá-la para o arnês passar seria
 * apagar um requisito para chegar ao verde.
 */

const SENHA = 'inspeccao-Muito-Longa-2026';
const ORG_A = '11111111-1111-4111-8111-111111111111';
const MARCA_A = 'aaaa1111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';
const MARCA_B = 'bbbb2222-2222-4222-8222-222222222222';

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Entra (ou inscreve-se e entra), dá pertença e papel, e guarda a sessão.
 *
 * É uma função e não duas cópias: as duas contas fazem exactamente o mesmo com
 * organizações diferentes, e duas cópias divergem no dia em que uma delas ganhar
 * um passo — com o sintoma a aparecer só numa das duas.
 */
async function abrirSessao(
  pedido: import('@playwright/test').APIRequestContext,
  baseURL: string,
  email: string,
  organizationId: string,
  brandId: string,
  ficheiro: string,
  paraAbrir: string,
): Promise<void> {
  // Tentar entrar PRIMEIRO faz a segunda passagem não gastar uma inscrição.
  //
  // ── O 429 valia para as TRÊS chamadas, e só a do meio o tratava ──────────
  //
  // A inscrição já esperava pelo limitador; as duas ENTRADAS não. E foi numa
  // entrada que a CI falhou a 04/09: «entrada de painel-b@inspeccao.example
  // falhou: 429».
  //
  // A aritmética, medida no better-auth 1.7.2 e não suposta: a regra de
  // `/sign-in*` e `/sign-up*` é **3 pedidos por janela de 10 segundos**
  // (`dist/api/rate-limiter/index.mjs:305-308`). Uma sessão gasta até três —
  // entrar, inscrever, entrar — e desde que a prova de isolamento trouxe o
  // inquilino B são duas sessões seguidas: o quarto pedido apanha o limitador.
  //
  // A saída NÃO é desligar o limitador nos testes. Ele só liga em produção
  // (`enabled: options.rateLimit?.enabled ?? isProduction`) e o arnês corre
  // contra o build de produção de propósito — é a versão que vai para a rua.
  // Desligá-lo tirava da medição uma protecção real, que é exactamente a
  // conveniência que o marco E11 existe para apanhar.
  //
  // Espera fixa acima da janela, e não escalonada, pela razão que já estava
  // escrita aqui: escalonar torna o arranque imprevisível.
  const entrar = async () => {
    let r;
    for (let tentativa = 0; tentativa < 6; tentativa++) {
      r = await pedido.post('/api/auth/sign-in/email', {
        data: { email, password: SENHA }, headers: { origin: baseURL },
      });
      if (r.status() !== 429) break;
      await dormir(11_000);
    }
    return r!;
  };

  let entrou = await entrar();

  if (!entrou.ok()) {
    let inscricao;
    for (let tentativa = 0; tentativa < 6; tentativa++) {
      inscricao = await pedido.post('/api/auth/sign-up/email', {
        data: { email, password: SENHA, name: 'Inspeccao' }, headers: { origin: baseURL },
      });
      if (inscricao.status() !== 429) break;
      // Espera fixa, acima da janela do limitador. Escalonar torna o arranque
      // imprevisível, e foi isso que fez a prova de acesso exceder dez minutos.
      await dormir(11_000);
    }
    expect(inscricao?.ok(), `inscrição de ${email} falhou: ${inscricao?.status()}`).toBeTruthy();
    entrou = await entrar();
  }
  expect(entrou.ok(), `entrada de ${email} falhou: ${entrou.status()}`).toBeTruthy();

  const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  expect(url, 'MIGRATION_DATABASE_URL em falta').toBeTruthy();
  const sql = new Client({ connectionString: url });
  await sql.connect();
  try {
    const { rows } = await sql.query('SELECT id FROM users WHERE email = $1', [email]);
    const userId = (rows[0] as { id: string } | undefined)?.id;
    expect(userId, `a conta ${email} não ficou na base depois da inscrição`).toBeTruthy();

    // A pertença e o papel por SQL, como na prova de acesso do E04 e pela mesma
    // razão: convidar tem prova própria, e refazê-lo aqui mediria o convite.
    await sql.query(
      `INSERT INTO memberships (id, organization_id, user_id, estado, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'ACTIVO', now())
       ON CONFLICT (organization_id, user_id) DO UPDATE SET estado = 'ACTIVO', updated_at = now()`,
      [organizationId, userId],
    );
    const { rows: filiacao } = await sql.query(
      'SELECT id FROM memberships WHERE organization_id = $1 AND user_id = $2',
      [organizationId, userId]);
    // ── SEM `brand_id`, e isto custou uma medição para descobrir ──────────
    //
    // A primeira versão concedia OWNER com a marca preenchida, como as fixtures
    // fazem. O resultado: `/organization` devolvia **404 ao próprio dono**, e
    // durante alguns minutos eu julguei ter encontrado um defeito de produto.
    //
    // Não era. `alcanca()` diz, por escrito, que uma concessão de MARCA não
    // alcança um recurso da ORGANIZAÇÃO — e a porta que o produto usa para criar
    // um dono (`criar_organizacao_com_dono`, na migração do E06) insere sem
    // `brand_id`, ou seja, com âmbito de organização inteira.
    //
    // O arnês tem de imitar o produto, não as fixtures. Uma sessão com menos
    // alcance do que a real mede telas que o utilizador verdadeiro nunca vê — e
    // teria feito eu reportar como avaria uma coisa que só estava mal semeada.
    void brandId;
    await sql.query(
      `INSERT INTO role_assignments (id, organization_id, membership_id, papel, updated_at)
       SELECT gen_random_uuid(), $1, $2, 'OWNER', now()
       WHERE NOT EXISTS (
         SELECT 1 FROM role_assignments WHERE organization_id = $1 AND membership_id = $2)`,
      [organizationId, (filiacao[0] as { id: string }).id],
    );
    // ── Acesso de plataforma, só para a conta de A ────────────────────────
    //
    // Seis das 66 telas da dívida são a superfície interna de plataforma
    // (PLAT-002 a 011). Sem esta linha, a medição delas mede a RECUSA — que está
    // certa e não é a tela — e as seis ficariam verdes sobre o ecrã errado.
    //
    // `platform_staff` é escrita só pela credencial de migração, e o runtime nem
    // `SELECT` tem nela: é a decisão do E05 e continua inteira. O arnês escreve
    // pela mesma porta que o `scripts/plataforma.mjs` usa.
    if (organizationId === ORG_A) {
      await sql.query(
        `INSERT INTO platform_staff (user_id, motivo)
         SELECT $1, 'arnes de inspeccao: medir as telas PLAT em movel'
         WHERE NOT EXISTS (SELECT 1 FROM platform_staff WHERE user_id = $1)`,
        [userId],
      );
    }
  } finally {
    await sql.end();
  }

  // E confirma que a sessão SERVE mesmo. Guardar um cookie que não abre nada é o
  // "verde sobre nada" desta etapa: a preparação passava, e as telas mediam
  // todas o ecrã de entrada.
  const painel = await pedido.get(paraAbrir);
  expect(painel.status(), `a sessão de ${email} não abre ${paraAbrir}`).toBeLessThan(400);
  expect(painel.url(), 'a sessão foi desviada para a entrada').not.toContain('/auth/');

  await pedido.storageState({ path: ficheiro });
}

preparar('a sessão do painel, no inquilino A', async ({ request, baseURL }) => {
  preparar.setTimeout(120_000);
  await abrirSessao(
    request, baseURL ?? '', EMAIL_DO_ARNES, ORG_A, MARCA_A, FICHEIRO_DE_SESSAO,
    '/es-ES/app/marina-oropesa/puerto/website',
  );
});

preparar('e a sessão do inquilino B, que é o que dá sentido à recusa', async ({ playwright, baseURL }) => {
  preparar.setTimeout(120_000);
  // Contexto de pedidos PRÓPRIO: partilhar o do teste anterior traria os cookies
  // de A, e as duas sessões acabariam a ser a mesma. O sintoma seria a prova de
  // isolamento a passar por A conseguir ver tudo.
  const pedido = await playwright.request.newContext({ baseURL: baseURL ?? '' });
  try {
    await abrirSessao(
      pedido, baseURL ?? '', EMAIL_DO_ARNES_B, ORG_B, MARCA_B, FICHEIRO_DE_SESSAO_B,
      // A unidade de B: é o recurso que a prova de isolamento vai pedir pelas duas
      // sessões, e é aqui que se confirma que esta sessão abre mesmo alguma coisa.
      '/es-ES/app/marina-barcelona/organization/unidades/bbbb2222-2222-4222-8222-333333333333',
    );
  } finally {
    await pedido.dispose();
  }
});

preparar('e uma SEGUNDA pessoa no inquilino A, que é o que mede a troca de utilizador', async ({
  playwright, baseURL,
}) => {
  preparar.setTimeout(120_000);
  // ── Porque é que a conta B não servia para isto ─────────────────────────
  //
  // B vive noutra organização. A troca A→B mede a partição por **inquilino** — e
  // uma fila particionada só por inquilino passava esse caso e continuava a
  // mandar os rascunhos de A com a sessão de B **na mesma unidade**, que é
  // exactamente o cenário que decide o desenho do `offline-e-fila-local.md`.
  //
  // Esta conta muda **uma coisa só**: a pessoa. Mesma organização, mesma
  // unidade. É a única forma de a partição por utilizador ser medida no produto
  // em vez de só na lógica.
  const pedido = await playwright.request.newContext({ baseURL: baseURL ?? '' });
  try {
    await abrirSessao(
      pedido, baseURL ?? '', EMAIL_DO_ARNES_C, ORG_A, MARCA_A, FICHEIRO_DE_SESSAO_C,
      '/es-ES/app/marina-oropesa/puerto/website',
    );
  } finally {
    await pedido.dispose();
  }
});
