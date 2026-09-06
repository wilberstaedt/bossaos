import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  destinoPermitido, estadoDaChave, temEscopo, type Escopo,
} from '@bossaos/domain';
import type { ClienteComEscopo } from './escopo.ts';

/**
 * Integrações, API e cobrança do SaaS — o motor do E32.
 *
 * Contrato: `docs/architecture/integracoes-e-cobranca-do-saas.md`.
 *
 * ── O que este ficheiro NÃO tem, e é a decisão ────────────────────────────
 *
 * Não tem `concederPlano`. Não tem nada que escreva em `subscriptions` ou em
 * `entitlement_grants` — e não é disciplina: o E05 tirou essa permissão ao
 * runtime, e esta etapa **não lha devolve**. A única forma de um evento chegar a
 * mudar uma concessão é a `aplicar_evento_de_cobranca`, que corre como dono e
 * resolve a organização pela ligação verificada.
 *
 * Um webhook que escrevesse lá directamente contornava a fronteira do E05 por
 * fora, e seria o mesmo defeito com carimbo de integração.
 */

export type RecusaDeIntegracao =
  | 'CHAVE_DESCONHECIDA'
  | 'CHAVE_REVOGADA'
  | 'CHAVE_EXPIRADA'
  | 'FORA_DE_AMBITO'
  | 'DESTINO_RECUSADO'
  | 'ASSINATURA_NAO_CONFERE'
  | 'SEM_LIGACAO';

export class RecusaDaIntegracao extends Error {
  readonly motivo: RecusaDeIntegracao;

  constructor(motivo: RecusaDeIntegracao, detalhe?: string) {
    super(detalhe ? `${motivo}: ${detalhe}` : motivo);
    this.name = 'RecusaDaIntegracao';
    this.motivo = motivo;
  }
}

/** O resumo de uma chave. Determinístico: é por ele que se procura. */
export function resumirChave(chave: string): string {
  return createHash('sha256').update(chave, 'utf8').digest('hex');
}

/**
 * Cria uma chave de API — e **devolve-a uma vez**.
 *
 * ── O valor sai daqui e não volta a existir ───────────────────────────────
 *
 * O que fica na base é o resumo. Não há função para ler a chave, não há coluna
 * onde ela caiba, e um ecrã que a mostrasse outra vez estaria a provar que ela
 * está guardada em claro.
 *
 * O `prefixo` é o que a lista mostra para a pessoa reconhecer qual é qual. São
 * os primeiros caracteres do valor e não abrem nada — como os quatro últimos
 * dígitos de um cartão.
 */
export async function criarChave(
  db: ClienteComEscopo,
  organizationId: string,
  dados: {
    readonly nome: string;
    readonly escopos: readonly Escopo[];
    readonly expiraEm: Date;
    readonly criadaPor: string;
  },
): Promise<{ readonly id: string; readonly chave: string; readonly prefixo: string }> {
  const valor = `bk_${randomBytes(24).toString('base64url')}`;
  const prefixo = valor.slice(0, 11);

  const criada = await db.apiKey.create({
    data: {
      organizationId, nome: dados.nome, prefixo,
      resumo: resumirChave(valor),
      escopos: [...dados.escopos],
      expiraEm: dados.expiraEm,
      criadaPor: dados.criadaPor,
    },
    select: { id: true },
  });

  // Uma vez, e só aqui.
  return { id: criada.id, chave: valor, prefixo };
}

/**
 * Resolve uma chave apresentada, e diz se ela serve **para esta operação**.
 *
 * ── O âmbito é um argumento OBRIGATÓRIO ───────────────────────────────────
 *
 * Não há como chamar isto sem dizer para que é. Um `verificarChave(chave)` sem
 * âmbito seria um portão à entrada — e um portão à entrada é um portão que a
 * próxima rota esquece. Aqui o compilador obriga a rota nova a escolher.
 */
export async function verificarChave(
  db: ClienteComEscopo,
  chaveApresentada: string,
  precisa: Escopo,
  agora: Date = new Date(),
) {
  const chave = await db.apiKey.findFirst({
    where: { resumo: resumirChave(chaveApresentada) },
    select: {
      id: true, organizationId: true, escopos: true,
      revogadaEm: true, expiraEm: true, nome: true,
    },
  });
  if (!chave) throw new RecusaDaIntegracao('CHAVE_DESCONHECIDA');

  const estado = estadoDaChave(chave, agora);
  if (estado === 'revogada') throw new RecusaDaIntegracao('CHAVE_REVOGADA');
  if (estado === 'expirada') throw new RecusaDaIntegracao('CHAVE_EXPIRADA');

  if (!temEscopo(chave.escopos as Escopo[], precisa)) {
    throw new RecusaDaIntegracao('FORA_DE_AMBITO', precisa);
  }

  return chave;
}

