import type { PrismaClient } from '@prisma/client';
import { projectarSite, type SitePublico, type TipoDePagina } from '@bossaos/domain';
import type { ClienteComEscopo } from './escopo.ts';

/**
 * O site do restaurante: o rascunho de um lado, o que está no ar do outro.
 *
 * ── O aceite 1 do E10, e onde ele vive de verdade ──────────────────────────
 *
 * > *«Rascunho não muda o site público; publicar e retirar são consistentes.»*
 *
 * Isto **não** se garante com cuidado ao escrever. Garante-se com dois
 * armazenamentos: quem edita mexe em `sites`, `site_pages` e `site_posts`; quem
 * serve o público lê `site_publications` → `site_revisions.conteudo`, através de
 * uma função `SECURITY DEFINER` que não tem por onde pedir o rascunho.
 *
 * Se fossem o mesmo sítio, "guardar" era "publicar" e nenhum aviso no ecrã
 * evitava isso. É a mesma decisão do E08 para a carta, e é a razão de a
 * revisão ser imutável na BASE (`REVOKE UPDATE, DELETE`) e não por disciplina.
 *
 * ── E retirar apaga a linha ────────────────────────────────────────────────
 *
 * Não põe uma bandeira. Uma bandeira deixa o conteúdo alcançável por quem se
 * esqueça de a ler, e a régua reprova à cabeça «uma página em cache com o
 * conteúdo antigo». Sem linha em `site_publications`, a porta pública não tem
 * junção que dê — não há caminho, não é uma verificação.
 */

interface LinhaDoSite {
  organization_id: string;
  location_id: string;
  location_nome: string;
  marca_nome: string;
  fuso: string | null;
  moeda: string | null;
  revision_id: string;
  revision_numero: number;
  conteudo: unknown;
  publicada_em: Date;
}

export interface SiteServido {
  site: SitePublico;
  organizationId: string;
  locationId: string;
  unidade: string;
  marca: string;
  revisionId: string;
  revisionNumero: number;
  fuso: string;
  publicadoEm: Date;
}

function servir(l: LinhaDoSite): SiteServido {
  // O conteúdo já vem projectado — foi projectado ao publicar. Aqui só se
  // desembrulha, e desembrulhar não é o mesmo que filtrar: se algo indevido
  // tivesse entrado na revisão, filtrar aqui seria pôr uma cortina à frente.
  return {
    site: l.conteudo as SitePublico,
    organizationId: l.organization_id,
    locationId: l.location_id,
    unidade: l.location_nome,
    marca: l.marca_nome,
    revisionId: l.revision_id,
    revisionNumero: l.revision_numero,
    // Sem fuso configurado não se inventa nenhum. Mesma decisão do E09.
    fuso: l.fuso ?? 'UTC',
    publicadoEm: l.publicada_em,
  };
}

/**
 * O site publicado num endereço público.
 *
 * `null` quando não há: endereço que não existe, unidade arquivada, site nunca
 * publicado, ou site retirado. **Os quatro dão a mesma resposta** — dizer
 * "existe mas está retirado" a um estranho é contar que o restaurante existe.
 */
export async function sitePublico(
  prisma: PrismaClient,
  slug: string,
): Promise<SiteServido | null> {
  const linhas = await prisma.$queryRaw<LinhaDoSite[]>`SELECT * FROM publico_site(${slug})`;
  const l = linhas[0];
  return l ? servir(l) : null;
}

/**
 * O mesmo site, pedido pelo DOMÍNIO PRÓPRIO.
 *
 * A porta só serve `VERIFICADO` e `INDETERMINADO`. `PENDENTE` não serve — regra
 * 1 do contrato: escrever o domínio numa caixa de texto não prova nada. E
 * `INDETERMINADO` **serve**, que é a regra 2: um DNS que deixou de responder não
 * é um domínio que mudou de dono, e tirar o site do ar por um tempo-limite de
 * rede é o dano que a regra existe para impedir.
 */
export async function sitePublicoPorDominio(
  prisma: PrismaClient,
  dominio: string,
): Promise<SiteServido | null> {
  const linhas = await prisma.$queryRaw<LinhaDoSite[]>`
    SELECT * FROM publico_site_por_dominio(${dominio})`;
  const l = linhas[0];
  return l ? servir(l) : null;
}

