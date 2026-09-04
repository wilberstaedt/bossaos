import { Prisma } from '@prisma/client';
import {
  chaveDeLead, validarLead, type LeadSubmetido, type RecusaDeLead,
} from '@bossaos/domain';
import type { ClienteComEscopo } from './escopo.ts';

/**
 * Gravar um pedido de contacto vindo do site público.
 *
 * ── O aceite 2, e o único sítio onde ele pode ser traído ───────────────────
 *
 * > *«Lead válido guarda-se uma vez; falha real não mostra sucesso.»*
 *
 * A segunda metade é a cara: perde dinheiro **sem fazer barulho**. O cliente vê
 * "obrigado", o restaurante nunca soube, e não há erro em lado nenhum para
 * alguém encontrar. Ninguém abre um bilhete sobre isto.
 *
 * E a forma de o trair é sempre a mesma, e parece cuidado: um `try/catch` à
 * volta da escrita, para "a página não rebentar ao cliente". A partir daí uma
 * base em baixo devolve exactamente o mesmo ecrã que uma gravação bem-sucedida.
 *
 * **Por isso esta função apanha UM erro e só um.** A violação da chave única —
 * que não é uma falha, é a idempotência a funcionar. Todos os outros sobem.
 * Está escrito assim de propósito, e o controlo negativo da prova parte a
 * gravação a valer para ver se o ecrã continua a dizer obrigado.
 */

export type ResultadoDoLead =
  | { ok: true; id: string; duplicado: boolean }
  | { ok: false; recusas: RecusaDeLead[] };

export async function guardarLead(
  db: ClienteComEscopo,
  organizationId: string,
  entrada: LeadSubmetido & { locationId: string; agora?: Date },
): Promise<ResultadoDoLead> {
  const recusas = validarLead(entrada);
  if (recusas.length > 0) return { ok: false, recusas };

  const chave = chaveDeLead({
    locationId: entrada.locationId,
    email: entrada.email,
    mensagem: entrada.mensagem,
    dia: entrada.agora ?? new Date(),
  });

  try {
    const lead = await db.lead.create({
      data: {
        organizationId,
        locationId: entrada.locationId,
        nome: entrada.nome.trim(),
        email: entrada.email.trim(),
        telefone: entrada.telefone?.trim() || null,
        mensagem: entrada.mensagem.trim(),
        origem: entrada.origem,
        chaveIdempotencia: chave,
      },
      select: { id: true },
    });
    return { ok: true, id: lead.id, duplicado: false };
  } catch (erro) {
    // ── P2002 e mais nada ─────────────────────────────────────────────────
    //
    // A decisão de "guarda-se uma vez" é da restrição única da base, e não de um
    // `if (jaExiste)`: duas submissões simultâneas leem as duas "não existe" e
    // gravam as duas. Aqui só se lê o veredicto da base.
    //
    // Qualquer outro erro **sai daqui para cima**. Uma base indisponível, uma
    // permissão em falta, uma coluna que mudou — nada disso é um duplicado, e
    // tratá-lo como tal era escrever o defeito que o aceite 2 procura.
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
      const jaLa = await db.lead.findFirst({
        where: { locationId: entrada.locationId, chaveIdempotencia: chave },
        select: { id: true },
      });
      if (jaLa) return { ok: true, id: jaLa.id, duplicado: true };
    }
    throw erro;
  }
}

