import type { ClienteComEscopo } from './escopo.ts';

/**
 * CRM, fidelidade e campanhas — o motor do E27.
 *
 * Contrato: `docs/architecture/consentimento-e-campanhas.md`.
 *
 * ── O que este ficheiro NÃO tem, e é a decisão ────────────────────────────
 *
 * Não tem `importarContactos`. Não tem `definirAceitaCampanhas`. Não tem
 * nenhuma função que escreva o saldo de pontos, nem nenhuma que copie o
 * contacto de uma reserva ou de uma espera para o CRM.
 *
 * O telefone que alguém deixou para confirmar uma reserva não é uma lista de
 * marketing, e não há aqui a função que o transformaria nisso.
 */

export type RecusaDeCrm =
  | 'SEM_CONSENTIMENTO'
  | 'PONTOS_INVALIDOS'
  | 'SALDO_INSUFICIENTE'
  | 'SEM_ORIGEM'
  | 'CANAL_SEM_CONTACTO';

export class RecusaDoCrm extends Error {
  readonly motivo: RecusaDeCrm;

  constructor(motivo: RecusaDeCrm, detalhe?: string) {
    super(detalhe ? `${motivo}: ${detalhe}` : motivo);
    this.name = 'RecusaDoCrm';
    this.motivo = motivo;
  }
}

export type Finalidade = 'SERVICO' | 'CAMPANHA';
/**
 * O canal do CONTACTO — não confundir com o `Canal` das mensagens
 * transaccionais, que é outro eixo. Aqui a pergunta é «por onde é que esta
 * pessoa aceitou ser contactada», e a resposta é por canal e por finalidade.
 */
export type CanalDeContacto = 'EMAIL' | 'SMS';

// ── Pessoas ────────────────────────────────────────────────────────────────

export function criarCliente(db: ClienteComEscopo, dados: {
  organizationId: string; locationId: string; nome: string;
  email?: string; telefone?: string; origem?: string;
}) {
  return db.customer.create({
    data: {
      organizationId: dados.organizationId, locationId: dados.locationId,
      nome: dados.nome.trim(),
      email: dados.email?.trim() || null,
      telefone: dados.telefone?.trim() || null,
      origem: dados.origem?.trim() || null,
    },
  });
}

export function clientesDaUnidade(db: ClienteComEscopo, locationId: string) {
  return db.customer.findMany({
    where: { locationId, juntadoAId: null }, orderBy: { nome: 'asc' },
    select: {
      id: true, nome: true, email: true, telefone: true, origem: true,
      saldoPontos: true, criadoEm: true,
    },
  });
}

/**
 * Junta dois contactos. O absorvido **não se apaga**.
 *
 * Quem for ver uma visita antiga tem de chegar à pessoa certa; apagar a linha
 * partia essa ligação e a visita ficava órfã. E o produto não adivinha que dois
 * contactos são a mesma pessoa — junta quando alguém o decide.
 */
export async function juntarContactos(db: ClienteComEscopo, dados: {
  absorvidoId: string; ficaId: string;
}) {
  if (dados.absorvidoId === dados.ficaId) return null;
  // Os pontos seguem a pessoa que fica: são valor dela, não da linha.
  const movimentos = await db.loyaltyMovement.findMany({
    where: { customerId: dados.absorvidoId }, select: { id: true },
  });
  if (movimentos.length > 0) {
    await db.loyaltyMovement.updateMany({
      where: { customerId: dados.absorvidoId },
      data: { customerId: dados.ficaId },
    });
  }
  return db.customer.update({
    where: { id: dados.absorvidoId }, data: { juntadoAId: dados.ficaId },
  });
}

// ── Consentimento: um ACONTECIMENTO, e o estado deriva-se ──────────────────

/**
 * Regista um consentimento — dado ou retirado.
 *
 * A origem é obrigatória: sem ela, um consentimento não se consegue defender a
 * ninguém. É a mesma exigência que o contrato faz ao registo de qualquer acção
 * sensível.
 */
