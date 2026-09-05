import { NextResponse } from 'next/server';
import {
  confirmarCorrespondencia, criarConta, criarPeriodo, fecharPeriodo,
  importarExtracto, listarUnidades, reabrirPeriodo, registarMovimento,
  sugerirCorrespondencia,
} from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido, actorDoPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A porta do financeiro.
 *
 * ── Não há aqui nenhuma acção que marque algo como conciliado ─────────────
 *
 * Não há `marcar_conciliado`. Não há `confirmar_tudo`. E não há nenhuma acção
 * que escreva um total de fecho. Conciliado deriva-se de haver correspondência
 * confirmada, e confirmar exige **quem** — que sai da sessão, não do formulário.
 */
/**
 * Um inteiro pequeno — para coisas que não são dinheiro.
 *
 * A semelhança de uma correspondência vai de 0 a 100 e cabe num `number` com
 * folga. Dinheiro **não** passa por aqui: tem leitor próprio, uma linha abaixo.
 */
function inteiroPequeno(dados: FormData, campo: string): number | null {
  const bruto = (texto(dados, campo) ?? '').trim();
  if (!/^-?\d+$/.test(bruto)) return null;
  return Number(bruto);
}

/**
 * ── O dinheiro sai daqui como CADEIA, e nunca como `number` ───────────────
 *
 * Este padrão aceita trinta dígitos, e um `Number` de trinta dígitos é uma
 * aproximação — em silêncio. A cadeia validada viaja inteira até ao `BigInt()`
 * do motor, que a lê exacta.
 *
 * Aceita negativo: uma despesa lançada à mão pode vir com sinal. O que não se
 * aceita é vírgula — `parseFloat` aqui era a porta que a guarda não vigia.
 */
