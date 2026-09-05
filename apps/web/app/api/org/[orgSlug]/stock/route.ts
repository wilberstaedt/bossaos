import { NextResponse } from 'next/server';
import {
  criarFicha, criarInsumo, insumosDaUnidade, juntarLinhaDaFicha, listarUnidades,
  movimentarStock,
} from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido, actorDoPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A porta do stock.
 *
 * ── Não há aqui nenhuma acção que escreva o saldo ─────────────────────────
 *
 * Nem `definir_saldo`, nem `acertar_stock`. Tudo o que muda um número passa por
 * `movimentarStock`, que exige tipo, quantidade e **razão** — e o gatilho da
 * base reporia qualquer escrita directa de qualquer maneira.
 *
 * Isto não é rigor decorativo: é o que separa «a contagem não bate» de «a
 * contagem não bate a partir deste movimento, lançado por esta pessoa, com esta
 * razão».
 */
function inteiro(dados: FormData, campo: string): number | null {
  const bruto = (texto(dados, campo) ?? '').trim();
  // Inteiro, e só inteiro. `parseFloat` aqui seria a vírgula flutuante a entrar
  // por uma porta que a guarda das quantidades não vigia.
  if (!/^\d+$/.test(bruto)) return null;
  return Number(bruto);
}

export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const actor = await actorDoPedido();
  if (!actor) return NextResponse.json({ erro: 'sem_sessao' }, { status: 401 });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const locationId = texto(dados, 'locationId') ?? '';
  const locationSlug = texto(dados, 'locationSlug') ?? '';
  const accao = texto(dados, 'accao') ?? '';
  const organizationId = sessao.contexto.organizationId;

  // A unidade resolve-se DENTRO do escopo: um identificador vindo do formulário
  // e usado sem esta leitura deixava mexer na unidade de outra organização.
  const unidades = await comEscopoDoPedido(sessao, (db) => listarUnidades(db));
  const unidade = (unidades as { id: string }[]).find((u) => u.id === locationId);
  if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  const paraStock = () => `/${idioma}/app/${orgSlug}/${locationSlug}/inventory`;

  try {
    if (accao === 'criar_insumo') {
      const nome = texto(dados, 'nome') ?? '';
      const unidadeMedida = texto(dados, 'unidade') ?? 'KG';
      if (!nome.trim()) return voltarPara(`${paraStock()}/itens`, { erro: 'nome' });
      await comEscopoDoPedido(sessao, (db) => criarInsumo(db, {
        organizationId, locationId, nome, unidade: unidadeMedida,
      }));
      return voltarPara(`${paraStock()}/itens`, { ok: 'insumo' });
    }

    if (accao === 'movimentar') {
      const itemId = texto(dados, 'itemId') ?? '';
      const quantidade = inteiro(dados, 'quantidade');
      const motivo = texto(dados, 'motivo') ?? '';
      const bruto = texto(dados, 'tipo') ?? 'ENTRADA';
      const tipo = (['ENTRADA', 'AJUSTE', 'QUEBRA'] as const)
        .find((x) => x === bruto) ?? 'ENTRADA';
      if (quantidade === null || motivo.trim().length < 3) {
        return voltarPara(`${paraStock()}/itens/${itemId}`, { erro: 'movimento' });
      }
      await comEscopoDoPedido(sessao, (db) => movimentarStock(db, {
        itemId, tipo, quantidadeMili: quantidade, motivo, actor: actor.id,
      }));
      return voltarPara(`${paraStock()}/itens/${itemId}`, { ok: 'movimento' });
    }

    if (accao === 'contar') {
      // ── A contagem lança um AJUSTE, e nunca escreve o saldo ──────────────
      //
      // A diferença é calculada aqui e vai como movimento, com a razão a dizer
      // que veio de uma contagem. Pôr o saldo directamente apagaria o rasto de
      // quando é que deixou de bater — a única informação útil que uma contagem
      // produz.
      const itemId = texto(dados, 'itemId') ?? '';
      const contado = inteiro(dados, 'contado');
      if (contado === null) return voltarPara(`${paraStock()}/contagem`, { erro: 'contado' });
      await comEscopoDoPedido(sessao, async (db) => {
        const insumos = await insumosDaUnidade(db, locationId);
        const insumo = insumos.find((i) => i.id === itemId);
        if (!insumo) return;
        const diferenca = contado - Number(insumo.saldoMili);
        if (diferenca === 0) return;
        await movimentarStock(db, {
          itemId, tipo: diferenca > 0 ? 'AJUSTE' : 'QUEBRA',
          quantidadeMili: Math.abs(diferenca),
          motivo: `contagem: contado ${contado}, esperado ${insumo.saldoMili}`,
          actor: actor.id,
        });
      });
      return voltarPara(`${paraStock()}/contagem`, { ok: 'contado' });
    }

    if (accao === 'transferir') {
      // ── Dois movimentos, e não um ───────────────────────────────────────
      //
      // Uma saída aqui e uma entrada lá. Um só movimento faria a mercadoria em
      // trânsito estar disponível nos dois sítios ao mesmo tempo.
      const itemId = texto(dados, 'itemId') ?? '';
      const paraLocationId = texto(dados, 'paraLocationId') ?? '';
      const quantidade = inteiro(dados, 'quantidade');
      if (quantidade === null) {
        return voltarPara(`${paraStock()}/transferencia`, { erro: 'quantidade' });
      }
      await comEscopoDoPedido(sessao, async (db) => {
        const daqui = await insumosDaUnidade(db, locationId);
        const insumo = daqui.find((i) => i.id === itemId);
        if (!insumo) return;
        await movimentarStock(db, {
          itemId, tipo: 'TRANSFERENCIA_SAIDA', quantidadeMili: quantidade,
          motivo: `transferência para ${paraLocationId}`, actor: actor.id,
        });
        // Do outro lado, o insumo pode não existir ainda: cria-se com o mesmo
        // nome, e a entrada é um movimento seu.
        const la = await insumosDaUnidade(db, paraLocationId);
        const destino = la.find((i) => i.nome === insumo.nome)
          ?? await criarInsumo(db, {
            organizationId, locationId: paraLocationId,
            nome: insumo.nome, unidade: insumo.unidade,
          });
        await movimentarStock(db, {
          itemId: destino.id, tipo: 'TRANSFERENCIA_ENTRADA', quantidadeMili: quantidade,
          motivo: `transferência de ${locationId}`, actor: actor.id,
        });
      });
      return voltarPara(`${paraStock()}/transferencia`, { ok: 'transferido' });
    }

    if (accao === 'criar_ficha') {
      const nome = texto(dados, 'nome') ?? '';
      const rende = inteiro(dados, 'rende');
      if (!nome.trim()) return voltarPara(`${paraStock()}/fichas`, { erro: 'nome' });
      await comEscopoDoPedido(sessao, (db) => criarFicha(db, {
        organizationId, locationId, nome,
        ...(rende === null || rende <= 0 ? {} : { rendeMili: rende }),
      }));
      return voltarPara(`${paraStock()}/fichas`, { ok: 'ficha' });
    }

    if (accao === 'juntar_linha') {
      const recipeId = texto(dados, 'recipeId') ?? '';
      const itemId = texto(dados, 'itemId') ?? '';
      const subRecipeId = texto(dados, 'subRecipeId') ?? '';
      const quantidade = inteiro(dados, 'quantidade');
      // Um OU outro, nunca os dois: a base recusa-o por `CHECK`, e recusar aqui
      // primeiro dá uma frase em vez de uma violação de restrição.
      if (quantidade === null || (!!itemId === !!subRecipeId)) {
        return voltarPara(`${paraStock()}/fichas/${recipeId}`, { erro: 'linha' });
      }
      await comEscopoDoPedido(sessao, (db) => juntarLinhaDaFicha(db, {
        organizationId, recipeId, quantidadeMili: quantidade,
        ...(itemId ? { itemId } : {}), ...(subRecipeId ? { subRecipeId } : {}),
      }));
      return voltarPara(`${paraStock()}/fichas/${recipeId}`, { ok: 'linha' });
    }
  } catch (e) {
    // A recusa de negócio volta com o nome dela. Um 500 dizia «alguma coisa
    // correu mal» a quem precisa de saber O QUÊ — e aqui o «o quê» pode ser
    // «esta linha fecharia um ciclo».
    const motivo = e instanceof Error && /^[A-Z_]+:/.test(e.message)
      ? e.message.split(':')[0] : 'erro';
    return voltarPara(paraStock(), { erro: motivo ?? 'erro' });
  }

  return NextResponse.json({ erro: 'accao_desconhecida' }, { status: 400 });
}
