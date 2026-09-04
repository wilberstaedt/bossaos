import { NextResponse } from 'next/server';
import { resolveTxt } from 'node:dns/promises';
import {
  gerarTokenDeProva, largarDominio, registar, registarVerificacao, vincularDominio,
} from '@bossaos/db';
import {
  corpoDaResposta, estadoHttp, exigirAccao, nomeDoRegistoDeProva, type RespostaDeDns,
} from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../src/formulario.ts';
import { unidadeDoPedido } from '../../../../../../src/site-do-pedido.ts';
import { obterBase } from '../../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * WEB-009 · o domínio próprio — o aceite 3 do E10.
 *
 * > *«Um domínio já vinculado ou sem comprovação de controlo não pode ser tomado
 * > por outro tenant.»*
 *
 * As quatro regras de `dominios-e-enderecos.md`, e onde cada uma vive:
 *
 * - **1 · prova de controlo**: vincular cria o pedido em `PENDENTE`. A porta
 *   pública só serve `VERIFICADO` e `INDETERMINADO` — quem não provou não serve
 *   conteúdo, e isso está na porta e não num `if` que alguém tenha de escrever;
 * - **2 · reverificar**: `registarVerificacao` grava `ultimaTentativaEm` mesmo
 *   quando o DNS não responde, e um DNS mudo **não** perde a posse;
 * - **3 · o nome não volta ao mundo**: largar apaga a ligação e deixa o dono;
 * - **4 · a unicidade não chega**: a decisão está na porta da base, porque a
 *   pergunta atravessa inquilinos e nenhum inquilino pode ler a resposta.
 *
 * ── O DNS é o mundo real, e falha ─────────────────────────────────────────
 *
 * A consulta tem um limite de tempo próprio. Sem ele, um DNS que não responde
 * deixa este pedido pendurado até o servidor desistir, e a pessoa fica a olhar
 * para um ecrã parado sem saber se carregou.
 */
const LIMITE_DNS_MS = 5000;

async function consultarTxt(nome: string): Promise<RespostaDeDns> {
  try {
    const registos = await Promise.race([
      resolveTxt(nome),
      new Promise<never>((_, rejeitar) =>
        setTimeout(() => rejeitar(new Error('ETIMEDOUT')), LIMITE_DNS_MS)),
    ]);
    // Um TXT vem em pedaços e junta-se: um valor longo é entregue partido, e
    // comparar pedaço a pedaço nunca encontraria a prova inteira.
    return { tipo: 'registos', valores: registos.map((partes) => partes.join('')) };
  } catch (e) {
    // **Não responder não é uma lista vazia.** Uma lista vazia é "respondeu, e
    // não há lá nada", que é informação; isto não é informação nenhuma, e o tipo
    // obriga quem decide a distingui-las.
    return { tipo: 'nao_respondeu', erro: e instanceof Error ? e.message : 'erro' };
  }
}

export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string }> },
) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const locationSlug = texto(dados, 'locationSlug') ?? '';
  const destino = `/${idioma}/app/${orgSlug}/${locationSlug}/website/dominio`;
  const accao = texto(dados, 'accao') ?? 'vincular';
  const dominio = (texto(dados, 'dominio') ?? '').toLowerCase();

  const unidade = await unidadeDoPedido(sessao, locationSlug);
  if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  const prisma = obterBase();

  if (accao === 'largar') {
    await largarDominio(prisma, sessao.contexto.organizationId, dominio);
    await comEscopoDoPedido(sessao, (db) => registar(db, sessao.contexto.organizationId, {
      accao: 'site.dominio.largado',
      actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'location', alvoId: unidade.id, detalhe: { dominio },
    }));
    return voltarPara(destino, { guardado: '1' });
  }

  if (accao === 'verificar') {
    const resposta = await consultarTxt(nomeDoRegistoDeProva(dominio));
    const veredicto = await comEscopoDoPedido(sessao, async (db) => {
      const v = await registarVerificacao(db, dominio, resposta);
      await registar(db, sessao.contexto.organizationId, {
        accao: 'site.dominio.verificado',
        actorId: sessao.actor.id, actorEmail: sessao.actor.email,
        alvoTipo: 'location', alvoId: unidade.id,
        detalhe: { dominio, estado: v?.estado ?? 'nao_encontrado' },
      });
      return v;
    });
    return voltarPara(destino, { estado: veredicto?.estado ?? 'nao_encontrado' });
  }

  const r = await vincularDominio(
    prisma, sessao.contexto.organizationId, unidade.id, dominio, gerarTokenDeProva(),
  );
  await comEscopoDoPedido(sessao, (db) => registar(db, sessao.contexto.organizationId, {
    accao: r === 'ok' ? 'site.dominio.vinculado' : 'site.dominio.recusado',
    actorId: sessao.actor.id, actorEmail: sessao.actor.email,
    alvoTipo: 'location', alvoId: unidade.id, detalhe: { dominio, resultado: r },
  }));

  // Motivos distintos, e não um "ocupado" genérico: quem tenta um domínio
  // reservado por outra organização não está à espera de nada — ele não se
  // liberta —, e mandá-lo esperar era a resposta errada.
  if (r !== 'ok') return voltarPara(destino, { erro: r });
  return voltarPara(destino, { guardado: '1' });
}