export function registarConsentimento(db: ClienteComEscopo, dados: {
  organizationId: string; customerId: string;
  finalidade: Finalidade; canal: CanalDeContacto;
  accao: 'DADO' | 'RETIRADO'; origem: string; expiraEm?: Date;
}) {
  if (!dados.origem.trim()) {
    throw new RecusaDoCrm('SEM_ORIGEM',
      'um consentimento sem origem não se consegue defender a ninguém');
  }
  return db.consentEvent.create({
    data: {
      organizationId: dados.organizationId, customerId: dados.customerId,
      finalidade: dados.finalidade, canal: dados.canal, accao: dados.accao,
      origem: dados.origem.trim(),
      expiraEm: dados.expiraEm ?? null,
    },
  });
}

/**
 * O estado actual, **derivado** — e quem o calcula é a BASE.
 *
 * Chamar a função SQL em vez de reimplementar a regra aqui não é preguiça: é a
 * única maneira de a resposta que o ecrã mostra ser exactamente a que o gatilho
 * usa para deixar ou não gravar o envio. Duas implementações da mesma regra são
 * duas regras no dia em que uma mudar.
 */
export async function temConsentimento(
  db: ClienteComEscopo, customerId: string, finalidade: Finalidade, canal: CanalDeContacto,
): Promise<boolean> {
  const r = await db.$queryRawUnsafe<{ tem: boolean }[]>(
    `SELECT tem_consentimento($1::uuid, $2::"FinalidadeDeContacto", $3::"CanalDeContacto") AS tem`,
    customerId, finalidade, canal,
  );
  return r[0]?.tem === true;
}

/** As quatro respostas de uma pessoa, para a tela de preferências. */
export async function consentimentosDe(db: ClienteComEscopo, customerId: string) {
  const pares: { finalidade: Finalidade; canal: CanalDeContacto }[] = [
    { finalidade: 'SERVICO', canal: 'EMAIL' },
    { finalidade: 'SERVICO', canal: 'SMS' },
    { finalidade: 'CAMPANHA', canal: 'EMAIL' },
    { finalidade: 'CAMPANHA', canal: 'SMS' },
  ];
  const historico = await db.consentEvent.findMany({
    where: { customerId }, orderBy: { momento: 'desc' },
    select: {
      id: true, finalidade: true, canal: true, accao: true, origem: true,
      expiraEm: true, momento: true,
    },
  });
  const estado = await Promise.all(pares.map(async (p) => ({
    ...p, vivo: await temConsentimento(db, customerId, p.finalidade, p.canal),
  })));
  return { estado, historico };
}

// ── Segmentos: uma REGRA, nunca uma lista ──────────────────────────────────

export interface RegraDeSegmento {
  /** Só quem tem consentimento vivo desta finalidade e canal. */
  exigeConsentimento?: { finalidade: Finalidade; canal: CanalDeContacto };
  /** Pontos mínimos. */
  pontosMinimos?: number;
  /** Origem exacta, quando a casa quer falar só com quem veio de um sítio. */
  origem?: string;
}

export function criarSegmento(db: ClienteComEscopo, dados: {
  organizationId: string; locationId: string; nome: string; regra: RegraDeSegmento;
}) {
  return db.segment.create({
    data: {
      organizationId: dados.organizationId, locationId: dados.locationId,
      nome: dados.nome.trim(), regra: dados.regra as object,
    },
  });
}

export function segmentosDaUnidade(db: ClienteComEscopo, locationId: string) {
  return db.segment.findMany({
    where: { locationId }, orderBy: { nome: 'asc' },
    select: { id: true, nome: true, regra: true, criadoEm: true },
  });
}

/**
 * Quem entra — avaliado AGORA, e nunca congelado.
 *
 * A audiência é uma consulta sobre quem consentiu, e não uma lista guardada.
 * Uma lista exportada e reimportada perde a origem do consentimento; uma lista
 * colada não tem origem nenhuma.
 */