/** O rascunho inteiro, para os ecrãs de edição e para a pré-visualização. */
export async function rascunhoDoSite(db: ClienteComEscopo, locationId: string) {
  return db.site.findFirst({
    where: { locationId },
    select: {
      id: true, estado: true, seoTitulo: true, seoDescricao: true, redes: true,
      paginas: {
        select: { id: true, tipo: true, visivel: true, titulo: true, corpo: true, contacto: true },
        orderBy: { tipo: 'asc' },
      },
      posts: {
        select: {
          id: true, slug: true, titulo: true, resumo: true, corpo: true,
          publicadoEm: true, visivel: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

/**
 * Cria o site da unidade se ainda não existir.
 *
 * **Sem `if (existe) criar`.** Duas chamadas simultâneas leriam as duas "não
 * existe" e criariam as duas — a lição do E06, e a restrição única
 * `(organization_id, location_id)` é quem decide. As três páginas nascem
 * `visivel = false`: uma página em branco publicada é pior do que uma página que
 * não existe.
 */
export async function criarSiteSeFaltar(
  db: ClienteComEscopo,
  organizationId: string,
  locationId: string,
): Promise<string> {
  const existente = await db.site.findFirst({ where: { locationId }, select: { id: true } });
  if (existente) return existente.id;

  const site = await db.site.create({
    data: { organizationId, locationId },
    select: { id: true },
  });
  for (const tipo of ['INICIO', 'SOBRE', 'CONTACTO'] as TipoDePagina[]) {
    await db.sitePage.create({
      data: { organizationId, siteId: site.id, tipo, visivel: false },
    });
  }
  return site.id;
}

export type BloqueioDePublicacao =
  | { motivo: 'sem_paginas_visiveis' }
  | { motivo: 'inicio_sem_conteudo' };

export type ResultadoDaPublicacao =
  | { ok: true; revisionId: string; numero: number }
  | { ok: false; bloqueios: BloqueioDePublicacao[] };

/**
 * Publica o site: cria a revisão e troca o ponteiro **na mesma transacção**.
 *
 * A transacção é a que o `comEscopo` já abriu. Sem isso, uma falha entre as duas
 * escritas deixava uma revisão órfã ou — pior — um ponteiro para uma revisão que
 * não chegou a existir.
 *
 * Os bloqueios existem porque publicar um site sem uma única página visível põe
 * no ar um endereço que responde com nada, e o cliente que aponta o QR conclui
 * que o restaurante fechou.
 */
export async function publicarSite(
  db: ClienteComEscopo,
  organizationId: string,
  entrada: { siteId: string; autor: string; agora?: Date },
): Promise<ResultadoDaPublicacao> {
  const agora = entrada.agora ?? new Date();

  const site = await db.site.findFirst({
    where: { id: entrada.siteId },
    select: {
      id: true, seoTitulo: true, seoDescricao: true, redes: true,
      paginas: { select: { tipo: true, visivel: true, titulo: true, corpo: true, contacto: true } },
      posts: {
        select: {
          slug: true, titulo: true, resumo: true, corpo: true, publicadoEm: true, visivel: true,
        },
      },
    },
  });
  if (!site) return { ok: false, bloqueios: [{ motivo: 'sem_paginas_visiveis' }] };

  const publico = projectarSite({
    seoTitulo: site.seoTitulo,
    seoDescricao: site.seoDescricao,
    redes: site.redes,
    paginas: site.paginas.map((p: (typeof site.paginas)[number]) => ({
      tipo: p.tipo as TipoDePagina,
      visivel: p.visivel,
      titulo: p.titulo,
      corpo: p.corpo,
      contacto: p.contacto,
    })),
    posts: site.posts,
  });

  const bloqueios: BloqueioDePublicacao[] = [];
  if (publico.paginas.length === 0) bloqueios.push({ motivo: 'sem_paginas_visiveis' });
  const inicio = publico.paginas.find((p) => p.tipo === 'INICIO');
  if (inicio && (inicio.titulo ?? '').trim() === '') {
    bloqueios.push({ motivo: 'inicio_sem_conteudo' });
  }
  if (bloqueios.length > 0) return { ok: false, bloqueios };

  const ultima = await db.siteRevision.findFirst({
    where: { siteId: site.id }, select: { numero: true }, orderBy: { numero: 'desc' },
  });
  // O número NUNCA recua, nem quando se retira e volta a publicar. Um número que
  // recua faz duas revisões diferentes ter o mesmo nome no histórico.
  const numero = (ultima?.numero ?? 0) + 1;

  const revisao = await db.siteRevision.create({
    data: {
      organizationId, siteId: site.id, numero,
      conteudo: publico as unknown as object, criadaPor: entrada.autor,
    },
    select: { id: true, numero: true },
  });

  const publicacao = await db.sitePublication.findFirst({
    where: { siteId: site.id }, select: { id: true },
  });
  if (publicacao) {
    await db.sitePublication.update({
      where: { id: publicacao.id },
      data: { revisionId: revisao.id, publicadaPor: entrada.autor, publicadaEm: agora },
    });
  } else {
    await db.sitePublication.create({
      data: {
        organizationId, siteId: site.id, revisionId: revisao.id,
        publicadaPor: entrada.autor, publicadaEm: agora,
      },
    });
  }
  await db.site.update({ where: { id: site.id }, data: { estado: 'PUBLICADO' } });

  return { ok: true, revisionId: revisao.id, numero: revisao.numero };
}

/**
 * Retira o site do ar.
 *
 * Apaga o ponteiro e deixa as revisões. O histórico é o que permite voltar a pôr
 * exactamente o que lá estava; apagá-lo transformava "retirar" em "destruir", e
 * ninguém que carrega em *retirar* quer a segunda coisa.
 *
 * **O endereço público não é largado aqui.** Retirar o site e libertar o
 * endereço são decisões diferentes, e o QR está impresso.
 */
export async function retirarSite(
  db: ClienteComEscopo,
  siteId: string,
): Promise<{ retirado: boolean }> {
  const apagados = await db.sitePublication.deleteMany({ where: { siteId } });
  await db.site.update({ where: { id: siteId }, data: { estado: 'RETIRADO' } });
  return { retirado: apagados.count > 0 };
}
