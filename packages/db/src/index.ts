import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Cliente Prisma do RUNTIME.
 *
 * A separação de credenciais do aceite 2 do E01 não é aqui uma convenção que
 * alguém tem de lembrar: em Prisma 7 a URL saiu do schema, e por isso ela vive
 * em dois sítios diferentes e incomunicáveis do código —
 *
 *   - `prisma.config.ts` → `MIGRATION_DATABASE_URL`, a credencial que ALTERA o
 *     schema. Só os comandos `prisma migrate` passam por lá.
 *   - este ficheiro       → `DATABASE_URL`, a credencial do runtime, entregue
 *     explicitamente ao adaptador. Não tem DDL (ver `scripts/dev-db.sh`).
 *
 * Não há caminho pelo qual o runtime alcance a credencial de migração por
 * distração, porque não há sítio nenhum onde ele a leia.
 */
let cliente: PrismaClient | undefined;

export function obterPrisma(databaseUrl: string): PrismaClient {
/**
   * `options: '-c timezone=UTC'` não é preferência — é uma correcção.
   *
   * Medido: com a sessão em `Europe/Madrid`, `SELECT now()` devolvia
   * `12:57:56Z` pelo `pg` e **`14:57:56Z` pelo Prisma** — duas horas, exactamente
   * o desvio do fuso. O adaptador lê a renderização local do `timestamptz` e
   * rotula-a como UTC.
   *
   * Apareceu num convite expirado que era aceite: a base dizia
   * `expires_at <= now()` e o código lia uma data duas horas no futuro. Mas o
   * defeito não era dos convites — seria de **todos** os prazos, reservas, turnos
   * e carimbos de auditoria, e num produto de restauração isso é uma mesa
   * reservada à hora errada.
   *
   * Com a sessão em UTC a renderização local É UTC e o desvio desaparece. Está
   * provado em `packages/db/src/fuso.test.ts`, que compara `now()` do Prisma com
   * o relógio do processo e falha se divergirem mais de cinco segundos.
   */
  cliente ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl, options: '-c timezone=UTC' }),
  });
  return cliente;
}

/** Só para testes: força a próxima chamada a construir um cliente novo. */
export function esquecerPrisma(): void {
  cliente = undefined;
}

export type EstadoBase =
  | { ok: true; migrado: boolean; schemaVersion: string | null }
  | { ok: false; erro: string };

/**
 * Prontidão real (CT-03: "uma falha de infraestrutura deve retornar
 * indisponibilidade real; não simular banco saudável").
 *
 * Faz DUAS perguntas, porque uma sozinha engana:
 *  1. a base responde? (`SELECT 1` responde numa base vazia — não basta);
 *  2. este schema chegou cá? (lê `app_meta`, que só existe depois da migração).
 */
export async function verificarBase(prisma: PrismaClient): Promise<EstadoBase> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.name : 'erro desconhecido' };
  }
  try {
    const linha = await prisma.appMeta.findUnique({ where: { key: 'schema_version' } });
    return { ok: true, migrado: linha !== null, schemaVersion: linha?.value ?? null };
  } catch {
    // A base responde mas a tabela não existe: schema por migrar. Isto é um
    // estado REAL e distinto de "base em baixo" — e é o que um deploy sem
    // migração produz.
    return { ok: true, migrado: false, schemaVersion: null };
  }
}

export {
  comEscopo, comIdentidade, identidadePorEmail,
  type ClienteComEscopo, type ClienteComIdentidade, type Escopo,
} from './escopo.ts';

export {
  listarMarcas, obterMarca, criarMarca,
  listarUnidades, obterUnidade, criarUnidade,
  papeisDaFiliacao, filiacoesDaOrganizacao,
  organizacoesDoUtilizador, filiacoesDoUtilizador, euProprio,
  concessoesDoActor, pessoasEAcessos, revogarPertenca,
  type DadosDeMarca, type DadosDeUnidade,
} from './repositorios.ts';

export {
  criarConvite, aceitarConvite, revogarConvite, listarConvites,
  organizacaoDoConvite, resumoDoToken, resumosIguais,
  type DadosDeConvite, type ResultadoDeConvite, type ResultadoDeAceitacao,
  type FalhaAoConvidar, type FalhaAoAceitar,
} from './convites.ts';

export { registar, listarAuditoria, type EventoDeAuditoria } from './auditoria.ts';

export {
  estadoComercial, podeCapacidade, contarUnidades, contarPessoas, catalogoDePlanos,
  type EstadoComercial,
} from './planos.ts';

export {
  CAPACIDADE_DO_TEMA, temaActivo, guardarTema, reverterAoPadrao, previaDeDescida,
  type ResultadoDeGravacao,
} from './tema.ts';

export { obterPrismaDeAutenticacao } from './autenticacao.ts';

export { PrismaClient };

export {
  aplicarDescidaAgendada, descidasDevidas, previaDeDescidaParaPlano, estadoComercialSeFosse,
  pendenciasQueBloqueiamDescida, registarDetectorDePendencia, detectoresRegistados,
  type Pendencia, type DetectorDePendencia, type ResultadoDaDescida,
} from './descidas.ts';

export {
  ePlataforma, organizacoesDaPlataforma, organizacaoDaPlataforma,
  concessoesDaPlataforma, flagsDaPlataforma, implantacoes,
  type OrganizacaoDaPlataforma, type DetalheDaOrganizacao, type ConcessaoDaPlataforma,
  type FlagDaPlataforma, type Implantacao, type FaseDeImplantacao,
} from './plataforma.ts';

export {
  lerHorario, aberturaAgora, validarDia, guardarSemana, esquecerDia,
  guardarExcepcao, apagarExcepcao,
  type ErroDeHorario, type ResultadoDaGravacao as ResultadoDeHorario,
} from './horarios.ts';

export {
  comIdempotencia, criarOrganizacaoComDono, lerPerfil, guardarPerfil, perfilCompleto,
  progressoDoArranque, marcarPasso, arranqueDaOrganizacao,
  dependenciasDaUnidade, arquivarUnidade, desarquivarUnidade,
  type Idempotencia, type ResultadoIdempotente, type PerfilDaOrganizacao,
  type Dependencia, type ResultadoDeArquivo,
} from './onboarding.ts';

export {
  CANAIS, listarProdutos, obterProduto, guardarProduto,
  precoEfectivo, precosDoProduto,
  fichaDeAlergeniosDoProduto, guardarAlergenios,
  gruposDoProduto, validarEscolhasDoProduto, guardarGrupo,
  bloquearProduto, desbloquearProduto, estaDisponivel,
  type Canal, type FiltroDeProdutos, type DadosDeProduto,
  type ResultadoDeEdicao, type DeclaracaoParaGravar,
} from './catalogo.ts';