/** Os pedidos de contacto de uma unidade, para o ecrã de gestão. */
export async function leadsDaUnidade(
  db: ClienteComEscopo,
  locationId: string,
  limite = 50,
) {
  return db.lead.findMany({
    where: { locationId },
    select: {
      id: true, nome: true, email: true, telefone: true,
      mensagem: true, origem: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limite,
  });
}

/**
 * A porta PÚBLICA do lead: grava sem sessão.
 *
 * ── Porque é que não passa pelo `comEscopo` ────────────────────────────────
 *
 * Um pedido do site público não tem sessão, logo não tem `app.organization_id`,
 * logo a política de linha nega — e nega bem. O contexto é posto **dentro da
 * transacção**, com a organização que a porta pública do site já resolveu a
 * partir do endereço: quem envia o formulário nunca escolhe a que organização o
 * lead pertence.
 *
 * O `set_config(..., true)` é local à transacção. Escrito como duas chamadas
 * soltas, a segunda corre noutra ligação do pool e não vê o contexto: o `INSERT`
 * falharia sempre. É o defeito exacto que a contagem de consultas do E09 teve.
 *
 * ── E aqui está a diferença que o aceite 2 exige ──────────────────────────
 *
 * A contagem de consultas do E09 devolve `{contou: false}` quando falha, porque
 * contar é secundário e não pode impedir a carta de ser servida.
 *
 * **Um lead não é secundário.** Se a gravação falhar, quem chama TEM de saber, e
 * o único desfecho apanhado aqui é a violação da chave única — que não é uma
 * falha, é a idempotência a funcionar. Base em baixo, permissão em falta,
 * coluna mudada: tudo isso **sobe**. Um `catch` largo aqui era o defeito mais
 * caro dos três, e não faria barulho nenhum a passar.
 */
export type ResultadoDoLeadPublico =
  | { ok: true; duplicado: boolean }
  | { ok: false; recusas: RecusaDeLead[] };

export async function guardarLeadPublico(
  prisma: import('@prisma/client').PrismaClient,
  dados: LeadSubmetido & { organizationId: string; locationId: string; agora?: Date },
): Promise<ResultadoDoLeadPublico> {
  const recusas = validarLead(dados);
  if (recusas.length > 0) return { ok: false, recusas };

  const chave = chaveDeLead({
    locationId: dados.locationId,
    email: dados.email,
    mensagem: dados.mensagem,
    dia: dados.agora ?? new Date(),
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT set_config('app.organization_id', ${dados.organizationId}, true)`;
      await tx.$executeRaw`
        INSERT INTO leads (id, organization_id, location_id, nome, email, telefone,
                           mensagem, origem, chave_idempotencia)
        VALUES (gen_random_uuid(), ${dados.organizationId}::uuid, ${dados.locationId}::uuid,
                ${dados.nome.trim()}, ${dados.email.trim()},
                ${dados.telefone?.trim() || null}, ${dados.mensagem.trim()},
                ${dados.origem}, ${chave})`;
    });
    return { ok: true, duplicado: false };
  } catch (erro) {
    // 23505 é a violação de unicidade do PostgreSQL. Chega aqui como erro cru
    // porque a escrita é `$executeRaw` — o Prisma não a traduz para P2002.
    const codigo = (erro as { meta?: { code?: string }; code?: string })?.meta?.code
      ?? (erro as { code?: string })?.code;
    const texto = erro instanceof Error ? erro.message : String(erro);
    if (codigo === '23505' || texto.includes('leads_organization_id_location_id_chave')) {
      return { ok: true, duplicado: true };
    }
    throw erro;
  }
}

/**
 * MKT-007 · o pedido de demo da BossaOS.
 *
 * Fora do espaço de inquilino: quem pede uma demo ainda não é cliente de
 * ninguém. Escreve pela porta `registar_pedido_de_demo`, que é a única coisa que
 * o runtime pode fazer a esta tabela — não tem sequer `SELECT`.
 *
 * A porta devolve `repetido` na violação de unicidade e **não apanha mais nada**:
 * qualquer outra falha sobe até aqui e daqui até quem chama. Um `WHEN others` no
 * PL/pgSQL, ou um `catch` largo aqui, transformava uma base em baixo num ecrã de
 * obrigado — na página que existe para angariar clientes.
 */
export type ResultadoDoPedidoDeDemo =
  | { ok: true; duplicado: boolean }
  | { ok: false; recusas: RecusaDeLead[] };

export async function registarPedidoDeDemo(
  prisma: import('@prisma/client').PrismaClient,
  dados: {
    nome: string; email: string; restaurante: string;
    telefone?: string | null; mensagem?: string | null;
    idioma: string; agora?: Date;
  },
): Promise<ResultadoDoPedidoDeDemo> {
  const recusas = validarLead({
    nome: dados.nome,
    email: dados.email,
    // O restaurante faz as vezes da mensagem na validação: é o campo obrigatório
    // desta forma. A mensagem em si é opcional aqui — quem pede uma demo não tem
    // de escrever uma carta.
    mensagem: dados.restaurante,
    origem: 'demo',
  });
  if (recusas.length > 0) return { ok: false, recusas };

  const chave = chaveDeLead({
    locationId: 'bossaos-demo',
    email: dados.email,
    mensagem: dados.restaurante,
    dia: dados.agora ?? new Date(),
  });

  const linhas = await prisma.$queryRaw<{ registar_pedido_de_demo: string }[]>`
    SELECT registar_pedido_de_demo(
      ${dados.nome}, ${dados.email}, ${dados.restaurante},
      ${dados.telefone ?? null}, ${dados.mensagem ?? null}, ${dados.idioma}, ${chave})`;
  const r = linhas[0]?.registar_pedido_de_demo;
  // Uma resposta que não é nenhuma das duas conhecidas **não** é sucesso. Sem
  // isto, uma porta alterada que devolvesse outra coisa passava por gravação.
  if (r !== 'ok' && r !== 'repetido') {
    throw new Error(`registar_pedido_de_demo devolveu ${String(r)}`);
  }
  return { ok: true, duplicado: r === 'repetido' };
}
