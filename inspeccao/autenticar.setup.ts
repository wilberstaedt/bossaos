import { expect, test as preparar } from '@playwright/test';
import { Client } from 'pg';
import { EMAIL_DO_ARNES, FICHEIRO_DE_SESSAO } from './caminhos.ts';

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

const EMAIL = EMAIL_DO_ARNES;
const SENHA = 'inspeccao-Muito-Longa-2026';
const ORG_A = '11111111-1111-4111-8111-111111111111';
const MARCA_A = 'aaaa1111-1111-4111-8111-111111111111';

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

preparar('a sessão do painel', async ({ request, baseURL }) => {
  preparar.setTimeout(120_000);

  // ── Entrar, ou registar e entrar ─────────────────────────────────────────
  //
  // A ordem importa: tentar entrar primeiro faz a segunda passagem não gastar
  // uma inscrição, e é a inscrição que bate no limitador.
  let entrou = await request.post('/api/auth/sign-in/email', {
    data: { email: EMAIL, password: SENHA },
    headers: { origin: baseURL ?? '' },
  });

  if (!entrou.ok()) {
    let inscricao;
    for (let tentativa = 0; tentativa < 6; tentativa++) {
      inscricao = await request.post('/api/auth/sign-up/email', {
        data: { email: EMAIL, password: SENHA, name: 'Inspeccao' },
        headers: { origin: baseURL ?? '' },
      });
      if (inscricao.status() !== 429) break;
      // Espera fixa, acima da janela do limitador. Escalonar torna o arranque
      // imprevisível, e foi isso que fez a prova de acesso exceder dez minutos.
      await dormir(11_000);
    }
    expect(inscricao?.ok(), `inscrição falhou: ${inscricao?.status()}`).toBeTruthy();
    entrou = await request.post('/api/auth/sign-in/email', {
      data: { email: EMAIL, password: SENHA },
      headers: { origin: baseURL ?? '' },
    });
  }
  expect(entrou.ok(), `entrada falhou: ${entrou.status()}`).toBeTruthy();

  // ── A pertença e o papel, por SQL ────────────────────────────────────────
  const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  expect(url, 'MIGRATION_DATABASE_URL em falta').toBeTruthy();
  const sql = new Client({ connectionString: url });
  await sql.connect();
  try {
    const { rows } = await sql.query('SELECT id FROM users WHERE email = $1', [EMAIL]);
    const userId = (rows[0] as { id: string } | undefined)?.id;
    expect(userId, 'a conta não ficou na base depois da inscrição').toBeTruthy();

    await sql.query(
      `INSERT INTO memberships (id, organization_id, user_id, estado, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'ACTIVO', now())
       ON CONFLICT (organization_id, user_id) DO UPDATE SET estado = 'ACTIVO', updated_at = now()`,
      [ORG_A, userId],
    );
    const { rows: filiacao } = await sql.query(
      'SELECT id FROM memberships WHERE organization_id = $1 AND user_id = $2', [ORG_A, userId]);
    await sql.query(
      `INSERT INTO role_assignments (id, organization_id, membership_id, papel, brand_id, updated_at)
       SELECT gen_random_uuid(), $1, $2, 'OWNER', $3, now()
       WHERE NOT EXISTS (
         SELECT 1 FROM role_assignments WHERE organization_id = $1 AND membership_id = $2)`,
      [ORG_A, (filiacao[0] as { id: string }).id, MARCA_A],
    );
  } finally {
    await sql.end();
  }

  // ── E confirma que a sessão SERVE mesmo para o que interessa ────────────
  //
  // Guardar um cookie que não abre nada é o "verde sobre nada" desta etapa: a
  // preparação passaria, e as doze telas mediriam todas o ecrã de entrada.
  const painel = await request.get('/es-ES/app/marina-oropesa/puerto/website');
  expect(painel.status(), 'a sessão não abre o painel').toBeLessThan(400);
  expect(painel.url(), 'a sessão foi desviada para a entrada').not.toContain('/auth/');

  await request.storageState({ path: FICHEIRO_DE_SESSAO });
});
