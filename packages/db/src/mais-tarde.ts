import type { ClienteComEscopo } from './escopo.ts';
import { resolverHoraLocal } from './reservas.ts';

/**
 * Pedidos para mais tarde: takeaway e entrega.
 *
 * ── Um pedido para as 20h não é trabalho para agora ───────────────────────
 *
 * «O ecrã do KDS é um sítio onde tudo o que aparece é para fazer: pôr lá o que
 * não é para agora não é um incómodo visual, é ensinar a cozinha a ignorar o
 * ecrã.» E a resposta oposta tem o defeito simétrico: um pedido que aparece às
 * 19h55 para as 20h não se faz a tempo.
 *
 * A produção vê o pedido a partir do seu **momento de produção** — hora de
 * entrega menos o preparo —, e a passagem é por **relógio**, não por evento.
 *
 * ── E a hora de entrega é hora da CASA ────────────────────────────────────
 *
 * Aqui a hora não serve para avisar alguém: **arranca a cozinha**. Com o desvio
 * de Madrid, um pedido para as 20:30 com 25 minutos de preparo entraria em
 * produção às 22:05 locais — comida feita duas horas depois de a pessoa a ter
 * vindo buscar. Toda a hora escolhida por uma pessoa passa por
 * `resolverHoraLocal` antes de existir instante.
 */

export type RecusaDeAgendamento =
  | 'SEM_FUSO'
  | 'HORA_INEXISTENTE'
  | 'SEM_LINHAS';

export interface HoraDeEntrega {
  instante: Date;
  estado: 'NORMAL' | 'INEXISTENTE' | 'AMBIGUA';
}

/**
 * A hora de entrega que a pessoa escolheu, resolvida pelo fuso da unidade.
 *
 * **Sem fuso não se adivinha: recusa-se.** Adivinhar é o defeito — foi assim que
 * o E19 gravou hora de parede como UTC durante uma etapa inteira.
 *
 * Uma hora que NÃO EXISTE é recusada, e não empurrada para a seguinte: numa noite
 * de mudança de hora, aceitar as 02h30 e servir às 03h30 é combinar uma coisa e
 * fazer outra. Já a AMBÍGUA aceita-se — a hora existe, acontece é duas vezes — e
 * o estado sobe para quem tiver de o dizer.
 */
export async function horaDeEntrega(
  db: ClienteComEscopo, locationId: string, dia: string, hora: string,
): Promise<HoraDeEntrega | { recusa: RecusaDeAgendamento }> {
  const unidade = await db.location.findFirst({
    where: { id: locationId }, select: { fuso: true },
  });
  if (!unidade?.fuso) return { recusa: 'SEM_FUSO' };
  const r = await resolverHoraLocal(db, unidade.fuso, `${dia} ${hora}:00`);
  if (r.estado === 'INEXISTENTE') return { recusa: 'HORA_INEXISTENTE' };
  return r;
}

/**
 * O preparo de um pedido é o MAIOR das suas linhas, e não a soma.
 *
 * As estações trabalham em paralelo: a batata e o bife saem juntos, não um
 * depois do outro. Somar dava um momento de produção cedo demais e uma cozinha
 * a começar trabalho que ainda espera meia hora no passe.
 */
export async function preparoDoPedido(
  db: ClienteComEscopo, orderId: string,
): Promise<number> {
  const linhas = await db.orderLine.findMany({
    where: { orderId }, select: { productId: true },
  });
  const ids = linhas.flatMap((l) => (l.productId ? [l.productId] : []));
  if (ids.length === 0) return 0;
  const produtos = await db.product.findMany({
    where: { id: { in: ids } }, select: { preparoMin: true },
  });
  return produtos.reduce((maior, p) => Math.max(maior, p.preparoMin), 0);
}

/**
 * Agenda um pedido para uma hora.
 *
 * Escreve `entregarAs` e `preparoMin`; o **momento de produção não se escreve** —
 * o gatilho da base deriva-o. Um valor vindo de fora é substituído, e por isso
 * não há caminho por onde ele possa nascer errado.
 */
export async function agendarPedido(
  db: ClienteComEscopo, locationId: string, orderId: string,
  dia: string, hora: string,
): Promise<{ ok: true; entregarAs: Date; producaoEm: Date; estado: string }
  | { ok: false; motivo: RecusaDeAgendamento }> {
  const quando = await horaDeEntrega(db, locationId, dia, hora);
  if ('recusa' in quando) return { ok: false, motivo: quando.recusa };

  const preparo = await preparoDoPedido(db, orderId);
  const actualizado = await db.order.update({
    where: { id: orderId },
    data: { entregarAs: quando.instante, preparoMin: preparo },
    select: { entregarAs: true, producaoEm: true },
  });
  return {
    ok: true,
    entregarAs: actualizado.entregarAs!,
    producaoEm: actualizado.producaoEm!,
    estado: quando.estado,
  };
}