/**
 * Revoga uma chave. **Tem efeito imediato.**
 *
 * Não há cache a invalidar porque não há cache: a `verificarChave` vai à base
 * todas as vezes. Custa uma consulta por pedido, e é o preço certo — o caso em
 * que se revoga é alguém ter levado a chave.
 */
export function revogarChave(db: ClienteComEscopo, id: string, quem: string) {
  return db.apiKey.update({
    where: { id },
    data: { revogadaEm: new Date(), revogadaPor: quem },
  });
}

export function listarChaves(db: ClienteComEscopo, organizationId: string) {
  return db.apiKey.findMany({
    where: { organizationId },
    // O resumo NÃO entra na projecção. Ele não abre nada, mas também não serve
    // para nada do lado de fora, e o que não sai não vaza.
    select: {
      id: true, nome: true, prefixo: true, escopos: true,
      expiraEm: true, revogadaEm: true, criadaEm: true, ultimoUsoEm: true,
    },
    orderBy: { criadaEm: 'desc' },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Webhooks de saída
// ═══════════════════════════════════════════════════════════════════════════

/** A assinatura vai sobre o corpo **exactamente como sai**. */
export function assinarCorpo(corpo: string, segredo: string): string {
  return createHmac('sha256', segredo).update(corpo, 'utf8').digest('hex');
}

export function assinaturaConfere(
  corpoCru: string, assinatura: string | null, segredo: string,
): boolean {
  if (!assinatura) return false;
  const esperada = createHmac('sha256', segredo).update(corpoCru, 'utf8').digest();
  let recebida: Buffer;
  try {
    recebida = Buffer.from(assinatura, 'hex');
  } catch {
    return false;
  }
  // Comprimentos diferentes fazem o `timingSafeEqual` atirar.
  if (recebida.length !== esperada.length) return false;
  return timingSafeEqual(recebida, esperada);
}

export async function criarEndpoint(
  db: ClienteComEscopo,
  organizationId: string,
  dados: {
    readonly url: string; readonly eventos: readonly string[];
    readonly segredo: string; readonly criadoPor: string;
  },
) {
  // O destino valida-se ANTES de sair, e antes de sequer se guardar. Guardar um
  // destino interno e só verificar no envio era deixar a arma carregada.
  const permitido = destinoPermitido(dados.url);
  if (!permitido.ok) throw new RecusaDaIntegracao('DESTINO_RECUSADO', permitido.razao);

  return db.webhookEndpoint.create({
    data: {
      organizationId, url: dados.url, eventos: [...dados.eventos],
      segredoResumo: resumirChave(dados.segredo), criadoPor: dados.criadoPor,
    },
  });
}

/**
 * Põe uma entrega na fila, já assinada.
 *
 * A versão e o identificador de entrega viajam **no corpo**, e não só nos
 * cabeçalhos: quem recebe guarda o corpo, e é sobre o que guardou que vai
 * deduplicar daqui a uma hora.
 */
export async function enfileirarEntrega(
  db: ClienteComEscopo,
  organizationId: string,
  endpointId: string,
  evento: string,
  dados: Record<string, unknown>,
  segredo: string,
  versao = 1,
) {
  const entregaId = crypto.randomUUID();
  const corpo = JSON.stringify({ entregaId, evento, versao, dados });
  return db.webhookDelivery.create({
    data: {
      organizationId, endpointId, evento, versao, entregaId,
      corpo, assinatura: assinarCorpo(corpo, segredo),
    },
  });
}

/**
 * Podemos seguir este redireccionamento?
 *
 * ── A outra metade da protecção de destinos ───────────────────────────────
 *
 * Validar o destino uma vez não chega: um endereço público que responde `302`
 * para `169.254.169.254` faz o pedido chegar lá na mesma. Isto chama-se **em
 * cada salto**, e é a razão pela qual a validação vive numa função pura em vez
 * de estar embutida na criação do endpoint.
 */
export function seguroParaSeguir(url: string): boolean {
  return destinoPermitido(url).ok;
}

// ═══════════════════════════════════════════════════════════════════════════
// Cobrança do SaaS — a fronteira que decide a etapa
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Liga um cliente do provedor a uma organização. **Por alguém autenticado.**
 *
 * É esta linha que autoriza tudo o que vem depois. Sem ela, um evento de
 * cobrança fica parado e não muda nada — por mais bem assinado que esteja.
 */
export function ligarClienteSaas(
  db: ClienteComEscopo,
  organizationId: string,
  provedor: string,
  provedorClienteId: string,
  criadoPor: string,
) {
  return db.saasCustomer.create({
    data: { organizationId, provedor, provedorClienteId, criadoPor },
  });
}

/**
 * Grava um evento de cobrança como ele chegou.
 *
 * ── O que esta função faz, e o que NÃO faz ────────────────────────────────
 *
 * Faz: verifica a assinatura sobre o corpo cru, e grava. É tudo.
 *
 * Não faz: não resolve a organização, não toca em concessões, não olha para o
 * `organization_id` do corpo a não ser para o **guardar como alegação**. O nome
 * do argumento diz isso em voz alta — `organizationIdAlegado` —, e o nome da
 * coluna também. Quem quisesse confiar nele teria de escrever a palavra
 * «alegado» e continuar mesmo assim.
 *
 * E a chamada é feita **sem escopo de inquilino**: quando o evento chega ainda
 * não se sabe de quem é. Essa é a fronteira inteira numa assinatura de função.
 */
export async function receberEventoDeCobranca(
  db: ClienteComEscopo,
  dados: {
    readonly provedor: string;
    readonly provedorEventoId: string;
    readonly tipo: string;
    readonly provedorClienteId: string;
    readonly planoCodigo: string | null;
    readonly organizationIdAlegado: string | null;
    readonly corpoCru: string;
    readonly assinatura: string | null;
    readonly segredo: string;
  },
) {
  const confere = assinaturaConfere(dados.corpoCru, dados.assinatura, dados.segredo);

  // Reenviar é normal — a rede falha. A identidade é a do provedor, e a
  // restrição única deduplica: o segundo devolve o primeiro.
  const jaExiste = await db.saasBillingEvent.findFirst({
    where: { provedor: dados.provedor, provedorEventoId: dados.provedorEventoId },
  });
  if (jaExiste) return jaExiste;

  return db.saasBillingEvent.create({
    data: {
      provedor: dados.provedor,
      provedorEventoId: dados.provedorEventoId,
      tipo: dados.tipo,
      provedorClienteId: dados.provedorClienteId,
      planoCodigo: dados.planoCodigo,
      organizationIdAlegado: dados.organizationIdAlegado,
      corpoCru: dados.corpoCru,
      assinaturaConfere: confere,
    },
  });
}

/**
 * Manda aplicar um evento — e **não escolhe a organização**.
 *
 * Chama a função privilegiada, que corre como dono e resolve a organização pela
 * `saas_customers`. Esta camada não tem, e não pode ter, uma palavra a dizer
 * sobre isso: o único argumento é o identificador do evento.
 *
 * Devolve o estado com que ele ficou — incluindo `SEM_VINCULO`, que é a resposta
 * certa a um evento que ninguém pediu.
 */
export async function aplicarEventoDeCobranca(
  db: ClienteComEscopo, eventoId: string,
): Promise<'RECEBIDO' | 'SEM_VINCULO' | 'APLICADO' | 'RECUSADO'> {
  const linhas = await db.$queryRaw<{ aplicar_evento_de_cobranca: string }[]>`
    SELECT aplicar_evento_de_cobranca(${eventoId}::uuid)`;
  return linhas[0]?.aplicar_evento_de_cobranca as
    'RECEBIDO' | 'SEM_VINCULO' | 'APLICADO' | 'RECUSADO';
}

// ═══════════════════════════════════════════════════════════════════════════
// Integrações e o seu registo
// ═══════════════════════════════════════════════════════════════════════════

export function listarIntegracoes(db: ClienteComEscopo, organizationId: string) {
  return db.integration.findMany({
    where: { organizationId },
    orderBy: [{ familia: 'asc' }, { provedor: 'asc' }],
  });
}

/**
 * Declara uma integração **desligada**, com os requisitos por palavras.
 *
 * Um conector que finge funcionar é pior do que um que diz que não está ligado:
 * o primeiro só se descobre quando um cliente contava com ele. E a base recusa
 * `DESLIGADA` sem requisitos — porque um beco sem indicação é o mesmo que
 * silêncio.
 */
export function declararIntegracao(
  db: ClienteComEscopo,
  organizationId: string,
  familia: string,
  provedor: string,
  requisitos: string,
) {
  return db.integration.upsert({
    where: {
      uma_integracao_por_provedor: { organizationId, familia, provedor },
    },
    create: { organizationId, familia, provedor, estado: 'DESLIGADA', requisitos },
    update: { requisitos, actualizadaEm: new Date() },
  });
}

export function registosDaIntegracao(db: ClienteComEscopo, organizationId: string) {
  return db.integrationLog.findMany({
    where: { organizationId },
    orderBy: { ocorridoEm: 'desc' },
    take: 100,
    include: { chave: { select: { id: true, nome: true, prefixo: true } } },
  });
}

export function facturasDoSaas(db: ClienteComEscopo, organizationId: string) {
  return db.saasInvoice.findMany({
    where: { organizationId },
    orderBy: { emitidaEm: 'desc' },
  });
}
