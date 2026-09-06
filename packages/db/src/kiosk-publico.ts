import type { PrismaClient } from '@prisma/client';

/**
 * O kiosk visto de fora — antes de haver inquilino.
 *
 * ── Porque é um ficheiro à parte, como a reserva pública ───────────────────
 *
 * Todo o resto do motor recebe um `ClienteComEscopo`, que só existe depois de
 * haver inquilino. Aqui não há: **o que existe é um ecrã sozinho num corredor**.
 * O inquilino sai da porta estreita `kiosk_do_aparelho`, e só depois se abre
 * escopo.
 *
 * ── O que este endereço é, dito por palavras ───────────────────────────────
 *
 * O `deviceId` no endereço é uma **capacidade** — quem o tem, abre o ecrã. É a
 * mesma figura do `recibo_publico` do E22 e do `publicLocationSlug` do E09, e
 * está aqui pela mesma razão: o aparelho está fisicamente na casa e não há
 * ninguém para iniciar sessão nele.
 *
 * **Mas a exposição é de outra natureza, e fica dito:** um recibo público só se
 * lê; um kiosk CRIA PEDIDOS. Quem tiver o identificador pode abrir sessões e
 * encher carrinhos à distância. O que fecha isso é uma sessão de aparelho — um
 * cookie emitido no pareamento do E13 — e essa é uma decisão de autenticação
 * que pertence ao contrato, não uma coisa para eu inventar a meio da etapa.
 *
 * Fica como **pendência declarada** em `docs/progress/E31.md`. O que se fez foi
 * limitar o estrago: a porta só responde por aparelhos `ACTIVO`, devolve apenas
 * identificadores e o nome da unidade, e nada do que está lá dentro.
 */
export interface KioskPublico {
  organizationId: string;
  organizationSlug: string;
  locationId: string;
  /**
   * O endereço **PÚBLICO** da unidade — o que a `publico_carta` conhece.
   *
   * Não é o `locations.slug`, que é o identificador interno de gestão. A porta
   * devolveu o interno até 06/09, e a carta do kiosk vinha vazia em silêncio:
   * o tipo estava certo e o valor estava errado, que é o modo de falha que
   * nenhum compilador apanha. Foi a prova de navegador que o viu.
   *
   * **Anulável:** uma unidade sem endereço público não tem carta para servir, e
   * isso diz-se em vez de se inventar um endereço.
   */
  locationSlug: string | null;
  nome: string;
  fuso: string | null;
}

export async function kioskDoAparelho(
  prisma: PrismaClient, deviceId: string,
): Promise<KioskPublico | null> {
  // O identificador vem do endereço, e um endereço não é um UUID só por o
  // dizermos. Sem esta guarda, um `deviceId` mal formado chegava ao Postgres e
  // rebentava com um erro de tipo — que responde 500 onde a resposta certa é
  // ausência, e de caminho conta a quem experimenta que a sonda chegou à base.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceId)) {
    return null;
  }

  const linhas = await prisma.$queryRaw<{
    organization_id: string; organization_slug: string;
    location_id: string; location_slug: string;
    location_nome: string; fuso: string | null;
  }[]>`SELECT * FROM kiosk_do_aparelho(${deviceId}::uuid)`;

  const l = linhas[0];
  if (!l) return null;
  return {
    organizationId: l.organization_id, organizationSlug: l.organization_slug,
    locationId: l.location_id, locationSlug: l.location_slug,
    nome: l.location_nome, fuso: l.fuso,
  };
}

