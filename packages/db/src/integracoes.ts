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

/**
 * Entrega uma linha da fila, seguindo redireccionamentos **à mão**.
 *
 * ── Porque é que os redireccionamentos se seguem à mão ────────────────────
 *
 * `redirect: 'follow'` faz o `fetch` seguir sozinho, e aí a validação do
 * destino vale só para o primeiro salto. Um endereço público que responde `302`
 * para `169.254.169.254` leva o nosso servidor lá na mesma — e o cliente que
 * escreveu o endereço nem precisa de controlar o serviço de destino, só de o
 * apontar a um redireccionador.
 *
 * Com `redirect: 'manual'` cada salto volta a passar pelo `seguroParaSeguir`, e
 * a cadeia tem fim: cinco saltos, e depois desiste. Uma cadeia sem limite é
 * outra forma de a mesma porta.
 *
 * O `buscar` é injectado para a prova poder responder sem rede. Não é para
 * facilitar o teste: é para o teste poder montar o redireccionamento hostil,
 * que é a coisa que ninguém consegue montar contra a internet real.
 */
export async function entregar(
  db: ClienteComEscopo,
  entregaId: string,
  buscar: (url: string, init: RequestInit) => Promise<Response> = fetch,
  saltosMaximos = 5,
) {
  const entrega = await db.webhookDelivery.findFirst({
    where: { id: entregaId },
    include: { endpoint: { select: { url: true } } },
  });
  if (!entrega) throw new RecusaDaIntegracao('DESTINO_RECUSADO', 'entrega desconhecida');

  let url = entrega.endpoint.url;
  let resposta: Response | null = null;

  for (let salto = 0; salto <= saltosMaximos; salto += 1) {
    if (!seguroParaSeguir(url)) {
      // Não é um erro de rede: é uma recusa nossa, e fica escrita como tal.
      return db.webhookDelivery.update({
        where: { id: entregaId },
        data: { estado: 'DESISTIU', tentativas: { increment: 1 } },
      });
    }

    resposta = await buscar(url, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'application/json',
        'x-bossaos-assinatura': entrega.assinatura,
        'x-bossaos-entrega': entrega.entregaId,
        'x-bossaos-versao': String(entrega.versao),
      },
      body: entrega.corpo,
    });

    if (resposta.status < 300 || resposta.status >= 400) break;
    const seguinte = resposta.headers.get('location');
    if (!seguinte) break;
    url = new URL(seguinte, url).toString();
    resposta = null;
  }

  if (!resposta) {
    return db.webhookDelivery.update({
      where: { id: entregaId },
      data: { estado: 'DESISTIU', tentativas: { increment: 1 } },
    });
  }

  const entregue = resposta.status >= 200 && resposta.status < 300;
  return db.webhookDelivery.update({
    where: { id: entregaId },
    data: {
      estado: entregue ? 'ENTREGUE' : 'FALHOU',
      tentativas: { increment: 1 },
      respostaEstado: resposta.status,
      ...(entregue ? { entregueEm: new Date() } : {}),
    },
  });
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
 * ── O que estava aqui, e porque saiu ──────────────────────────────────────
 *
 * Havia aqui um `receberEventoDeCobranca` e um `aplicarEventoDeCobranca` que
 * recebiam `ClienteComEscopo`. **Eram duplicados mortos**: o caminho vivo é o
 * `saas-publico.ts`, que não recebe escopo nenhum — porque quando o webhook
 * chega ainda não se sabe de quem é, e essa é a fronteira inteira.
 *
 * A varredura de alcance apanhou-os sem chamador. Podia tê-los ligado a alguma
 * coisa para calar a guarda; a resposta certa era apagá-los. Duas funções com o
 * mesmo nome e assinaturas diferentes, uma das quais aceita um inquilino de
 * fora, é o convite exacto para alguém chamar a errada — e a errada é a que
 * deixa quem chama escolher a organização.
 */

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
