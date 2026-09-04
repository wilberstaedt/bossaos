import type { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import {
  avaliarVerificacao, nomeDoRegistoDeProva, valorDoRegistoDeProva,
  type EstadoDeDominio, type RespostaDeDns,
} from '@bossaos/domain';
import type { ClienteComEscopo } from './escopo.ts';

/**
 * O domínio próprio, e as quatro regras de `dominios-e-enderecos.md`.
 *
 * ── Porque é que a decisão de vincular está na BASE ────────────────────────
 *
 * A pergunta — *"este domínio já foi de alguém?"* — atravessa inquilinos por
 * natureza, e nenhum inquilino pode ler a resposta. Uma consulta feita aqui em
 * TypeScript não veria as linhas de outra organização e responderia sempre
 * "livre", que é o pior resultado possível: o produto diria que sim ao segundo
 * inquilino e a base recusaria mais tarde, ou nem isso.
 *
 * É a mesma decisão do `reservar_endereco_publico` do E09, e a mesma razão.
 */

export type ResultadoDoVinculo =
  | 'ok'
  | 'invalido'
  | 'em_uso'
  | 'reservado_por_outra_organizacao';

/**
 * O valor que o cliente tem de publicar no DNS. Aleatório, nosso, e ligado a
 * este inquilino e a este domínio.
 *
 * 32 bytes: o token é o que separa "eu controlo este domínio" de "eu escrevi
 * este domínio numa caixa". Um valor adivinhável não separa nada.
 */
export function gerarTokenDeProva(): string {
  return randomBytes(32).toString('hex');
}

export interface DominioVinculado {
  dominio: string;
  estado: EstadoDeDominio;
  motivo: string | null;
  /** O que o cliente tem de pôr no DNS, já pronto a copiar. */
  registo: { nome: string; valor: string };
  verificadoEm: Date | null;
  ultimaTentativaEm: Date | null;
}

/**
 * Vincula um domínio a uma unidade. Nasce **PENDENTE**, sempre.
 *
 * Vincular não é verificar. Regra 1: só depois de ver a prova de controlo é que
 * o domínio serve conteúdo — e é a porta pública que o garante, não um `if` que
 * alguém tenha de se lembrar de escrever antes de a chamar. Foi assim que a
 * terceira verificação do CT-02 nunca disparou no E05.
 */
export async function vincularDominio(
  prisma: PrismaClient,
  organizationId: string,
  locationId: string,
  dominio: string,
  token: string,
): Promise<ResultadoDoVinculo> {
  const linhas = await prisma.$queryRaw<{ vincular_dominio: string }[]>`
    SELECT vincular_dominio(
      ${organizationId}::uuid, ${locationId}::uuid, ${dominio}, ${token})`;
  return (linhas[0]?.vincular_dominio ?? 'invalido') as ResultadoDoVinculo;
}

/**
 * Larga o domínio: tira-o do ar e **não o devolve ao mundo**.
 *
 * A linha de dono fica. É a regra 3, e o motivo é físico: o domínio anda em
 * cartões, ementas e anúncios pagos. Um nome que muda de dono em silêncio manda
 * pessoas reais ao concorrente, e o papel não se actualiza.
 */
export async function largarDominio(
  prisma: PrismaClient,
  organizationId: string,
  dominio: string,
): Promise<'ok' | 'nao_encontrado'> {
  const linhas = await prisma.$queryRaw<{ largar_dominio: string }[]>`
    SELECT largar_dominio(${organizationId}::uuid, ${dominio})`;
  return (linhas[0]?.largar_dominio ?? 'nao_encontrado') as 'ok' | 'nao_encontrado';
}

/** Os domínios de uma unidade, com o registo pronto a copiar. */
export async function dominiosDaUnidade(
  db: ClienteComEscopo,
  locationId: string,
): Promise<DominioVinculado[]> {
  const linhas = await db.customDomain.findMany({
    where: { locationId },
    select: {
      dominio: true, estado: true, motivo: true, tokenVerificacao: true,
      verificadoEm: true, ultimaTentativaEm: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  return linhas.map((d: (typeof linhas)[number]) => ({
    dominio: d.dominio,
    estado: d.estado as EstadoDeDominio,
    motivo: d.motivo,
    registo: {
      nome: nomeDoRegistoDeProva(d.dominio),
      valor: valorDoRegistoDeProva(d.tokenVerificacao),
    },
    verificadoEm: d.verificadoEm,
    ultimaTentativaEm: d.ultimaTentativaEm,
  }));
}

/**
 * Regista o resultado de uma consulta ao DNS.
 *
 * A decisão do estado **não é tomada aqui** — é `avaliarVerificacao`, no
 * domínio, que é onde se pode medir sem base nenhuma. Aqui só se grava.
 *
 * `ultimaTentativaEm` é escrito SEMPRE, mesmo quando o DNS não respondeu. É a
 * diferença entre "não verificamos há três dias" e "verificámos há um minuto e
 * não sabemos" — e sem esse campo as duas leem-se iguais no ecrã.
 */
export async function registarVerificacao(
  db: ClienteComEscopo,
  dominio: string,
  resposta: RespostaDeDns,
  agora = new Date(),
): Promise<{ estado: EstadoDeDominio; motivo: string } | null> {
  const actual = await db.customDomain.findFirst({
    where: { dominio },
    select: { id: true, estado: true, tokenVerificacao: true },
  });
  if (!actual) return null;

  const veredicto = avaliarVerificacao(
    actual.estado as EstadoDeDominio,
    valorDoRegistoDeProva(actual.tokenVerificacao),
    resposta,
  );

  await db.customDomain.update({
    where: { id: actual.id },
    data: {
      estado: veredicto.estado,
      motivo: veredicto.motivo,
      ultimaTentativaEm: agora,
      // A data de verificação só avança quando se VIU a prova. Carimbá-la em
      // `INDETERMINADO` dizia que se confirmou uma coisa que não se confirmou.
      ...(veredicto.estado === 'VERIFICADO' ? { verificadoEm: agora } : {}),
    },
  });
  return veredicto;
}