/**
 * ── As portas do kiosk, e porque é que elas existem TODAS aqui ─────────────
 *
 * A primeira versão punha o `comEscopo` na camada web, dentro do
 * `carregar-kiosk.ts`. A `rotas-com-porta.test.ts` reprovou — e tinha razão.
 *
 * Uma superfície sem sessão tem de passar por **portas estreitas e por mais
 * nada**: se ela própria abre escopo, o inquilino que ela escolhe passa a ser
 * uma decisão da camada web, e quem ler o ficheiro daqui a um ano não sabe de
 * onde é que aquele `organizationId` veio. É a mesma forma que o `src/reserva/`
 * já tinha, e a regra apertada é apertada de propósito.
 *
 * Cada função abaixo recebe o `deviceId` do endereço, resolve o inquilino pela
 * `kiosk_do_aparelho`, e só então abre escopo. **Nenhuma aceita um
 * `organizationId` de fora** — é essa a propriedade que faz delas portas.
 */

import { comEscopo } from './escopo.ts';
import {
  abrirSessaoDeKiosk, apagarPessoa, estadoDoKiosk, ligarPessoaAoPedido,
  sessaoViva, terminarSessao, type MotivoDeSaida,
} from './kiosk.ts';

/** O que uma tela do kiosk precisa de saber, tudo de uma vez. */
export async function estadoParaOEcra(prisma: PrismaClient, deviceId: string) {
  const kiosk = await kioskDoAparelho(prisma, deviceId);
  if (!kiosk) return null;

  const escopo = { organizationId: kiosk.organizationId };
  const [sessao, disponibilidade] = await Promise.all([
    comEscopo(prisma, escopo, (db) => sessaoViva(db, deviceId)),
    comEscopo(prisma, escopo, (db) => estadoDoKiosk(db, deviceId)),
  ]);
  return { kiosk, sessao, disponibilidade };
}

/** Começar: o acto que declara «sou outra pessoa». */
export async function comecarNoKiosk(
  prisma: PrismaClient, deviceId: string, idioma: string,
) {
  const kiosk = await kioskDoAparelho(prisma, deviceId);
  if (!kiosk) return null;
  return comEscopo(prisma, { organizationId: kiosk.organizationId }, (db) =>
    abrirSessaoDeKiosk(db, kiosk.organizationId, kiosk.locationId, deviceId, idioma));
}

/**
 * As TRÊS saídas, e uma porta só.
 *
 * Devolve `false` quando não havia sessão viva — que **não é erro**: é o estado
 * normal de um kiosk parado, e é o que acontece quando a inactividade já fechou
 * a sessão por baixo de quem carregou no botão.
 */
export async function terminarNoKiosk(
  prisma: PrismaClient, deviceId: string, motivo: MotivoDeSaida,
): Promise<boolean> {
  const kiosk = await kioskDoAparelho(prisma, deviceId);
  if (!kiosk) return false;
  return comEscopo(prisma, { organizationId: kiosk.organizationId }, async (db) => {
    const viva = await sessaoViva(db, deviceId);
    if (!viva) return false;
    await terminarSessao(db, viva.id, motivo, `saida:${motivo}`);
    return true;
  });
}

/** Ligar a pessoa ao pedido desta sessão — a referência, nunca a cópia. */
export async function ligarPessoaNoKiosk(
  prisma: PrismaClient, deviceId: string, customerId: string, expiraEm: Date,
) {
  const kiosk = await kioskDoAparelho(prisma, deviceId);
  if (!kiosk) return null;
  return comEscopo(prisma, { organizationId: kiosk.organizationId }, async (db) => {
    const sessao = await sessaoViva(db, deviceId);
    if (!sessao?.orderId) return null;
    return ligarPessoaAoPedido(db, kiosk.organizationId, sessao.orderId,
      customerId, 'SERVICO', expiraEm);
  });
}

/** Apagar a pessoa. **O pedido fica** — e não por cuidado desta função. */
export async function apagarPessoaNoKiosk(
  prisma: PrismaClient, deviceId: string, customerId: string,
): Promise<boolean> {
  const kiosk = await kioskDoAparelho(prisma, deviceId);
  if (!kiosk) return false;
  await comEscopo(prisma, { organizationId: kiosk.organizationId },
    (db) => apagarPessoa(db, customerId));
  return true;
}
