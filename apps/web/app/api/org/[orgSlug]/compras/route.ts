import { NextResponse } from 'next/server';
import {
  criarEncomenda, criarFornecedor, juntarLinhaDaEncomenda, ligarArtigo, listarUnidades,
  receber, registarFactura,
} from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido, actorDoPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A porta das compras.
 *
 * ── Não há aqui nenhuma acção que faça uma encomenda entrar no stock ──────
 *
 * Não há `confirmar_encomenda`, não há `receber_tudo`. A única acção que gera
 * um movimento é `receber`, e ela exige que alguém escreva **quanto contou** —
 * não herda o número da encomenda.
 *
 * Herdá-lo pareceria uma comodidade e seria o defeito da etapa: a cozinha
 * passava a ver farinha que está dentro de um camião.
 */
function inteiro(dados: FormData, campo: string): number | null {
  const bruto = (texto(dados, campo) ?? '').trim();
  // Inteiro, e só inteiro. `parseFloat` aqui seria a vírgula flutuante a entrar
  // por uma porta que nem a guarda do dinheiro nem a das quantidades vigiam.
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
  const locationSlug = texto(dados, 'locationSlug') ?? '';
  const accao = texto(dados, 'accao') ?? '';
  const organizationId = sessao.contexto.organizationId;

  const paraCompras = () => `/${idioma}/app/${orgSlug}/${locationSlug}/purchases`;
  const paraFornecedores = () => `/${idioma}/app/${orgSlug}/${locationSlug}/suppliers`;

  // A unidade resolve-se DENTRO do escopo quando o formulário a manda: um
  // identificador vindo de fora e usado sem esta leitura deixava mexer na
  // unidade de outra organização.
  const pedidoTemUnidade = dados.has('locationId');
  let locationId = texto(dados, 'locationId') ?? '';
  if (pedidoTemUnidade) {
    const unidades = await comEscopoDoPedido(sessao, (db) => listarUnidades(db));
    const unidade = (unidades as { id: string }[]).find((u) => u.id === locationId);
    if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });
    locationId = unidade.id;
  }

  try {
    if (accao === 'criar_fornecedor') {
      const nome = texto(dados, 'nome') ?? '';
      if (!nome.trim()) return voltarPara(paraFornecedores(), { erro: 'nome' });
      const contacto = texto(dados, 'contacto') ?? '';
      const nif = texto(dados, 'nif') ?? '';
      await comEscopoDoPedido(sessao, (db) => criarFornecedor(db, {
        organizationId, locationId, nome,
        ...(contacto ? { contacto } : {}),
        ...(nif ? { nif } : {}),
      }));
      return voltarPara(paraFornecedores(), { ok: 'fornecedor' });
    }

    if (accao === 'ligar_artigo') {
      // ── Sem factor, recusa-se — e a recusa é dita ────────────────────────
      //
      // Um saco de 25 kg lido como uma unidade dá stock de 1 onde há 25 000 g.
      // A base recusa-o com `CHECK`; aqui a recusa volta para o formulário com
      // um nome, para quem está a preencher perceber o que falta.
      const supplierId = texto(dados, 'supplierId') ?? '';
      const itemId = texto(dados, 'itemId') ?? '';
      const factor = inteiro(dados, 'factor');
      const unidadeDeCompra = texto(dados, 'unidadeDeCompra') ?? '';
      const preco = inteiro(dados, 'preco');
      if (factor === null || factor <= 0 || !unidadeDeCompra.trim()) {
        return voltarPara(`${paraFornecedores()}/${supplierId}`, { erro: 'factor' });
      }
      await comEscopoDoPedido(sessao, (db) => ligarArtigo(db, {
        organizationId, supplierId, itemId, unidadeDeCompra, factorMili: factor,
        ...(preco === null ? {} : { precoMenor: preco }),
      }));
      return voltarPara(`${paraFornecedores()}/${supplierId}`, { ok: 'artigo' });
    }

    if (accao === 'criar_encomenda') {
      const supplierId = texto(dados, 'supplierId') ?? '';
      const numero = texto(dados, 'numero') ?? '';
      if (!numero.trim()) return voltarPara(`${paraCompras()}/nova`, { erro: 'numero' });
      const enc = await comEscopoDoPedido(sessao, (db) => criarEncomenda(db, {
        organizationId, locationId, supplierId, numero, criadaPor: actor.email,
      }));
      return voltarPara(`${paraCompras()}/${enc.id}`, { ok: 'encomenda' });
    }

    if (accao === 'juntar_linha') {
      const purchaseOrderId = texto(dados, 'purchaseOrderId') ?? '';
      const supplierItemId = texto(dados, 'supplierItemId') ?? '';
      const quantidade = inteiro(dados, 'quantidade');
      if (quantidade === null || quantidade <= 0) {
        return voltarPara(`${paraCompras()}/${purchaseOrderId}`, { erro: 'quantidade' });
      }
      await comEscopoDoPedido(sessao, (db) => juntarLinhaDaEncomenda(db, {
        organizationId, purchaseOrderId, supplierItemId, encomendadoMili: quantidade,
      }));
      return voltarPara(`${paraCompras()}/${purchaseOrderId}`, { ok: 'linha' });
    }

    if (accao === 'receber') {
      // ── A ÚNICA acção desta rota que mexe no stock ───────────────────────
      //
      // E a quantidade vem do formulário, não da encomenda: quem conta à porta
      // escreve o que contou. Herdar o encomendado seria dar entrada de 10
      // quando chegaram 8, com o número certo no ecrã e a farinha em falta.
      const purchaseOrderId = texto(dados, 'purchaseOrderId') ?? '';
      const purchaseOrderLineId = texto(dados, 'purchaseOrderLineId') ?? '';
      const quantidade = inteiro(dados, 'quantidade');
      const custo = inteiro(dados, 'custo');
      if (quantidade === null || quantidade <= 0 || custo === null) {
        return voltarPara(`${paraCompras()}/${purchaseOrderId}`, { erro: 'recepcao' });
      }
      await comEscopoDoPedido(sessao, (db) => receber(db, {
        organizationId, purchaseOrderId, recebidaPor: actor.email,
        linhas: [{ purchaseOrderLineId, recebidoMili: quantidade, custoTotalMenor: custo }],
      }));
      return voltarPara(`${paraCompras()}/${purchaseOrderId}`, { ok: 'recepcao' });
    }

    if (accao === 'registar_factura') {
      // A factura é PAPEL: regista-se, e não move nada. A diferença entre o que
      // ela diz e o que entrou é a informação, e deriva-se da comparação.
      const purchaseOrderId = texto(dados, 'purchaseOrderId') ?? '';
      const supplierId = texto(dados, 'supplierId') ?? '';
      const supplierItemId = texto(dados, 'supplierItemId') ?? '';
      const numero = texto(dados, 'numero') ?? '';
      const quantidade = inteiro(dados, 'quantidade');
      const total = inteiro(dados, 'total');
      if (quantidade === null || quantidade <= 0 || total === null || !numero.trim()) {
        return voltarPara(`${paraCompras()}/${purchaseOrderId}`, { erro: 'factura' });
      }
      await comEscopoDoPedido(sessao, (db) => registarFactura(db, {
        organizationId, supplierId, purchaseOrderId, numero,
        linhas: [{ supplierItemId, facturadoMili: quantidade, totalMenor: total }],
      }));
      return voltarPara(`${paraCompras()}/${purchaseOrderId}`, { ok: 'factura' });
    }

    return NextResponse.json({ erro: 'accao_desconhecida' }, { status: 400 });
  } catch (e) {
    const motivo = e instanceof Error && 'motivo' in e ? String(e.motivo) : 'erro';
    return voltarPara(paraCompras(), { erro: motivo });
  }
}
