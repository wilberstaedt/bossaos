import type { ClienteComIdentidade } from './escopo.ts';

/**
 * A superfície interna de plataforma (PLAT-002, 003, 004, 006, 010, 011).
 *
 * ── Porque é que isto corre no caminho de IDENTIDADE ────────────────────────
 *
 * A plataforma lê através de inquilinos por natureza. Não pode correr em
 * `comEscopo`, que fixa um; corre em `comIdentidade`, que define só
 * `app.user_id` — e é esse identificador que as funções da base usam para
 * decidir se quem chama é da plataforma.
 *
 * O tipo diz isto sozinho: estas funções aceitam `ClienteComIdentidade` e
 * **não** `ClienteComEscopo`. Chamar uma delas de dentro de um pedido de
 * inquilino não compila, que é a mesma guarda do E03 aplicada ao contrário.
 *
 * ── E a verificação não está aqui ───────────────────────────────────────────
 *
 * Cada função da base verifica por si (`plataforma_e_staff()`), e este ficheiro
 * não repete a verificação. Repeti-la aqui daria a impressão de que é este o
 * sítio onde ela vive — e a próxima rota que chamasse o SQL directamente
 * passava. A defesa está na base; isto é só a leitura.
 */

export interface OrganizacaoDaPlataforma {
  id: string;
  slug: string;
  nome: string;
  plano: string | null;
  estado: string;
  unidades: number;
}

export interface DetalheDaOrganizacao extends OrganizacaoDaPlataforma {
  utilizadores: number;
  descerPara: string | null;
  descerEm: Date | null;
}

export interface ConcessaoDaPlataforma {
  capacidade: string;
  quota: number | null;
  origem: string;
  validoAte: Date | null;
  motivo: string | null;
}

export interface FlagDaPlataforma {
  nome: string;
  organizationId: string | null;
  organizacao: string | null;
  ligada: boolean;
}

/** `bigint` do `count()` do Postgres. Number(…) porque não há milhões de unidades. */
const paraNumero = (v: unknown): number => Number(v ?? 0);

export async function ePlataforma(db: ClienteComIdentidade): Promise<boolean> {
  const r = await db.$queryRaw<Array<{ plataforma_e_staff: boolean }>>`SELECT plataforma_e_staff()`;
  return r[0]?.plataforma_e_staff === true;
}

export async function organizacoesDaPlataforma(
  db: ClienteComIdentidade,
): Promise<OrganizacaoDaPlataforma[]> {
  const linhas = await db.$queryRaw<
    Array<{ id: string; slug: string; nome: string; plano: string | null; estado: string; unidades: bigint }>
  >`SELECT * FROM plataforma_organizacoes()`;
  return linhas.map((l) => ({ ...l, unidades: paraNumero(l.unidades) }));
}

export async function organizacaoDaPlataforma(
  db: ClienteComIdentidade,
  organizationId: string,
): Promise<DetalheDaOrganizacao | null> {
  const linhas = await db.$queryRaw<
    Array<{
      id: string; slug: string; nome: string; plano: string | null; estado: string;
      unidades: bigint; utilizadores: bigint; descer_para: string | null; descer_em: Date | null;
    }>
  >`SELECT * FROM plataforma_organizacao(${organizationId}::uuid)`;
  const l = linhas[0];
  if (!l) return null;
  return {
    id: l.id, slug: l.slug, nome: l.nome, plano: l.plano, estado: l.estado,
    unidades: paraNumero(l.unidades), utilizadores: paraNumero(l.utilizadores),
    descerPara: l.descer_para, descerEm: l.descer_em,
  };
}

export async function concessoesDaPlataforma(
  db: ClienteComIdentidade,
  organizationId: string,
): Promise<ConcessaoDaPlataforma[]> {
  const linhas = await db.$queryRaw<
    Array<{ capacidade: string; quota: number | null; origem: string; valido_ate: Date | null; motivo: string | null }>
  >`SELECT * FROM plataforma_concessoes(${organizationId}::uuid)`;
  return linhas.map((l) => ({
    capacidade: l.capacidade, quota: l.quota, origem: l.origem,
    validoAte: l.valido_ate, motivo: l.motivo,
  }));
}

export async function flagsDaPlataforma(db: ClienteComIdentidade): Promise<FlagDaPlataforma[]> {
  const linhas = await db.$queryRaw<
    Array<{ nome: string; organization_id: string | null; organizacao: string | null; ligada: boolean }>
  >`SELECT * FROM plataforma_flags()`;
  return linhas.map((l) => ({
    nome: l.nome, organizationId: l.organization_id, organizacao: l.organizacao, ligada: l.ligada,
  }));
}

/**
 * PLAT-006 · em que ponto da implantação está cada organização.
 *
 * **A fase é DERIVADA do que existe, não guardada numa coluna.** Não há campo de
 * "estado de onboarding" no modelo, e inventá-lo agora criaria um segundo sítio
 * onde a verdade vive — o que já vi acontecer: a coluna diz "concluído" e a
 * organização não tem uma unidade.
 *
 * O atlas (p. 364) mostra dois itens de checklist: "Catálogo revisado" e "Equipo
 * invitado". O segundo mede-se — conta-se as filiações activas. **O primeiro
 * não**, porque o catálogo de produtos é de uma etapa que ainda não chegou, e
 * por isso diz que não foi medido em vez de inventar um visto.
 */
export type FaseDeImplantacao = 'ATIVACAO' | 'CATALOGO' | 'PILOTO';

export interface Implantacao {
  organizacao: OrganizacaoDaPlataforma;
  fase: FaseDeImplantacao;
  equipaConvidada: boolean;
}

export function implantacoes(orgs: readonly OrganizacaoDaPlataforma[], utilizadoresPorOrg: ReadonlyMap<string, number>) {
  return orgs.map((o): Implantacao => {
    const pessoas = utilizadoresPorOrg.get(o.id) ?? 0;
    // Sem plano: ainda não passou da preparação. Com plano e sem unidade: está
    // a montar o catálogo. Com as duas coisas: está em piloto.
    const fase: FaseDeImplantacao =
      o.plano === null ? 'ATIVACAO' : o.unidades === 0 ? 'CATALOGO' : 'PILOTO';
    return { organizacao: o, fase, equipaConvidada: pessoas > 1 };
  });
}
