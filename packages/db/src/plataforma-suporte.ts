import {
  identidadeDeTrabalho, mostrarSegredo, sessaoViva, type AmbitoDeSuporte,
} from '@bossaos/domain';
import type { ClienteComEscopo, ClienteComIdentidade } from './escopo.ts';

/**
 * Plataforma, suporte e governança — o motor do E33.
 *
 * Contrato: `docs/architecture/plataforma-e-suporte.md`.
 *
 * ── O que este ficheiro NÃO tem, e é a decisão ────────────────────────────
 *
 * Não tem `concederCapacidade` que escreva em `entitlement_grants` pelo caminho
 * do runtime. Não pode ter: o E05 tirou essa permissão ao runtime há vinte e
 * oito etapas, e **esta etapa não lha devolve**.
 *
 * A interface de escrita existe — é o que o E33 traz — e passa pela
 * `conceder_capacidade`, `SECURITY DEFINER`, que corre como dono e escreve a
 * auditoria na MESMA transacção. Se para a tela funcionar o runtime ganhasse
 * `INSERT`, a resposta é não: muda-se o caminho, não a permissão.
 */

export type RecusaDaPlataforma =
  | 'SESSAO_DESCONHECIDA'
  | 'SESSAO_JA_TERMINADA'
  | 'SESSAO_EXPIRADA'
  | 'FORA_DE_AMBITO'
  | 'EXCEDE_O_TECTO'
  | 'EXIGE_CONSENTIMENTO'
  | 'SEM_PESSOA'
  | 'SEM_MOTIVO'
  | 'NAO_E_DA_PLATAFORMA'
  | 'CAPACIDADE_PROTEGIDA';

export class RecusaDePlataforma extends Error {
  readonly motivo: RecusaDaPlataforma;

