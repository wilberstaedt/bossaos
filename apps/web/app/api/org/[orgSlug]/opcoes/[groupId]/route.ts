import { NextResponse } from 'next/server';
import { registar } from '@bossaos/db';
import {
  corpoDaResposta, deTextoParaMenor, estadoHttp, exigirAccao, moedaValida, validarGrupo,
} from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-019 · guardar um grupo de opções.
 *
 * ── A validação corre AQUI, e o ecrã só mostra o que ela devolve ───────────
 *
 * As três regras — máximo abaixo do mínimo, obrigatório com mínimo zero, máximo
 * acima do número de opções — passam por `validarGrupo`, do domínio, **antes** da
 * escrita. A base tem os mesmos `CHECK` por baixo como último recurso, mas uma
 * violação de constraint chega ao ecrã como "grupo_bem_formado" e não ajuda
 * ninguém a perceber o que está errado.
 *
 * O campo do máximo vazio quer dizer **sem tecto**, não zero. Zero num grupo
 * obrigatório seria um grupo que ninguém consegue satisfazer, e o produto
 * deixava de se poder pedir sem que nada dissesse porquê.
 */
export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; groupId: string }> },
) {
  const { orgSlug, groupId } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'catalogo.editar');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const destino = `/${idioma}/app/${orgSlug}/catalogo/opcoes/${groupId}`;
  const versao = Number(texto(dados, 'versao'));
  if (!Number.isInteger(versao)) return voltarPara(destino, { erro: 'versao' });

  const nome = texto(dados, 'nome');
  const obrigatorio = texto(dados, 'obrigatorio') === '1';
  const minimo = Number(texto(dados, 'minimo') ?? '0');
  const maximoEscrito = texto(dados, 'maximo');
  // Vazio é SEM TECTO. `Number('')` dá 0, e é por isso que não se lê assim.
  const maximo = maximoEscrito === undefined ? undefined : Number(maximoEscrito);
  const nova = texto(dados, 'nova');

  const r = await comEscopoDoPedido(sessao, async (db) => {
    const actual = await db.modifierGroup.findFirst({
      where: { id: groupId },
      select: { id: true, opcoes: { where: { archivedAt: null }, select: { id: true, nome: true } } },
    });
    if (!actual) return { ok: false as const, erro: 'nao_encontrado' };

    // Valida contra a forma que o grupo VAI TER, incluindo a opção nova — não
    // contra a que tem agora. Um máximo de 4 é válido depois de acrescentar a
    // quarta opção e inválido antes; validar o estado velho recusava a operação
    // certa.
    const opcoes = [
      ...actual.opcoes.map((o) => ({ id: o.id, nome: texto(dados, `opcao:${o.id}`) ?? o.nome })),
      ...(nova ? [{ id: 'nova', nome: nova }] : []),
    ];
    const problema = validarGrupo({
      id: groupId, nome: nome ?? '', obrigatorio, minimo,
      ...(maximo !== undefined ? { maximo } : {}),
      opcoes,
    });
    if (problema) {
      return { ok: false as const, erro: 'detalhe' in problema ? problema.detalhe : problema.erro };
    }

    const afectadas = await db.modifierGroup.updateMany({
      where: { id: groupId, version: versao },
      data: {
        ...(nome ? { nome } : {}),
        obrigatorio, minimo,
        maximo: maximo === undefined ? null : maximo,
        destino: texto(dados, 'destino') ?? null,
        version: { increment: 1 },
      },
    });
    if (afectadas.count === 0) return { ok: false as const, erro: 'conflito_de_versao' };

    for (const o of actual.opcoes) {
      const nomeNovo = texto(dados, `opcao:${o.id}`);
      const precoEscrito = texto(dados, `preco:${o.id}`);
      const moeda = texto(dados, `moeda:${o.id}`)?.toUpperCase();
      // O acréscimo e a moeda andam juntos ou não andam: a base tem um CHECK a
      // exigir `(preco IS NULL) = (moeda IS NULL)`, porque um número sem moeda
      // não é dinheiro. `null` nos dois é "não acrescenta nada" — que é
      // diferente de acrescentar zero.
      const menor = precoEscrito && moeda && moedaValida(moeda)
        ? deTextoParaMenor(precoEscrito, moeda) : null;
      await db.modifierOption.updateMany({
        where: { id: o.id },
        data: {
          ...(nomeNovo ? { nome: nomeNovo } : {}),
          precoMenor: menor,
          moeda: menor === null ? null : (moeda as string),
        },
      });
    }
    if (nova) {
      await db.modifierOption.create({
        data: {
          organizationId: sessao.contexto.organizationId, groupId,
          nome: nova, ordem: actual.opcoes.length + 1,
        },
      });
    }

    await registar(db, sessao.contexto.organizationId, {
      accao: 'grupo.guardado', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'modifier_group', alvoId: groupId,
      detalhe: { versao, obrigatorio, minimo, maximo: maximo ?? null, opcoes: opcoes.length },
    });
    return { ok: true as const };
  });

  if (!r.ok) return voltarPara(destino, { erro: r.erro });
  return voltarPara(destino, { guardado: '1' });
}
