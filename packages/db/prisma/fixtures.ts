import { Client } from 'pg';

/**
 * Dois inquilinos, com nomes propositadamente parecidos.
 *
 * "Marina Bistró" em Oropesa e "Marina Bistro" em Barcelona: donos diferentes,
 * organizações diferentes, e um nome que difere num acento. Se algum dia uma
 * consulta cruzar inquilinos por nome, por slug ou por semelhança, é aqui que se
 * vê — dois nomes bem distintos esconderiam o defeito.
 *
 * Corre com a credencial de MIGRAÇÃO, que é dona das tabelas e por isso não está
 * sujeita às políticas. É o único sítio onde isso é correcto: semear dados de
 * dois inquilinos exige, por definição, atravessar a fronteira entre eles.
 *
 * Idempotente: pode correr as vezes que forem precisas.
 */

export const IDS = {
  orgA: '11111111-1111-4111-8111-111111111111',
  orgB: '22222222-2222-4222-8222-222222222222',
  marcaA: 'aaaa1111-1111-4111-8111-111111111111',
  marcaB: 'bbbb2222-2222-4222-8222-222222222222',
  unidadeA: 'aaaa1111-1111-4111-8111-222222222222',
  unidadeB: 'bbbb2222-2222-4222-8222-333333333333',
  /**
   * SEGUNDA unidade do inquilino A. Existe para o caso 4 da prova de isolamento:
   * duas unidades da MESMA organização passam as duas a política, e o que as
   * separa é o filtro de serviço. Com uma unidade só, o caso 4 não teria nada
   * para distinguir e passaria por vácuo.
   */
  unidadeA2: 'aaaa1111-1111-4111-8111-333333333333',
  utilizadorA: 'cccc1111-1111-4111-8111-111111111111',
  utilizadorB: 'cccc2222-2222-4222-8222-222222222222',
  /** Pertence às DUAS. Existe para o caminho de identidade ter algo a resolver. */
  utilizadorAmbas: 'cccc3333-3333-4333-8333-333333333333',
  filiacaoA: 'dddd1111-1111-4111-8111-111111111111',
  filiacaoB: 'dddd2222-2222-4222-8222-222222222222',
  /**
   * Quem é da plataforma. Existe para a prova ter o PAR: sem uma pessoa
   * autorizada, "a plataforma recusa" passaria num sistema que recusa a toda a
   * gente — que é a armadilha do caso 3 da prova de isolamento, outra vez.
   */
  utilizadorPlataforma: 'cccc4444-4444-4444-8444-444444444444',
} as const;

/**
 * Instruções separadas, cada uma com os SEUS parâmetros.
 *
 * O `pg` recusa vários comandos numa consulta **parametrizada** — e parametrizar
 * é o que impede um valor de virar SQL. Entre juntar tudo numa string e manter
 * os parâmetros, mantêm-se os parâmetros; a transacção explícita dá a mesma
 * atomicidade.
 *
 * E os parâmetros são por instrução, não uma lista comum: o `pg` exige a
 * contagem exacta, e passar onze a uma instrução que usa dois dá
 * `bind message supplies 11 parameters, but prepared statement requires 2`.
 */
type Instrucao = readonly [sql: string, parametros: readonly string[]];

const I = IDS;

