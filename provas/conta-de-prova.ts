import type { Client } from 'pg';
import { criarAutenticacao } from '../packages/auth/src/autenticacao.ts';
import { correioDeMemoria } from '../packages/auth/src/correio.ts';
import { criarUtilizador } from '../packages/auth/src/criar-utilizador.ts';

/**
 * Contas de prova: nascem por dentro, e são apagadas no fim.
 *
 * ── Porque é que isto existe ──────────────────────────────────────────────
 *
 * Quatro provas criavam a conta com `POST /api/auth/sign-up/email` e um email
 * carimbado por `Date.now()`. O carimbo é a boa parte: **isola as corridas umas
 * das outras**, e por isso fica. O `sign-up` é que deixou de existir — fechou a
 * 07/09 às 22h37 — e com ele as quatro provas partiram-se **sem ninguém dar por
 * isso**, porque o portão só corre `validar-*.sh`.
 *
 * Estas provas têm cliente `pg`: falam com a base directamente. Não precisam de
 * uma rota HTTP para criar uma conta — só precisavam dela por hábito.
 *
 * ── E resolve o entulho, que é a parte que ninguém tinha pedido ───────────
 *
 * Cada corrida criava contas e **nunca as apagava**: 125 utilizadores
 * `@exemplo.example` na base, um por corrida, todos mortos. Quem cria aqui
 * também apaga, e é por isso que o `apagarContasDeProva` faz parte do par —
 * separá-los seria repetir o defeito com outra cara.
 */

/** Uma autenticação com o segredo do PRODUTO. Com outro, a conta não entra. */
export function autenticacaoDeProva() {
  const url = process.env.AUTH_DATABASE_URL ?? process.env.MIGRATION_DATABASE_URL
    ?? process.env.DATABASE_URL;
  const segredo = process.env.BETTER_AUTH_SECRET;
  if (!url || !segredo) {
    throw new Error('AUTH_DATABASE_URL/BETTER_AUTH_SECRET em falta: sem o segredo do '
      + 'produto a conta nasce e NÃO ENTRA, e isso só aparece no `sign-in`.');
  }
  return criarAutenticacao({
    authDatabaseUrl: url,
    segredo,
    urlBase: process.env.BASE_URL ?? 'http://127.0.0.1:3000',
    correio: correioDeMemoria(),
  });
}

/** Cria a conta e devolve o `id`. Não toca em HTTP. */
export async function criarContaDeProva(
  auth: ReturnType<typeof autenticacaoDeProva>,
  email: string,
  senha: string,
): Promise<string> {
  return criarUtilizador(auth, { email, senha, nome: email.split('@')[0] ?? 'prova' });
}

/**
 * Apaga o que a corrida criou, pela ORDEM das chaves estrangeiras.
 *
 * Devolve quantas contas saíram. Se alguma resistir, quem chama vê a diferença
 * entre o que pediu e o que saiu — um apagamento silenciosamente incompleto é
 * como os 125 restos nasceram.
 */
export async function apagarContasDeProva(sql: Client, emails: string[]): Promise<number> {
  let apagadas = 0;
  for (const email of emails) {
    const { rows } = await sql.query('SELECT id FROM users WHERE email = $1', [email]);
    for (const { id } of rows) {
      await sql.query('DELETE FROM sessions WHERE user_id = $1', [id]);
      await sql.query('DELETE FROM accounts WHERE user_id = $1', [id]);
      await sql.query(
        `DELETE FROM role_assignments WHERE membership_id IN
           (SELECT id FROM memberships WHERE user_id = $1)`, [id]);
      await sql.query('DELETE FROM memberships WHERE user_id = $1', [id]);
      await sql.query('DELETE FROM users WHERE id = $1', [id]);
      apagadas += 1;
    }
  }
  return apagadas;
}
