#!/usr/bin/env node
/**
 * Controlo interno de inquilinos e concessões — o mínimo para operar o piloto.
 *
 * O E05 pede-o assim, textualmente: *"Crie controle interno mínimo de tenants e
 * concessões para operar o piloto. A interface completa de suporte e plataforma
 * vem na E33."*
 *
 * ── Porque é um script e não um botão ───────────────────────────────────────
 *
 * As tabelas `subscriptions`, `entitlement_grants`, `feature_flags` e
 * `platform_staff` são escritas **só pela credencial de migração**: um catálogo
 * comercial que o processo do restaurante reescreve é um restaurante a dar-se um
 * plano. Essa decisão é do E05 e tem prova própria.
 *
 * Dar à interface web um caminho de escrita obrigaria a devolver esses
 * privilégios ao runtime, ou a inventar um quinto acesso, por causa de seis
 * ecrãs internos que ainda não têm interface. Enquanto a E33 não chega, quem
 * opera o piloto escreve por aqui — com a credencial certa, e deixando rasto.
 *
 * **Tudo o que escreve fica auditado.** Uma concessão dada por alguém, sem
 * motivo e sem carimbo, é uma concessão que ninguém consegue rever daqui a seis
 * meses — e concessões que ninguém revê é como um piloto vira produto grátis.
 *
 * Uso:
 *   ./scripts/plataforma.mjs listar [orgSlug]
 *   ./scripts/plataforma.mjs staff <email> "<motivo>"
 *   ./scripts/plataforma.mjs plano <orgSlug> <STARTER|RESTAURANT|PRO>
 *   ./scripts/plataforma.mjs conceder <orgSlug> <capacidade> [--quota N] [--ate AAAA-MM-DD] --motivo "<texto>"
 *   ./scripts/plataforma.mjs revogar <orgSlug> <capacidade> --motivo "<texto>"
 *   ./scripts/plataforma.mjs flag <nome> <ligada|desligada> [--org <orgSlug>]
 *   ./scripts/plataforma.mjs agendar-descida <orgSlug> <codigo> <AAAA-MM-DD> --motivo "<texto>"
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

// O `.env` lê-se aqui e não se imprime nunca. O E01 é explícito: a mensagem
// nomeia as variáveis em falta e nunca mostra valores.
try {
  for (const linha of readFileSync(join(RAIZ, '.env'), 'utf8').split('\n')) {
    const m = linha.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* sem .env: as variáveis têm de vir do ambiente */ }

const URL_MIG = process.env.MIGRATION_DATABASE_URL;
if (!URL_MIG) {
  console.error('MIGRATION_DATABASE_URL em falta. Este script escreve o que o runtime não pode escrever.');
  process.exit(78);
}