const INSTRUCOES: readonly Instrucao[] = [
  [
    `INSERT INTO organizations (id, slug, nome, updated_at) VALUES
       ($1, 'marina-oropesa',   'Marina Bistró', now()),
       ($2, 'marina-barcelona', 'Marina Bistro', now())
     ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, updated_at = now()`,
    [I.orgA, I.orgB],
  ],
  [
    `INSERT INTO brands (id, organization_id, nome, slug, updated_at) VALUES
       ($1, $3, 'Marina', 'marina', now()),
       ($2, $4, 'Marina', 'marina', now())
     ON CONFLICT (id) DO UPDATE SET
       nome = EXCLUDED.nome,
       -- Repõe também o DONO. Se uma prova mal contida mover uma marca para
       -- outra organização, semear outra vez tem de a trazer de volta — senão a
       -- reparação é parcial e o defeito seguinte parece novo.
       organization_id = EXCLUDED.organization_id,
       updated_at = now()`,
    [I.marcaA, I.marcaB, I.orgA, I.orgB],
  ],
  [
    `INSERT INTO locations (id, organization_id, brand_id, nome, slug, moeda, fuso, updated_at) VALUES
       ($1, $3, $5, 'Marina Playa',  'playa',  'EUR', 'Europe/Madrid', now()),
       ($2, $4, $6, 'Marina Playa',  'playa',  'EUR', 'Europe/Madrid', now()),
       ($7, $3, $5, 'Marina Puerto', 'puerto', 'EUR', 'Europe/Madrid', now())
     ON CONFLICT (id) DO UPDATE SET
       nome = EXCLUDED.nome,
       organization_id = EXCLUDED.organization_id,
       brand_id = EXCLUDED.brand_id,
       updated_at = now()`,
    [I.unidadeA, I.unidadeB, I.orgA, I.orgB, I.marcaA, I.marcaB, I.unidadeA2],
  ],
  [
    `INSERT INTO users (id, email, nome, updated_at) VALUES
       ($1, 'ana@marina-oropesa.example',     'Ana',   now()),
       ($2, 'bruno@marina-barcelona.example', 'Bruno', now()),
       ($3, 'carla@exemplo.example',          'Carla', now()),
       ($4, 'diogo@bossaos.example',           'Diogo', now())
     ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, updated_at = now()`,
    [I.utilizadorA, I.utilizadorB, I.utilizadorAmbas, I.utilizadorPlataforma],
  ],
  [
    // Diogo é da plataforma e **não é membro de organização nenhuma**. É de
    // propósito: quem opera a plataforma não tem de ser cliente, e ter-lhe dado
    // uma filiação faria a prova não distinguir "vê porque é da plataforma" de
    // "vê porque pertence àquela organização".
    `INSERT INTO platform_staff (user_id, motivo) VALUES ($1, 'fixtures: operação do piloto')
     ON CONFLICT (user_id) DO UPDATE SET motivo = EXCLUDED.motivo`,
    [I.utilizadorPlataforma],
  ],
  [
    `INSERT INTO memberships (id, organization_id, user_id, estado, updated_at) VALUES
       ($1, $3, $5, 'ACTIVO', now()),
       ($2, $4, $6, 'ACTIVO', now())
     ON CONFLICT (organization_id, user_id) DO UPDATE SET estado = 'ACTIVO', updated_at = now()`,
    [I.filiacaoA, I.filiacaoB, I.orgA, I.orgB, I.utilizadorA, I.utilizadorB],
  ],
  [
    // A Carla é membro das DUAS. É o que dá ao caminho de identidade mais do que
    // uma resposta possível — com uma só, "resolveu" e "devolveu a única" são
    // indistinguíveis.
    `INSERT INTO memberships (id, organization_id, user_id, estado, updated_at) VALUES
       (gen_random_uuid(), $1, $3, 'ACTIVO', now()),
       (gen_random_uuid(), $2, $3, 'ACTIVO', now())
     ON CONFLICT (organization_id, user_id) DO UPDATE SET estado = 'ACTIVO', updated_at = now()`,
    [I.orgA, I.orgB, I.utilizadorAmbas],
  ],
  [
    `INSERT INTO role_assignments (id, organization_id, membership_id, papel, brand_id, updated_at)
     SELECT gen_random_uuid(), $1, $2, 'OWNER', $3, now()
     WHERE NOT EXISTS (SELECT 1 FROM role_assignments WHERE organization_id = $1 AND membership_id = $2)`,
    [I.orgA, I.filiacaoA, I.marcaA],
  ],
  [
    `INSERT INTO role_assignments (id, organization_id, membership_id, papel, brand_id, updated_at)
     SELECT gen_random_uuid(), $1, $2, 'OWNER', $3, now()
     WHERE NOT EXISTS (SELECT 1 FROM role_assignments WHERE organization_id = $1 AND membership_id = $2)`,
    [I.orgB, I.filiacaoB, I.marcaB],
  ],
];

export async function semear(urlDeMigracao: string): Promise<void> {
  const cliente = new Client({ connectionString: urlDeMigracao });
  await cliente.connect();
  try {
    await cliente.query('BEGIN');
    for (const [sql, parametros] of INSTRUCOES) await cliente.query(sql, [...parametros]);
    await cliente.query('COMMIT');
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  } finally {
    await cliente.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) {
    process.stderr.write('MIGRATION_DATABASE_URL em falta\n');
    process.exit(78);
  }
  await semear(url);
  process.stdout.write('fixtures: dois inquilinos com nomes parecidos, semeados\n');
}