/**
 * Os pedidos agendados que ainda não chegaram à cozinha.
 *
 * É a fila do STAFF-021 e do TAKE-003: o que está combinado e ainda não é para
 * fazer. A comparação é com o relógio da BASE.
 */
export async function agendadosPorEntrar(
  db: ClienteComEscopo, locationId: string,
): Promise<{ id: string; numero: string; canal: string; entregarAs: Date; producaoEm: Date }[]> {
  const [agora] = await db.$queryRaw<{ agora: Date }[]>`SELECT now() AS agora`;
  const linhas = await db.order.findMany({
    where: {
      locationId,
      estado: { not: 'CANCELADO' },
      producaoEm: { gt: agora!.agora },
    },
    orderBy: { producaoEm: 'asc' },
    select: { id: true, numero: true, canal: true, entregarAs: true, producaoEm: true },
  });
  return linhas.map((l) => ({
    id: l.id, numero: l.numero, canal: l.canal,
    entregarAs: l.entregarAs!, producaoEm: l.producaoEm!,
  }));
}

// ──────────────────────────────────────────────────────────────────────────
// Entrega
// ──────────────────────────────────────────────────────────────────────────

export type ResultadoDaArea =
  | { ok: true; areaId: string; taxaMenor: number; moeda: string }
  | { ok: false; motivo: 'FORA_DA_AREA' };

/**
 * A área que serve um código postal, e a taxa dela.
 *
 * ── A taxa é configurada, nunca inventada ─────────────────────────────────
 *
 * Não há aqui nenhum ramo que devolva zero, nem um valor por omissão. Um código
 * postal sem área é **fora da área** — e é o servidor a dizê-lo, com a razão,
 * antes de a pessoa ter escrito o resto da morada.
 *
 * «Ausência não é política, e um valor por omissão que ninguém decidiu é uma
 * decisão do dono tomada por nós.»
 */
export async function areaQueServe(
  db: ClienteComEscopo, locationId: string, codigoPostal: string,
): Promise<ResultadoDaArea> {
  const area = await db.deliveryArea.findFirst({
    where: { locationId, codigoPostal },
    select: { id: true, taxaMenor: true, moeda: true },
  });
  if (!area) return { ok: false, motivo: 'FORA_DA_AREA' };
  return { ok: true, areaId: area.id, taxaMenor: area.taxaMenor, moeda: area.moeda };
}

export async function guardarArea(
  db: ClienteComEscopo, organizationId: string, locationId: string,
  dados: { nome: string; codigoPostal: string; taxaMenor: number; moeda: string },
): Promise<void> {
  await db.deliveryArea.upsert({
    where: { uma_area_por_codigo_postal: { locationId, codigoPostal: dados.codigoPostal } },
    create: { organizationId, locationId, ...dados },
    update: { nome: dados.nome, taxaMenor: dados.taxaMenor, moeda: dados.moeda },
  });
}

export async function listarAreas(db: ClienteComEscopo, locationId: string) {
  return db.deliveryArea.findMany({ where: { locationId }, orderBy: { codigoPostal: 'asc' } });
}

/**
 * Prende uma entrega a um pedido.
 *
 * A taxa é **copiada** da área no momento do pedido. Lê-la da área mais tarde
 * daria um pedido cujo preço muda quando alguém edita a tabela — e o cliente
 * pagaria outra coisa do que a que lhe foi dita.
 */
export async function marcarParaEntrega(
  db: ClienteComEscopo, organizationId: string, locationId: string, orderId: string,
  dados: { morada: string; codigoPostal: string; contacto: string; notas?: string },
): Promise<{ ok: true; taxaMenor: number } | { ok: false; motivo: 'FORA_DA_AREA' }> {
  const area = await areaQueServe(db, locationId, dados.codigoPostal);
  if (!area.ok) return area;
  await db.orderDelivery.upsert({
    where: { uma_entrega_por_pedido: { organizationId, orderId } },
    create: {
      organizationId, orderId, areaId: area.areaId,
      morada: dados.morada, codigoPostal: dados.codigoPostal, contacto: dados.contacto,
      notas: dados.notas ?? null,
      taxaMenor: area.taxaMenor, moeda: area.moeda,
    },
    update: {
      morada: dados.morada, contacto: dados.contacto, notas: dados.notas ?? null,
    },
  });
  return { ok: true, taxaMenor: area.taxaMenor };
}

// ──────────────────────────────────────────────────────────────────────────
// O conector externo
// ──────────────────────────────────────────────────────────────────────────

export interface ConectorDeEntrega {
  provedor: string | null;
  activo: boolean;
}

