import { Client } from 'pg';
import { CONTA_DA_DEMO, DEMO, SENHA_DA_DEMO } from '../packages/db/prisma/demonstracao-comum.ts';

/**
 * A sessão do inquilino de demonstração, aberta pela porta do produto.
 *
 * ── Porque é que isto saiu do `capturar-demonstracao.mjs` ─────────────────
 *
 * Passou a ter dois clientes: o motor de prova das composições e o das
 * telas-mestre do §7. Duplicar quarenta linhas de autenticação era garantir que
 * uma delas envelhecia — e a que envelhecesse falharia a semear a pertença, o
 * que se lê como defeito de produto e não como arnês desactualizado.
 *
 * O `provar-demonstracao.sh` continua a ser a guarda de que isto funciona: se a
 * extracção partir alguma coisa, ele fica vermelho antes de qualquer captura
 * nova ser tirada.
 */
/**
 * @param navegador  o browser já aberto
 * @param BASE       a origem onde o produto está a servir. É PARÂMETRO e não
 *   constante do módulo: os dois motores correm em portas diferentes, e foi
 *   exactamente esta variável que a extracção deixou para trás — o helper saiu
 *   com o corpo e sem o `BASE` que ele fechava por cima. A `provar-demonstracao`
 *   apanhou-o antes de qualquer captura nova ser tirada, que é para o que ela
 *   serve.
 */
export async function abrirSessao(navegador, BASE) {
  const contexto = await navegador.newContext({
    baseURL: BASE, locale: 'es-ES', timezoneId: 'Europe/Madrid',
  });
  const pedido = contexto.request;

  /**
   * O limitador de abuso devolve 429 ao fim de três pedidos a `/sign-in*` ou
   * `/sign-up*` numa janela de dez segundos, e **é suposto estar lá**: só liga
   * em produção, e o build que se fotografa é o de produção. Desligá-lo para as
   * capturas passarem seria apagar uma protecção real para chegar ao verde.
   *
   * Espera-se por ele, como o arnês faz. Espera fixa acima da janela — escalonar
   * torna o arranque imprevisível.
   */
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  const comPaciencia = async (nome, fazer) => {
    let resposta;
    for (let tentativa = 0; tentativa < 6; tentativa++) {
      resposta = await fazer();
      if (resposta.status() !== 429) return resposta;
      await dormir(11_000);
    }
    return resposta;
  };

  const entrar = () => comPaciencia('entrada', () => pedido.post('/api/auth/sign-in/email', {
    data: { email: CONTA_DA_DEMO, password: SENHA_DA_DEMO },
    headers: { origin: BASE },
  }));

  let entrou = await entrar();
  if (!entrou.ok()) {
    const inscricao = await comPaciencia('inscrição', () => pedido.post('/api/auth/sign-up/email', {
      data: { email: CONTA_DA_DEMO, password: SENHA_DA_DEMO, name: 'Bossa Demo' },
      headers: { origin: BASE },
    }));
    if (!inscricao.ok()) {
      throw new Error(`a inscrição da conta de demonstração falhou: ${inscricao.status()}`);
    }
    entrou = await entrar();
  }
  if (!entrou.ok()) throw new Error(`a entrada da demonstração falhou: ${entrou.status()}`);

  const sql = new Client({
    connectionString: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL,
  });
  await sql.connect();
  try {
    const { rows } = await sql.query('SELECT id FROM users WHERE email = $1', [CONTA_DA_DEMO]);
    const userId = rows[0]?.id;
    if (!userId) throw new Error('a conta de demonstração não ficou na base');
    await sql.query(
      `INSERT INTO memberships (id, organization_id, user_id, estado, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'ACTIVO', now())
       ON CONFLICT (organization_id, user_id) DO UPDATE SET estado = 'ACTIVO', updated_at = now()`,
      [DEMO.org, userId],
    );
    const { rows: filiacao } = await sql.query(
      'SELECT id FROM memberships WHERE organization_id = $1 AND user_id = $2',
      [DEMO.org, userId]);
    // Sem `brand_id`: ver o cabeçalho.
    await sql.query(
      `INSERT INTO role_assignments (id, organization_id, membership_id, papel, updated_at)
       SELECT gen_random_uuid(), $1, $2, 'OWNER', now()
       WHERE NOT EXISTS (
         SELECT 1 FROM role_assignments WHERE organization_id = $1 AND membership_id = $2)`,
      [DEMO.org, filiacao[0].id],
    );
  } finally {
    await sql.end();
  }
  return contexto;
}