function dinheiroEmTexto(dados: FormData, campo: string): string | null {
  const bruto = (texto(dados, campo) ?? '').trim();
  if (!/^-?\d+$/.test(bruto)) return null;
  return bruto;
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'financeiro.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const actor = await actorDoPedido();
  if (!actor) return NextResponse.json({ erro: 'sem_sessao' }, { status: 401 });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const locationSlug = texto(dados, 'locationSlug') ?? '';
  const accao = texto(dados, 'accao') ?? '';
  const organizationId = sessao.contexto.organizationId;
  const raiz = () => `/${idioma}/app/${orgSlug}/${locationSlug}/finance`;

  let locationId = texto(dados, 'locationId') ?? '';
  if (dados.has('locationId')) {
    const unidades = await comEscopoDoPedido(sessao, (db) => listarUnidades(db));
    const unidade = (unidades as { id: string }[]).find((u) => u.id === locationId);
    if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });
    locationId = unidade.id;
  }

  try {
    if (accao === 'criar_conta') {
      const nome = texto(dados, 'nome') ?? '';
      const moeda = texto(dados, 'moeda') ?? '';
      if (!nome.trim()) return voltarPara(`${raiz()}/contas`, { erro: 'nome' });
      await comEscopoDoPedido(sessao, (db) => criarConta(db, {
        organizationId, locationId, nome, ...(moeda ? { moeda: moeda.toUpperCase() } : {}),
      }));
      return voltarPara(`${raiz()}/contas`, { ok: 'conta' });
    }

    if (accao === 'confirmar') {
      // ── O autor sai da SESSÃO, e não do formulário ──────────────────────
      //
      // Um autor vindo do corpo do pedido é um autor que quem submete escolhe.
      // Quem concilia responde pelo que conciliou.
      const reconciliationId = texto(dados, 'reconciliationId') ?? '';
      const accountId = texto(dados, 'accountId') ?? '';
      await comEscopoDoPedido(sessao, (db) => confirmarCorrespondencia(db, {
        reconciliationId, autor: actor.email,
      }));
      return voltarPara(`${raiz()}/conciliar/${accountId}`, { ok: 'confirmada' });
    }

    if (accao === 'registar_despesa') {
      const conceito = texto(dados, 'conceito') ?? '';
      const montante = dinheiroEmTexto(dados, 'montante');
      const moeda = texto(dados, 'moeda') ?? '';
      const ocorrenciaEm = (texto(dados, 'ocorrenciaEm') ?? '').trim();
      const valorEm = (texto(dados, 'valorEm') ?? '').trim();
      const centro = texto(dados, 'centroDeCusto') ?? '';
      if (!conceito.trim() || montante === null
          || !DATA.test(ocorrenciaEm) || !DATA.test(valorEm)) {
        return voltarPara(`${raiz()}/despesas/nova`, { erro: 'despesa' });
      }
      await comEscopoDoPedido(sessao, (db) => registarMovimento(db, {
        organizationId, locationId, tipo: 'DESPESA', conceito,
        montanteMenor: montante, ...(moeda ? { moeda: moeda.toUpperCase() } : {}),
        ocorrenciaEm, valorEm,
        ...(centro ? { centroDeCusto: centro } : {}),
        origemTipo: 'manual', origemId: locationId,
      }));
      return voltarPara(`${raiz()}/despesas`, { ok: 'despesa' });
    }

    if (accao === 'importar') {
      // ── O extracto entra por AQUI, e a contagem volta para o ecrã ───────
      //
      // O formulário traz as linhas em texto, uma por linha:
      // `AAAA-MM-DD;montante;referência`. É cru de propósito — um leitor de
      // formatos de banco é outra etapa, e inventar um agora era prometer que
      // se lê o que não se leu.
      const accountId = texto(dados, 'accountId') ?? '';
      const ficheiro = texto(dados, 'ficheiro') ?? 'colado';
      const bruto = texto(dados, 'linhas') ?? '';
      const linhas = bruto.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
        const [data, montante, referencia] = l.split(';');
        return { data: data ?? '', montante: montante ?? '', referencia: referencia ?? '' };
      });
      const validas = linhas.filter(
        (l) => DATA.test(l.data) && /^-?\d+$/.test(l.montante));
      if (validas.length === 0) {
        return voltarPara(`${raiz()}/contas/${accountId}`, { erro: 'linhas' });
      }
      const r = await comEscopoDoPedido(sessao, (db) => importarExtracto(db, {
        organizationId, accountId, ficheiro, importadoPor: actor.email,
        linhas: validas.map((l) => ({
          // ── A cadeia VALIDADA viaja inteira até ao `BigInt()` ─────────
          //
          // `Number(l.montante)` perdia precisão em silêncio: o `/^-?\d+$/`
          // acima aceita trinta dígitos, e um `Number` de trinta dígitos é uma
          // aproximação. Aqui não se converte nada — a cadeia passa como está.
          dataValor: l.data, montanteMenor: l.montante,
          ...(l.referencia ? { referencia: l.referencia } : {}),
        })),
      }));
      // A contagem volta no endereço: quem carregou tem de saber quantas
      // entraram e quantas foram ignoradas. O silêncio é que é o defeito.
      return voltarPara(`${raiz()}/contas/${accountId}`,
        { ok: `novas:${r.novas}:ja-vistas:${r.jaVistas}` });
    }

    if (accao === 'sugerir') {
      // Nasce SUGERIDA, sempre. Confirmar é outro passo, com autor.
      const bankLineId = texto(dados, 'bankLineId') ?? '';
      const movementId = texto(dados, 'movementId') ?? '';
      const accountId = texto(dados, 'accountId') ?? '';
      const semelhanca = inteiroPequeno(dados, 'semelhanca') ?? 0;
      await comEscopoDoPedido(sessao, (db) => sugerirCorrespondencia(db, {
        organizationId, bankLineId, movementId, semelhanca,
      }));
      return voltarPara(`${raiz()}/conciliar/${accountId}`, { ok: 'sugerida' });
    }

    if (accao === 'fechar') {
      // Fechar PROÍBE movimentos novos com data dentro. Não copia totais.
      const periodId = texto(dados, 'periodId') ?? '';
      await comEscopoDoPedido(sessao, (db) => fecharPeriodo(db, {
        organizationId, periodId, autor: actor.email,
      }));
      return voltarPara(`${raiz()}/documentos`, { ok: 'fechado' });
    }

    if (accao === 'criar_periodo') {
      const de = (texto(dados, 'de') ?? '').trim();
      const ate = (texto(dados, 'ate') ?? '').trim();
      if (!DATA.test(de) || !DATA.test(ate)) {
        return voltarPara(`${raiz()}/documentos`, { erro: 'periodo' });
      }
      await comEscopoDoPedido(sessao, (db) => criarPeriodo(db, {
        organizationId, locationId, de, ate,
      }));
      return voltarPara(`${raiz()}/documentos`, { ok: 'periodo' });
    }

    if (accao === 'reabrir') {
      // Reabrir sem motivo é um interruptor com outro nome — e a base recusa-o.
      const periodId = texto(dados, 'periodId') ?? '';
      const motivo = texto(dados, 'motivo') ?? '';
      if (!motivo.trim()) return voltarPara(`${raiz()}/documentos`, { erro: 'motivo' });
      await comEscopoDoPedido(sessao, (db) => reabrirPeriodo(db, {
        organizationId, periodId, autor: actor.email, motivo,
      }));
      return voltarPara(`${raiz()}/documentos`, { ok: 'reaberto' });
    }

    return NextResponse.json({ erro: 'accao_desconhecida' }, { status: 400 });
  } catch (e) {
    const motivo = e instanceof Error && 'motivo' in e ? String(e.motivo) : 'erro';
    return voltarPara(raiz(), { erro: motivo });
  }
}