export async function conectorDeEntrega(
  db: ClienteComEscopo, locationId: string,
): Promise<ConectorDeEntrega> {
  const c = await db.deliveryConnector.findUnique({ where: { locationId } });
  return { provedor: c?.provedor ?? null, activo: c?.activo ?? false };
}

export async function guardarConectorDeEntrega(
  db: ClienteComEscopo, organizationId: string, locationId: string,
  dados: { provedor: string | null; activo: boolean },
): Promise<{ ok: true } | { ok: false; motivo: 'SEM_PROVEDOR' }> {
  if (dados.activo && !dados.provedor) return { ok: false, motivo: 'SEM_PROVEDOR' };
  await db.deliveryConnector.upsert({
    where: { locationId },
    create: { organizationId, locationId, ...dados },
    update: dados,
  });
  return { ok: true };
}

export async function guardarMapaExterno(
  db: ClienteComEscopo, organizationId: string, locationId: string,
  dados: { canalExterno: string; idExterno: string; productId: string },
): Promise<void> {
  await db.externalCatalogMapping.upsert({
    where: {
      um_mapa_por_id_externo: {
        locationId, canalExterno: dados.canalExterno, idExterno: dados.idExterno,
      },
    },
    create: { organizationId, locationId, ...dados },
    update: { productId: dados.productId },
  });
}

export async function listarMapasExternos(db: ClienteComEscopo, locationId: string) {
  return db.externalCatalogMapping.findMany({
    where: { locationId },
    include: { produto: { select: { nome: true } } },
    orderBy: [{ canalExterno: 'asc' }, { idExterno: 'asc' }],
  });
}

export type ResultadoExterno =
  | { ok: true; orderId: string; repetido: boolean }
  | { ok: false; motivo: 'DESLIGADO' | 'SEM_MAPA' };

/**
 * Recebe um pedido de um canal externo.
 *
 * ── Desligado é DESLIGADO ─────────────────────────────────────────────────
 *
 * «Sem contrato/provedor, mantenha o conector desabilitado.» Um pedido que chega
 * com o conector desligado é recusado — não aceite e posto de lado. «Uma
 * integração que finge é pior do que uma que falta, porque a que falta vê-se.»
 *
 * ── E o mesmo evento duas vezes é UM pedido ───────────────────────────────
 *
 * A chave é o identificador do lado de lá, e há um índice único a garanti-lo. Um
 * reenvio do parceiro não pode criar um segundo pedido — a cozinha fá-lo-ia duas
 * vezes, e ninguém compararia.
 */