  constructor(motivo: RecusaDaPlataforma, detalhe?: string) {
    super(detalhe ? `${motivo}: ${detalhe}` : motivo);
    this.name = 'RecusaDePlataforma';
    this.motivo = motivo;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FRONTEIRA 1 · a sessão de suporte
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Abre uma sessão de suporte numa casa.
 *
 * ── Os quatro argumentos que não têm valor por omissão ────────────────────
 *
 * `motivo`, `ambito`, `duracaoMinutos` e a pessoa. Nenhum deles é opcional, e é
 * de propósito: um argumento com valor por omissão é um argumento que quem tem
 * pressa não escreve — e ter pressa é exactamente o estado em que se abre uma
 * sessão de suporte.
 *
 * O tecto e o consentimento são verificados **pela base**, no gatilho. Aqui só
 * se traduz a recusa: quem garante é ela, porque é o único sítio por onde todos
 * os caminhos passam.
 */
export async function abrirSessaoDeSuporte(
  db: ClienteComEscopo,
  organizationId: string,
  dados: {
    readonly staffUserId: string;
    readonly staffEmail: string;
    readonly motivo: string;
    readonly ambito: readonly AmbitoDeSuporte[];
    readonly duracaoMinutos: number;
    readonly consentidaPor?: string;
  },
) {
  // ── Pela porta privilegiada, e não por `create` ─────────────────────────
  //
  // A primeira versão fazia `db.supportSession.create`. **Não podia
  // funcionar**: o runtime tem `SELECT` e mais nada nesta tabela, e a prova
  // apanhou-o à primeira corrida.
  //
  // Isso não é um defeito da tabela — é a regra a funcionar. Quem escreve é o
  // caminho da plataforma, com credencial própria, e a auditoria sai na mesma
  // instrução. Entrar numa casa e registar a entrada não são duas coisas.
  try {
    const linhas = await db.$queryRaw<{ abrir_sessao_de_suporte: string }[]>`
      SELECT abrir_sessao_de_suporte(
        ${organizationId}::uuid, ${dados.staffUserId}::uuid, ${dados.staffEmail},
        ${dados.motivo}, ${[...dados.ambito]}::"AmbitoDeSuporte"[],
        ${dados.duracaoMinutos}, ${dados.consentidaPor ?? null})`;
    const id = linhas[0]?.abrir_sessao_de_suporte as string;
    return (await db.supportSession.findFirst({ where: { id } }))!;
  } catch (erro) {
    const texto = String(erro);
    if (texto.includes('sessao_excede_o_tecto_da_casa')) {
      throw new RecusaDePlataforma('EXCEDE_O_TECTO',
        'a casa aceita menos tempo do que o pedido');
    }
    if (texto.includes('casa_exige_consentimento')) {
      throw new RecusaDePlataforma('EXIGE_CONSENTIMENTO',
        'esta casa exige que alguém de lá consinta a cada entrada');
    }
    if (texto.includes('sessao_tem_motivo')) {
      throw new RecusaDePlataforma('SEM_MOTIVO', 'o motivo escreve-se antes, e explica');
    }
    if (texto.includes('sessao_sem_pessoa')) {
      throw new RecusaDePlataforma('SEM_PESSOA', 'uma sessão tem de dizer QUEM entrou');
    }
    if (texto.includes('nao_e_da_plataforma')) {
      throw new RecusaDePlataforma('NAO_E_DA_PLATAFORMA');
    }
    throw erro;
  }
}

/**
 * As sessões desta casa — **para a própria casa ver**.
 *
 * Não é uma cortesia: é a segunda das quatro condições. Um acesso que só aparece
 * do nosso lado é um acesso que o cliente não pode contestar.
 *
 * E lê-se com o escopo do INQUILINO, pela política de RLS dele. A tela do
 * cliente e a nossa lêem a mesma tabela — não há uma versão para mostrar e outra
 * para guardar.
 */
export function sessoesDaCasa(db: ClienteComEscopo, organizationId: string) {
  return db.supportSession.findMany({
    where: { organizationId },
    orderBy: { abertaEm: 'desc' },
    take: 100,
  });
}

/** Termina uma sessão à mão. A expiração continua a valer sem isto. */
export async function terminarSessaoDeSuporte(
  db: ClienteComEscopo, id: string, motivo: string, staffEmail: string,
) {
  const linhas = await db.$queryRaw<{ terminar_sessao_de_suporte: boolean }[]>`
    SELECT terminar_sessao_de_suporte(${id}::uuid, ${motivo}, ${staffEmail})`;
  if (linhas[0]?.terminar_sessao_de_suporte !== true) {
    // Ausência: ou não existe, ou já estava fechada. Fechar duas vezes não é
    // erro de quem carrega — é o estado normal de quem chegou depois.
    throw new RecusaDePlataforma('SESSAO_JA_TERMINADA',
      'não havia sessão viva com esse identificador');
  }
  return (await db.supportSession.findFirst({ where: { id } }))!;
}

/**
 * Esta sessão autoriza esta operação **agora**?
 *
 * As duas metades: viva (não terminada e não expirada) **e** com âmbito. Uma
 * sem a outra não chega — e a primeira é a que se esquece, porque parece que
 * uma sessão que existe é uma sessão que vale.
 */
export async function sessaoAutoriza(
  db: ClienteComEscopo,
  id: string,
  preciso: AmbitoDeSuporte,
  agora: Date = new Date(),
) {
  const sessao = await db.supportSession.findFirst({ where: { id } });
  if (!sessao) throw new RecusaDePlataforma('SESSAO_DESCONHECIDA', id);
  if (!sessaoViva(sessao, agora)) {
    throw new RecusaDePlataforma(
      sessao.terminadaEm !== null ? 'SESSAO_JA_TERMINADA' : 'SESSAO_EXPIRADA');
  }
  if (!(sessao.ambito as AmbitoDeSuporte[]).includes(preciso)) {
    throw new RecusaDePlataforma('FORA_DE_AMBITO', preciso);
  }
  return sessao;
}

export function politicaDeAcesso(db: ClienteComEscopo, organizationId: string) {
  return db.accessPolicy.findFirst({ where: { organizationId } });
}

/** A casa escreve a política dela. É dela, e não nossa. */
export function guardarPoliticaDeAcesso(
  db: ClienteComEscopo,
  organizationId: string,
  dados: {
    readonly exigeConsentimento: boolean;
    readonly duracaoMaximaMin: number;
    readonly actualizadaPor: string;
  },
) {
  return db.accessPolicy.upsert({
    where: { organizationId },
    create: { organizationId, ...dados },
    update: { ...dados, actualizadaEm: new Date() },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FRONTEIRA 3 · conceder uma capacidade, pelo caminho próprio
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Concede uma capacidade a uma casa.
 *
 * ── E repare-se no que esta função não faz ────────────────────────────────
 *
 * Não escreve em `entitlement_grants`. **Não pode** — o papel de runtime tem
 * `SELECT` e mais nada, desde o E05. O que ela faz é chamar a
 * `conceder_capacidade`, que corre como dono e escreve a concessão **e a
 * auditoria na mesma instrução**.
 *
 * Conceder e registar não são duas coisas. Se fossem, a segunda seria a que
 * falha num dia com pressa.
 */
export async function concederCapacidade(
  db: ClienteComEscopo,
  organizationId: string,
  dados: {
    readonly capacidade: string;
    readonly quota: number | null;
    readonly validoAte: Date | null;
    readonly staffUserId: string;
    readonly staffEmail: string;
    readonly motivo: string;
  },
): Promise<string> {
  try {
    const linhas = await db.$queryRaw<{ conceder_capacidade: string }[]>`
      SELECT conceder_capacidade(
        ${organizationId}::uuid, ${dados.capacidade}, ${dados.quota},
        ${dados.validoAte}::timestamptz, ${dados.staffUserId}::uuid,
        ${dados.staffEmail}, ${dados.motivo})`;
    return linhas[0]?.conceder_capacidade as string;
  } catch (erro) {
    const texto = String(erro);
    if (texto.includes('concessao_sem_pessoa')) {
      throw new RecusaDePlataforma('SEM_PESSOA', 'conceder exige saber QUEM concedeu');
    }
    if (texto.includes('concessao_sem_motivo')) {
      throw new RecusaDePlataforma('SEM_MOTIVO', 'um motivo curto não explica nada');
    }
    if (texto.includes('nao_e_da_plataforma')) {
      throw new RecusaDePlataforma('NAO_E_DA_PLATAFORMA');
    }
    throw erro;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FRONTEIRA 4 · segredos — o estado, nunca o valor
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Os segredos da plataforma, **como se podem mostrar**.
 *
 * A projecção é uma lista de permissão, e passa pelo `mostrarSegredo` do
 * domínio. Não é que o valor esteja escondido: é que ele não existe deste lado —
 * vive no ambiente autorizado, e esta tabela guarda o que se pode dizer em voz
 * alta.
 *
 * O `configurado` calcula-se contra o ambiente **no momento da leitura**, e não
 * se guarda: uma coluna que diz «está configurado» é uma coluna que fica a
 * mentir no dia em que alguém tira a variável.
 */
/**
 * ── E aceita os DOIS clientes, de propósito ───────────────────────────────
 *
 * Nem a `platform_secrets` nem a `platform_incidents` têm `organization_id`:
 * não são de inquilino nenhum. Exigir um `ClienteComEscopo` obrigava as telas da
 * plataforma a inventar uma organização para lho dar — e inventar um inquilino
 * para ler o que não é de nenhum é o princípio de um defeito.
 *
 * O marcador de tipo do `escopo.ts` apanhou-o à primeira compilação.
 */
export async function segredosDaPlataforma(
  db: ClienteComEscopo | ClienteComIdentidade,
  ambiente: Record<string, string | undefined> = process.env,
) {
  const segredos = await db.platformSecret.findMany({ orderBy: { nome: 'asc' } });
  return segredos.map((s: {
    nome: string; descricao: string; configurado: boolean;
    rodadoEm: Date | null; rodadoPor: string | null;
  }) => ({
    ...mostrarSegredo({ ...s, configurado: ambiente[s.nome] !== undefined }),
    descricao: s.descricao,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// FRONTEIRA 5 · trabalhos e reprocessamento
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Põe um trabalho na fila, ou devolve o que já lá estava.
 *
 * A identidade deriva de `(tipo, alvo, tentativa)` e a base tem restrição única
 * sobre ela. Reprocessar é normal — pede-se a **tentativa seguinte** —, e pedir
 * duas vezes a mesma tentativa devolve o mesmo trabalho.
 *
 * `upsert` e não `create` com apanha do erro: dentro de uma transacção, uma
 * instrução que falha aborta-a toda. Foi a lição do E32.
 */
export async function enfileirarTrabalho(
  db: ClienteComEscopo,
  dados: {
    readonly organizationId: string | null;
    readonly tipo: string;
    readonly alvo: string;
    readonly tentativa?: number;
  },
) {
  const tentativa = dados.tentativa ?? 1;
  const identidade = identidadeDeTrabalho(dados.tipo, dados.alvo, tentativa);
  return db.platformJob.upsert({
    where: { identidade },
    create: {
      organizationId: dados.organizationId, tipo: dados.tipo,
      alvo: dados.alvo, tentativa, identidade,
    },
    // Vazio: pedir a mesma tentativa outra vez devolve a que existe, tal como
    // ela está. Escrever aqui era deixar o reenvio mexer num trabalho a correr.
    update: {},
  });
}

/** Reprocessa: é a tentativa SEGUINTE, e por isso é um trabalho novo. */
export async function reprocessarTrabalho(db: ClienteComEscopo, id: string) {
  const anterior = await db.platformJob.findFirst({ where: { id } });
  if (!anterior) throw new RecusaDePlataforma('SESSAO_DESCONHECIDA', id);
  return enfileirarTrabalho(db, {
    organizationId: anterior.organizationId,
    tipo: anterior.tipo, alvo: anterior.alvo,
    tentativa: anterior.tentativa + 1,
  });
}

export function trabalhosDaPlataforma(db: ClienteComEscopo | ClienteComIdentidade) {
  return db.platformJob.findMany({ orderBy: { criadoEm: 'desc' }, take: 100 });
}

// ═══════════════════════════════════════════════════════════════════════════
// Ajuda, incidentes, moderação, retenção
// ═══════════════════════════════════════════════════════════════════════════

export function abrirPedidoDeAjuda(
  db: ClienteComEscopo,
  organizationId: string,
  dados: { readonly assunto: string; readonly corpo: string; readonly abertoPor: string },
) {
  return db.helpTicket.create({ data: { organizationId, ...dados } });
}

export function pedidosDeAjuda(db: ClienteComEscopo, organizationId: string) {
  return db.helpTicket.findMany({
    where: { organizationId }, orderBy: { criadoEm: 'desc' }, take: 100,
  });
}

/** Os incidentes que o cliente vê. Um incidente só nosso é um telefone a tocar. */
export function incidentesPublicos(db: ClienteComEscopo | ClienteComIdentidade) {
  return db.platformIncident.findMany({
    where: { publico: true }, orderBy: { comecouEm: 'desc' }, take: 20,
  });
}

export function incidentesTodos(db: ClienteComEscopo | ClienteComIdentidade) {
  return db.platformIncident.findMany({ orderBy: { comecouEm: 'desc' }, take: 50 });
}

export function denuncias(db: ClienteComEscopo, organizationId: string) {
  return db.abuseReport.findMany({
    where: { organizationId }, orderBy: { criadoEm: 'desc' }, take: 50,
  });
}

export function politicaDeRetencao(db: ClienteComEscopo, organizationId: string) {
  return db.retentionPolicy.findFirst({ where: { organizationId } });
}

/**
 * A casa escreve a retenção dela.
 *
 * `null` é **«não decidido»**, e não «para sempre». A tela di-lo por palavras: a
 * política concreta depende de conselho jurídico, e escrever um número por
 * omissão era decidir por quem tem de decidir.
 */
export function guardarPoliticaDeRetencao(
  db: ClienteComEscopo,
  organizationId: string,
  dados: {
    readonly diasPedidos: number | null;
    readonly diasClientes: number | null;
    readonly diasAuditoria: number | null;
    readonly actualizadaPor: string;
  },
) {
  return db.retentionPolicy.upsert({
    where: { organizationId },
    create: { organizationId, ...dados },
    update: { ...dados, actualizadaEm: new Date() },
  });
}

/** A auditoria desta casa — para a casa (SET-011) e para nós (PLAT-013). */
export function auditoriaDaCasa(db: ClienteComEscopo, organizationId: string) {
  return db.auditEvent.findMany({
    where: { organizationId }, orderBy: { createdAt: 'desc' }, take: 200,
  });
}