export async function audiencia(
  db: ClienteComEscopo, locationId: string, regra: RegraDeSegmento,
) {
  const candidatos = await db.customer.findMany({
    where: {
      locationId,
      juntadoAId: null,
      ...(regra.origem ? { origem: regra.origem } : {}),
      ...(regra.pontosMinimos === undefined
        ? {} : { saldoPontos: { gte: BigInt(regra.pontosMinimos) } }),
    },
    select: { id: true, nome: true, email: true, telefone: true, saldoPontos: true },
    orderBy: { nome: 'asc' },
  });
  if (!regra.exigeConsentimento) return candidatos;
  const { finalidade, canal } = regra.exigeConsentimento;
  const dentro = [];
  for (const c of candidatos) {
    if (await temConsentimento(db, c.id, finalidade, canal)) dentro.push(c);
  }
  return dentro;
}

// ── Campanhas: gravar ANTES de despachar ───────────────────────────────────

export function criarCampanha(db: ClienteComEscopo, dados: {
  organizationId: string; locationId: string; nome: string; canal: CanalDeContacto;
  segmentId: string; templateId: string; criadaPor?: string;
}) {
  return db.campaign.create({
    data: {
      organizationId: dados.organizationId, locationId: dados.locationId,
      nome: dados.nome.trim(), canal: dados.canal,
      segmentId: dados.segmentId, templateId: dados.templateId,
      criadaPor: dados.criadaPor ?? null,
    },
  });
}

export function campanhasDaUnidade(db: ClienteComEscopo, locationId: string) {
  return db.campaign.findMany({
    where: { locationId }, orderBy: { criadaEm: 'desc' },
    select: {
      id: true, nome: true, canal: true, estado: true, criadaEm: true,
      segmento: { select: { id: true, nome: true, regra: true } },
      modelo: { select: { id: true, nome: true } },
      envios: { select: { id: true } },
    },
  });
}

export interface ResultadoDaCampanha {
  gravados: number;
  recusados: { customerId: string; nome: string }[];
}

/**
 * Envia uma campanha — uma pessoa de cada vez, e cada uma verificada.
 *
 * ── Porque é que não é um `createMany` ────────────────────────────────────
 *
 * Um `createMany` grava tudo na mesma instrução, com o mesmo instante. A
 * retirada que chegue a meio não teria onde valer, e o aceite diz «antes do
 * próximo envio» e não «antes da próxima campanha».
 *
 * Uma a uma, o gatilho vê o estado do consentimento **no instante de cada
 * gravação**. Quem retirar depois de a campanha começar não recebe a dele.
 *
 * E a recusa não estoira a campanha: quem não consentiu fica de fora e é
 * **listado**, porque quem carregou no botão tem de saber a quem não foi.
 */
