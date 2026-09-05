import { NextResponse } from 'next/server';
import {
  criarCampanha, criarCliente, criarModeloDeCampanha, criarRecompensa, criarSegmento,
  enviarCampanha, juntarContactos, listarUnidades, registarConsentimento, resgatar,
} from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido, actorDoPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A porta do CRM.
 *
 * ── Não há aqui nenhuma acção que importe contactos ───────────────────────
 *
 * Não há `importar_lista`, não há `marcar_aceita_campanhas`, e não há nenhuma
 * acção que copie o contacto de uma reserva ou de uma espera para o CRM. Um
 * caminho de importação é o caminho por onde entra a lista sem origem de
 * consentimento — e a decisão de não o ter é a garantia.
 */
function inteiro(dados: FormData, campo: string): number | null {
  const bruto = (texto(dados, campo) ?? '').trim();
  if (!/^\d+$/.test(bruto)) return null;
  return Number(bruto);
}

export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'clientes.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const actor = await actorDoPedido();
  if (!actor) return NextResponse.json({ erro: 'sem_sessao' }, { status: 401 });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const locationSlug = texto(dados, 'locationSlug') ?? '';
  const accao = texto(dados, 'accao') ?? '';
  const organizationId = sessao.contexto.organizationId;

  const raiz = () => `/${idioma}/app/${orgSlug}/${locationSlug}/customers`;

  // A unidade resolve-se DENTRO do escopo quando o formulário a manda.
  let locationId = texto(dados, 'locationId') ?? '';
  if (dados.has('locationId')) {
    const unidades = await comEscopoDoPedido(sessao, (db) => listarUnidades(db));
    const unidade = (unidades as { id: string }[]).find((u) => u.id === locationId);
    if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });
    locationId = unidade.id;
  }

  try {
    if (accao === 'criar_cliente') {
      const nome = texto(dados, 'nome') ?? '';
      if (!nome.trim()) return voltarPara(raiz(), { erro: 'nome' });
      const email = texto(dados, 'email') ?? '';
      const telefone = texto(dados, 'telefone') ?? '';
      const origem = texto(dados, 'origem') ?? '';
      // Repare-se: cria a pessoa e mais nada. Nascer no CRM não é consentir.
      await comEscopoDoPedido(sessao, (db) => criarCliente(db, {
        organizationId, locationId, nome,
        ...(email ? { email } : {}),
        ...(telefone ? { telefone } : {}),
        ...(origem ? { origem } : {}),
      }));
      return voltarPara(raiz(), { ok: 'cliente' });
    }

    if (accao === 'consentimento') {
      const customerId = texto(dados, 'customerId') ?? '';
      const finalidade = texto(dados, 'finalidade') === 'CAMPANHA' ? 'CAMPANHA' : 'SERVICO';
      const canal = texto(dados, 'canal') === 'SMS' ? 'SMS' : 'EMAIL';
      const valor = texto(dados, 'valor') === 'DADO' ? 'DADO' : 'RETIRADO';
      await comEscopoDoPedido(sessao, (db) => registarConsentimento(db, {
        organizationId, customerId, finalidade, canal, accao: valor,
        // A origem é quem o registou e onde: sem ela não se defende a ninguém.
        origem: `painel:${actor.email}`,
      }));
      return voltarPara(`${raiz()}/${customerId}/preferencias`, { ok: 'consentimento' });
    }

    if (accao === 'juntar') {
      const absorvidoId = texto(dados, 'absorvidoId') ?? '';
      const ficaId = texto(dados, 'ficaId') ?? '';
      if (absorvidoId === ficaId) return voltarPara(`${raiz()}/juntar`, { erro: 'mesma' });
      await comEscopoDoPedido(sessao, (db) => juntarContactos(db, { absorvidoId, ficaId }));
      return voltarPara(raiz(), { ok: 'juntado' });
    }

    if (accao === 'criar_segmento') {
      const nome = texto(dados, 'nome') ?? '';
      const canal = texto(dados, 'canal') === 'SMS' ? 'SMS' : 'EMAIL';
      const pontos = inteiro(dados, 'pontosMinimos');
      const origem = texto(dados, 'origem') ?? '';
      if (!nome.trim()) return voltarPara(`${raiz()}/segmentos/novo`, { erro: 'nome' });
      await comEscopoDoPedido(sessao, (db) => criarSegmento(db, {
        organizationId, locationId, nome,
        regra: {
          // O consentimento entra SEMPRE na regra a partir daqui. Um segmento
          // criado por este ecrã nunca sai sem a cláusula.
          exigeConsentimento: { finalidade: 'CAMPANHA', canal },
          ...(pontos === null ? {} : { pontosMinimos: pontos }),
          ...(origem ? { origem } : {}),
        },
      }));
      return voltarPara(`${raiz()}/segmentos`, { ok: 'segmento' });
    }

    if (accao === 'criar_modelo') {
      const nome = texto(dados, 'nome') ?? '';
      const corpo = texto(dados, 'corpo') ?? '';
      const canal = texto(dados, 'canal') === 'SMS' ? 'SMS' : 'EMAIL';
      const assunto = texto(dados, 'assunto') ?? '';
      if (!nome.trim() || !corpo.trim()) return voltarPara(`${raiz()}/modelos`, { erro: 'modelo' });
      await comEscopoDoPedido(sessao, (db) => criarModeloDeCampanha(db, {
        organizationId, locationId, nome, canal, corpo,
        ...(assunto ? { assunto } : {}),
      }));
      return voltarPara(`${raiz()}/modelos`, { ok: 'modelo' });
    }

    if (accao === 'criar_campanha') {
      const nome = texto(dados, 'nome') ?? '';
      const canal = texto(dados, 'canal') === 'SMS' ? 'SMS' : 'EMAIL';
      const segmentId = texto(dados, 'segmentId') ?? '';
      const templateId = texto(dados, 'templateId') ?? '';
      if (!nome.trim()) return voltarPara(`${raiz()}/campanhas/nova`, { erro: 'nome' });
      await comEscopoDoPedido(sessao, (db) => criarCampanha(db, {
        organizationId, locationId, nome, canal, segmentId, templateId,
        criadaPor: actor.email,
      }));
      return voltarPara(`${raiz()}/campanhas`, { ok: 'campanha' });
    }

    if (accao === 'enviar') {
      // A verificação do consentimento acontece dentro, por pessoa e no instante
      // de gravar cada envio. Não se faz aqui, e não se faz uma vez só.
      const campaignId = texto(dados, 'campaignId') ?? '';
      const r = await comEscopoDoPedido(sessao, (db) => enviarCampanha(db, campaignId));
      return voltarPara(`${raiz()}/campanhas`,
        { ok: `enviados:${r.gravados}:recusados:${r.recusados.length}` });
    }

    if (accao === 'criar_recompensa') {
      const nome = texto(dados, 'nome') ?? '';
      const custo = inteiro(dados, 'custoPontos');
      const valor = inteiro(dados, 'valorMenor');
      if (!nome.trim() || custo === null || valor === null) {
        return voltarPara(`${raiz()}/fidelidade`, { erro: 'recompensa' });
      }
      await comEscopoDoPedido(sessao, (db) => criarRecompensa(db, {
        organizationId, locationId, nome, custoPontos: custo, valorMenor: valor,
      }));
      return voltarPara(`${raiz()}/fidelidade`, { ok: 'recompensa' });
    }

    if (accao === 'resgatar') {
      const customerId = texto(dados, 'customerId') ?? '';
      const rewardId = texto(dados, 'rewardId') ?? '';
      await comEscopoDoPedido(sessao, (db) => resgatar(db, {
        organizationId, customerId, rewardId,
      }));
      return voltarPara(`${raiz()}/${customerId}/recompensas`, { ok: 'resgate' });
    }

    return NextResponse.json({ erro: 'accao_desconhecida' }, { status: 400 });
  } catch (e) {
    const motivo = e instanceof Error && 'motivo' in e ? String(e.motivo) : 'erro';
    return voltarPara(raiz(), { erro: motivo });
  }
}