export async function receberPedidoExterno(
  db: ClienteComEscopo, organizationId: string, locationId: string,
  dados: {
    canalExterno: string; idExterno: string; abertoPor: string;
    itens: { idExterno: string; quantidade: number }[];
  },
): Promise<ResultadoExterno> {
  const conector = await conectorDeEntrega(db, locationId);
  if (!conector.activo || !conector.provedor) return { ok: false, motivo: 'DESLIGADO' };

  const jaExiste = await db.order.findFirst({
    where: { locationId, externoCanal: dados.canalExterno, externoId: dados.idExterno },
    select: { id: true },
  });
  if (jaExiste) return { ok: true, orderId: jaExiste.id, repetido: true };

  // Sem mapa não se adivinha: adivinhar num pedido é servir outra coisa.
  const mapas = await db.externalCatalogMapping.findMany({
    where: {
      locationId, canalExterno: dados.canalExterno,
      idExterno: { in: dados.itens.map((i) => i.idExterno) },
    },
    include: { produto: { select: { id: true, nome: true, preparoMin: true } } },
  });
  if (mapas.length !== dados.itens.length) return { ok: false, motivo: 'SEM_MAPA' };

  const [contagem] = await db.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM orders WHERE location_id = ${locationId}::uuid
  `;
  const numero = `X${String(Number(contagem?.n ?? 0) + 1).padStart(5, '0')}`;

  const pedido = await db.order.create({
    data: {
      organizationId, locationId, canal: 'DELIVERY', numero, estado: 'ACEITE',
      abertoPor: dados.abertoPor,
      externoCanal: dados.canalExterno, externoId: dados.idExterno,
    },
    select: { id: true },
  });
  for (const item of dados.itens) {
    const mapa = mapas.find((m) => m.idExterno === item.idExterno)!;
    await db.orderLine.create({
      data: {
        organizationId, orderId: pedido.id, productId: mapa.produto.id,
        nome: mapa.produto.nome, quantidade: item.quantidade,
        precoMenor: 0, moeda: 'EUR', estado: 'ACEITE', aceiteEm: new Date(),
      },
    });
  }
  return { ok: true, orderId: pedido.id, repetido: false };
}

// ──────────────────────────────────────────────────────────────────────────
// Indisponibilidade descoberta ANTES da hora
// ──────────────────────────────────────────────────────────────────────────

export interface PedidoEmRisco {
  id: string;
  numero: string;
  producaoEm: Date;
  itensEsgotados: string[];
}

/**
 * Os pedidos agendados que têm um item esgotado.
 *
 * ── É uma oportunidade, não uma falha ─────────────────────────────────────
 *
 * «Um item esgota às 18h, para um pedido das 20h: há duas horas para avisar quem
 * pediu. O defeito é descobri-lo às 19h58, e o defeito pior é descobri-lo às 18h
 * e não dizer nada.»
 *
 * Isto **não decide** o que se faz — se se sugere alternativa, se se reembolsa,
 * se se telefona, é do restaurante. O sistema sabe, e mostra que sabe.
 */
export async function agendadosEmRisco(
  db: ClienteComEscopo, locationId: string,
): Promise<PedidoEmRisco[]> {
  const [agora] = await db.$queryRaw<{ agora: Date }[]>`SELECT now() AS agora`;
  const pedidos = await db.order.findMany({
    where: {
      locationId, estado: { not: 'CANCELADO' },
      producaoEm: { gt: agora!.agora },
    },
    include: {
      linhas: { select: { nome: true, productId: true } },
    },
    orderBy: { producaoEm: 'asc' },
  });
  if (pedidos.length === 0) return [];

  const ids = [...new Set(pedidos.flatMap((p) =>
    p.linhas.flatMap((l) => (l.productId ? [l.productId] : []))))];
  // ── O bloqueio é o do E07, e vale enquanto durar ───────────────────────
  //
  // `ProductAvailability.bloqueado` com `ate` no futuro (ou sem `ate`, que é
  // «até alguém desbloquear»). Um bloqueio que já expirou não esgota nada, e
  // tratá-lo como esgotado avisava o cliente de um problema que já passou.
  const bloqueios = await db.productAvailability.findMany({
    where: {
      productId: { in: ids },
      bloqueado: true,
      OR: [{ locationId: null }, { locationId }],
      AND: [{ OR: [{ ate: null }, { ate: { gt: agora!.agora } }] }],
    },
    select: { productId: true },
  });
  const esgotados = new Set(bloqueios.map((b) => b.productId));

  return pedidos
    .map((p) => ({
      id: p.id, numero: p.numero, producaoEm: p.producaoEm!,
      itensEsgotados: p.linhas
        .filter((l) => l.productId && esgotados.has(l.productId))
        .map((l) => l.nome),
    }))
    .filter((p) => p.itensEsgotados.length > 0);
}

/**
 * A fila de um canal: o que está aceite e ainda não saiu.
 *
 * ── Um só banco de pedidos, e um filtro por canal ─────────────────────────
 *
 * «Crie filtros e telas por canal sem manter bancos de pedidos independentes.»
 * Isto é uma consulta com `canal` no `where` — e é tudo. Um pedido de takeaway
 * continua a ser um `Order`, com as mesmas linhas, as mesmas tarefas de produção
 * e os mesmos números no relatório.
 *
 * ── E não traz a morada ───────────────────────────────────────────────────
 *
 * «Não exponha endereços ou telefones nas telas públicas de fila.» A morada vive
 * noutra tabela e esta consulta não lhe toca: não é uma coluna que alguém tenha
 * de se lembrar de não seleccionar.
 */
export async function filaDoCanal(
  db: ClienteComEscopo, locationId: string, canal: 'TAKEAWAY' | 'DELIVERY',
): Promise<{
  id: string; numero: string; estado: string;
  entregarAs: Date | null; producaoEm: Date | null; naCozinha: boolean;
}[]> {
  const [agora] = await db.$queryRaw<{ agora: Date }[]>`SELECT now() AS agora`;
  const linhas = await db.order.findMany({
    where: { locationId, canal, estado: { in: ['ACEITE', 'EM_PREPARO', 'PRONTO'] } },
    orderBy: [{ producaoEm: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, numero: true, estado: true, entregarAs: true, producaoEm: true },
  });
  return linhas.map((l) => ({
    ...l,
    // Já entrou na cozinha? A mesma pergunta que o KDS faz, com o mesmo relógio.
    naCozinha: l.producaoEm === null || l.producaoEm <= agora!.agora,
  }));
}

/** Marca a saída — retirado ao balcão, ou entregue à porta. */
export async function marcarSaida(
  db: ClienteComEscopo, orderId: string, canal: 'TAKEAWAY' | 'DELIVERY',
): Promise<void> {
  if (canal === 'DELIVERY') {
    await db.orderDelivery.updateMany({
      where: { orderId }, data: { entregueEm: new Date() },
    });
  }
  await db.order.update({ where: { id: orderId }, data: { estado: 'ENTREGUE' } });
}