const argv = process.argv.slice(2);
const comando = argv[0];
const opcao = (nome) => {
  const i = argv.indexOf(`--${nome}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const sql = new pg.Client({ connectionString: URL_MIG });
await sql.connect();

/** Toda a escrita passa por aqui. Sem organização não há linha de auditoria. */
async function auditar(organizationId, accao, detalhe, motivo) {
  await sql.query(
    `INSERT INTO audit_events (id, organization_id, actor_email, accao, alvo_tipo, motivo, detalhe)
     VALUES (gen_random_uuid(), $1, $2, $3, 'plataforma', $4, $5::jsonb)`,
    [organizationId, `plataforma:${process.env.USER ?? 'desconhecido'}`, accao, motivo ?? null, JSON.stringify(detalhe)],
  );
}

async function orgPorSlug(slug) {
  const { rows } = await sql.query('SELECT id, nome FROM organizations WHERE slug = $1', [slug]);
  if (rows.length === 0) {
    console.error(`organização "${slug}" não existe`);
    process.exit(1);
  }
  return rows[0];
}

function exigirMotivo() {
  const motivo = opcao('motivo');
  if (!motivo) {
    // Não é burocracia. Uma concessão sem motivo escrito é uma concessão que
    // ninguém consegue rever daqui a seis meses — e é assim que um piloto vira
    // produto grátis.
    console.error('--motivo é obrigatório: quem revir isto daqui a seis meses tem de saber porquê.');
    process.exit(2);
  }
  return motivo;
}

try {
  switch (comando) {
    case 'listar': {
      const slug = argv[1];
      if (!slug) {
        const { rows } = await sql.query(`
          SELECT o.slug, o.nome, COALESCE(p.codigo, '—') AS plano, COALESCE(s.estado::text, 'SEM_PLANO') AS estado,
                 (SELECT count(*) FROM locations l WHERE l.organization_id = o.id AND l.archived_at IS NULL) AS unidades
            FROM organizations o
            LEFT JOIN subscriptions s ON s.organization_id = o.id
            LEFT JOIN plan_definitions p ON p.id = s.plan_id
           WHERE o.archived_at IS NULL ORDER BY o.nome`);
        console.table(rows);
      } else {
        const org = await orgPorSlug(slug);
        const { rows } = await sql.query(
          `SELECT capacidade, quota, origem, valido_ate, motivo FROM entitlement_grants
            WHERE organization_id = $1 ORDER BY capacidade`, [org.id]);
        console.log(`${org.nome}:`);
        console.table(rows);
      }
      break;
    }

    case 'staff': {
      const [, email] = argv;
      const motivo = argv[2];
      if (!email || !motivo) { console.error('uso: staff <email> "<motivo>"'); process.exit(2); }
      const { rows } = await sql.query('SELECT id FROM users WHERE email = $1', [email]);
      if (rows.length === 0) { console.error(`sem utilizador com o email ${email}`); process.exit(1); }
      await sql.query(
        `INSERT INTO platform_staff (user_id, motivo) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET motivo = $2`, [rows[0].id, motivo]);
      console.log(`${email} passou a ter acesso de plataforma.`);
      break;
    }

    case 'plano': {
      const [, slug, codigo] = argv;
      if (!slug || !codigo) { console.error('uso: plano <orgSlug> <codigo>'); process.exit(2); }
      const org = await orgPorSlug(slug);
      const r = await sql.query(
        `INSERT INTO subscriptions (id, organization_id, plan_id, estado, updated_at)
         SELECT gen_random_uuid(), $1, p.id, 'ACTIVA', now() FROM plan_definitions p WHERE p.codigo = $2
         ON CONFLICT (organization_id) DO UPDATE
           SET plan_id = (SELECT id FROM plan_definitions WHERE codigo = $2), estado = 'ACTIVA', updated_at = now()
         RETURNING id`, [org.id, codigo]);
      if (r.rowCount === 0) { console.error(`plano "${codigo}" não existe no catálogo`); process.exit(1); }
      await auditar(org.id, 'plataforma.plano.definido', { plano: codigo }, opcao('motivo'));
      console.log(`${org.nome}: plano ${codigo}.`);
      break;
    }

    case 'conceder': {
      const [, slug, capacidade] = argv;
      if (!slug || !capacidade) { console.error('uso: conceder <orgSlug> <capacidade> --motivo "<texto>"'); process.exit(2); }
      const motivo = exigirMotivo();
      const org = await orgPorSlug(slug);
      const quota = opcao('quota') === undefined ? null : Number(opcao('quota'));
      const ate = opcao('ate') ? new Date(opcao('ate')) : null;
      await sql.query(
        `INSERT INTO entitlement_grants (id, organization_id, capacidade, quota, valido_ate, origem, motivo, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, now())
         ON CONFLICT (organization_id, capacidade, location_id)
           DO UPDATE SET quota = $3, valido_ate = $4, origem = $5, motivo = $6, updated_at = now()`,
        [org.id, capacidade, quota, ate, opcao('origem') ?? 'ADICIONAL', motivo]);
      await auditar(org.id, 'plataforma.concessao.dada', { capacidade, quota, ate }, motivo);
      console.log(`${org.nome}: ${capacidade}${quota === null ? '' : ` (quota ${quota})`}.`);
      break;
    }

    case 'revogar': {
      const [, slug, capacidade] = argv;
      if (!slug || !capacidade) { console.error('uso: revogar <orgSlug> <capacidade> --motivo "<texto>"'); process.exit(2); }
      const motivo = exigirMotivo();
      const org = await orgPorSlug(slug);
      const r = await sql.query(
        'DELETE FROM entitlement_grants WHERE organization_id = $1 AND capacidade = $2', [org.id, capacidade]);
      await auditar(org.id, 'plataforma.concessao.retirada', { capacidade, linhas: r.rowCount }, motivo);
      console.log(`${org.nome}: ${r.rowCount} concessão(ões) de ${capacidade} retirada(s).`);
      break;
    }

    case 'flag': {
      const [, nome, estado] = argv;
      if (!nome || !['ligada', 'desligada'].includes(estado)) {
        console.error('uso: flag <nome> <ligada|desligada> [--org <orgSlug>]'); process.exit(2);
      }
      const org = opcao('org') ? await orgPorSlug(opcao('org')) : null;
      await sql.query(
        `INSERT INTO feature_flags (id, nome, organization_id, ligada, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, now())
         ON CONFLICT (nome, organization_id) DO UPDATE SET ligada = $3, updated_at = now()`,
        [nome, org?.id ?? null, estado === 'ligada']);
      if (org) await auditar(org.id, 'plataforma.flag.definida', { nome, ligada: estado === 'ligada' }, opcao('motivo'));
      console.log(`flag ${nome} ${estado}${org ? ` para ${org.nome}` : ' (global)'}.`);
      break;
    }

    case 'agendar-descida': {
      const [, slug, codigo, quando] = argv;
      if (!slug || !codigo || !quando) {
        console.error('uso: agendar-descida <orgSlug> <codigo> <AAAA-MM-DD> --motivo "<texto>"'); process.exit(2);
      }
      const motivo = exigirMotivo();
      const org = await orgPorSlug(slug);
      const r = await sql.query(
        `UPDATE subscriptions
            SET descer_para_plano_id = (SELECT id FROM plan_definitions WHERE codigo = $2),
                descer_em = $3, updated_at = now()
          WHERE organization_id = $1`, [org.id, codigo, new Date(quando)]);
      if (r.rowCount === 0) { console.error(`${org.nome} não tem subscrição`); process.exit(1); }
      await auditar(org.id, 'plataforma.descida.agendada', { para: codigo, em: quando }, motivo);
      // Quem efectiva é o trabalho de fundo, e só depois de a data chegar e de
      // não haver operações abertas. Aqui só se agenda.
      console.log(`${org.nome}: descida para ${codigo} agendada para ${quando}. O worker efectiva-a.`);
      break;
    }

    default:
      console.error(readFileSync(new URL(import.meta.url)).toString().split('* Uso:')[1]?.split('*/')[0]?.replace(/^\s*\*ic?/gm, '') ?? 'comando desconhecido');
      process.exit(2);
  }
} finally {
  await sql.end();
}