export async function enviarCampanha(
  db: ClienteComEscopo, campaignId: string,
): Promise<ResultadoDaCampanha> {
  const campanha = await db.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    select: {
      id: true, canal: true, locationId: true, organizationId: true,
      segmento: { select: { regra: true } },
    },
  });
  await db.campaign.update({ where: { id: campaignId }, data: { estado: 'A_ENVIAR' } });

  const pessoas = await audiencia(
    db, campanha.locationId, campanha.segmento.regra as RegraDeSegmento,
  );

  let gravados = 0;
  const recusados: { customerId: string; nome: string }[] = [];
  for (const p of pessoas) {
    // ── Perguntar ANTES de gravar, e não apanhar a recusa depois ──────────
    //
    // A primeira versão embrulhava a gravação num `try/catch` à espera da
    // recusa do gatilho. Não funciona, e a razão é a mesma do E24 noutra
    // forma: a excepção do gatilho **aborta a transacção**, e apanhá-la em
    // JavaScript não a desaborta — tudo o que vem a seguir morre com `25P02`.
    // Ali era uma colisão de índice e a saída foi `ON CONFLICT DO NOTHING`;
    // aqui é um `RAISE EXCEPTION`, que não tem `ON CONFLICT` nenhum.
    //
    // Por isso a pergunta faz-se primeiro, com a MESMA função que o gatilho
    // usa. Quem não passa fica de fora e é listado; o gatilho deixa de disparar
    // no caminho normal e passa a ser o que deve ser — a última linha de
    // defesa contra um caminho de código que se esqueça de perguntar.
    if (!(await temConsentimento(db, p.id, 'CAMPANHA', campanha.canal))) {
      recusados.push({ customerId: p.id, nome: p.nome });
      continue;
    }
    // `skipDuplicates` para o reenvio ser o mesmo envio: carregar duas vezes no
    // botão não manda duas mensagens.
    const r = await db.campaignDelivery.createMany({
      data: [{
        organizationId: campanha.organizationId, campaignId: campanha.id,
        customerId: p.id, canal: campanha.canal,
      }],
      skipDuplicates: true,
    });
    gravados += r.count;
  }
  // Se o gatilho disparar apesar disto, é uma retirada que chegou entre a
  // pergunta e a gravação. Não se apanha de propósito: a transacção aborta, a
  // campanha pára, e nada foi despachado. Parar é o lado seguro de falhar —
  // reenviar é barato porque o índice único faz do reenvio o mesmo envio;
  // desenviar uma mensagem não existe.
  await db.campaign.update({ where: { id: campaignId }, data: { estado: 'TERMINADA' } });
  return { gravados, recusados };
}

export function enviosDaCampanha(db: ClienteComEscopo, campaignId: string) {
  return db.campaignDelivery.findMany({
    where: { campaignId }, orderBy: { gravadoEm: 'asc' },
    select: {
      id: true, canal: true, estado: true, gravadoEm: true,
      cliente: { select: { id: true, nome: true } },
    },
  });
}

// ── Modelos de mensagem ────────────────────────────────────────────────────

export function criarModeloDeCampanha(db: ClienteComEscopo, dados: {
  organizationId: string; locationId: string; nome: string; canal: CanalDeContacto;
  assunto?: string; corpo: string;
}) {
  return db.campaignTemplate.create({
    data: {
      organizationId: dados.organizationId, locationId: dados.locationId,
      nome: dados.nome.trim(), canal: dados.canal,
      assunto: dados.assunto?.trim() || null, corpo: dados.corpo,
    },
  });
}

export function modelosDaUnidade(db: ClienteComEscopo, locationId: string) {
  return db.campaignTemplate.findMany({
    where: { locationId }, orderBy: { nome: 'asc' },
    select: { id: true, nome: true, canal: true, assunto: true, corpo: true },
  });
}

// ── Fidelidade: o saldo deriva-se ──────────────────────────────────────────

/** Lançar pontos. **A única porta que muda um saldo.** */
export async function movimentarPontos(db: ClienteComEscopo, dados: {
  organizationId: string; customerId: string;
  tipo: 'GANHO' | 'RESGATE' | 'AJUSTE' | 'EXPIRACAO';
  pontos: number; motivo: string;
}) {
  if (!Number.isInteger(dados.pontos) || dados.pontos <= 0) {
    throw new RecusaDoCrm('PONTOS_INVALIDOS',
      `os pontos são inteiros e positivos — o sinal vem do tipo, e veio ${dados.pontos}`);
  }
  if (!dados.motivo.trim()) {
    throw new RecusaDoCrm('SEM_ORIGEM', 'um movimento de pontos sem razão não se explica');
  }
  return db.loyaltyMovement.create({
    data: {
      organizationId: dados.organizationId, customerId: dados.customerId,
      tipo: dados.tipo, pontos: BigInt(dados.pontos), motivo: dados.motivo.trim(),
    },
  });
}

export function movimentosDePontos(db: ClienteComEscopo, customerId: string) {
  return db.loyaltyMovement.findMany({
    where: { customerId }, orderBy: { momento: 'desc' },
    select: { id: true, tipo: true, pontos: true, motivo: true, momento: true },
  });
}

