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
  locationSlug: string;
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