export function recompensasDaUnidade(db: ClienteComEscopo, locationId: string) {
  return db.loyaltyReward.findMany({
    where: { locationId, arquivadaEm: null }, orderBy: { custoPontos: 'asc' },
    select: { id: true, nome: true, custoPontos: true, valorMenor: true, moeda: true },
  });
}

export function criarRecompensa(db: ClienteComEscopo, dados: {
  organizationId: string; locationId: string; nome: string;
  custoPontos: number; valorMenor: number;
}) {
  if (!Number.isInteger(dados.valorMenor)) {
    throw new RecusaDoCrm('PONTOS_INVALIDOS',
      'o valor é inteiro em unidade menor — cêntimos, não euros com vírgula');
  }
  return db.loyaltyReward.create({
    data: {
      organizationId: dados.organizationId, locationId: dados.locationId,
      nome: dados.nome.trim(),
      custoPontos: BigInt(dados.custoPontos), valorMenor: BigInt(dados.valorMenor),
    },
  });
}

/** Resgatar. O saldo não se escreve: lança-se um `RESGATE`. */
export async function resgatar(db: ClienteComEscopo, dados: {
  organizationId: string; customerId: string; rewardId: string;
}) {
  const recompensa = await db.loyaltyReward.findUniqueOrThrow({
    where: { id: dados.rewardId }, select: { nome: true, custoPontos: true },
  });
  const cliente = await db.customer.findUniqueOrThrow({
    where: { id: dados.customerId }, select: { saldoPontos: true },
  });
  if (cliente.saldoPontos < recompensa.custoPontos) {
    throw new RecusaDoCrm('SALDO_INSUFICIENTE',
      `tem ${cliente.saldoPontos} e a recompensa custa ${recompensa.custoPontos}`);
  }
  return movimentarPontos(db, {
    organizationId: dados.organizationId, customerId: dados.customerId,
    tipo: 'RESGATE', pontos: Number(recompensa.custoPontos),
    motivo: `resgate: ${recompensa.nome}`,
  });
}

// ── A voz de quem veio ─────────────────────────────────────────────────────

export function respostasDaUnidade(db: ClienteComEscopo, locationId: string) {
  return db.feedbackEntry.findMany({
    where: { locationId }, orderBy: { momento: 'desc' }, take: 200,
    select: {
      id: true, nota: true, comentario: true, origem: true, momento: true,
      cliente: { select: { id: true, nome: true } },
    },
  });
}

/** De onde chegam — contagem por origem, para a CRM-012. */
export async function origensDaUnidade(db: ClienteComEscopo, locationId: string) {
  const linhas = await db.customer.groupBy({
    by: ['origem'],
    where: { locationId, juntadoAId: null },
    _count: { _all: true },
  });
  return linhas
    .map((l) => ({ origem: l.origem ?? '—', quantos: l._count._all }))
    .sort((a, b) => b.quantos - a.quantos);
}

// ── A rua ──────────────────────────────────────────────────────────────────

/**
 * O feedback de quem esteve cá, escrito da rua.
 *
 * Passa por uma **porta estreita** (`SECURITY DEFINER`) porque quem responde não
 * tem sessão de inquilino — a mesma forma das outras portas públicas.
 *
 * E o consentimento de campanha viaja num argumento **separado**, que por
 * omissão é falso: deixar o email para haver resposta não é aceitar
 * publicidade, e um formulário que o infira da presença do email está a
 * inventar uma permissão.
 */
export async function feedbackDaRua(
  prisma: { $queryRawUnsafe: (q: string, ...v: unknown[]) => Promise<unknown> },
  slug: string,
  resposta: { nota: number; comentario?: string; email?: string; consenteCampanha?: boolean },
): Promise<string | null> {
  const linhas = await prisma.$queryRawUnsafe(
    'SELECT registar_feedback_publico($1, $2, $3, $4, $5) AS id',
    slug, resposta.nota, resposta.comentario ?? null,
    resposta.email ?? null, resposta.consenteCampanha === true,
  ) as { id: string | null }[];
  return linhas[0]?.id ?? null;
}
