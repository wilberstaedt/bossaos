import { NextResponse } from 'next/server';
import {
  corrigir, criarFuncao, criarTurno, equipaDaUnidade, listarUnidades, picar,
} from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido, actorDoPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A porta do ponto.
 *
 * ── Não há aqui nenhuma acção que edite uma marcação ──────────────────────
 *
 * Não há `editar_marcacao`, não há `apagar_marcacao`. A única maneira de mudar
 * o que uma marcação diz é `corrigir`, que grava um registo NOVO com autor e
 * motivo — e a base recusaria qualquer outra coisa com `REGISTO_IMUTAVEL`.
 *
 * Esta etapa mexe no salário de quem trabalha na casa.
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
  const recusa = exigirAccao(sessao.concessoes, 'equipa.ler');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const actor = await actorDoPedido();
  if (!actor) return NextResponse.json({ erro: 'sem_sessao' }, { status: 401 });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const locationSlug = texto(dados, 'locationSlug') ?? '';
  const accao = texto(dados, 'accao') ?? '';
  const organizationId = sessao.contexto.organizationId;
  const raiz = () => `/${idioma}/app/${orgSlug}/${locationSlug}/team`;

  const unidades = await comEscopoDoPedido(sessao, (db) => listarUnidades(db)) as
    { id: string; fuso: string | null }[];
  const unidade = unidades.find((u) => u.id === (texto(dados, 'locationId') ?? ''));
  if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });
  const fuso = unidade.fuso ?? 'Europe/Madrid';

  // Quem está a registar. É a pertença de quem tem a sessão, e é ela que fica
  // no `autor_membership_id` — uma autocorrecção é `autor = pessoa`.
  const equipa = await comEscopoDoPedido(sessao, (db) => equipaDaUnidade(db, organizationId));
  const eu = equipa.find((m) => m.userId === sessao.contexto.actorId);
  if (!eu) return NextResponse.json({ erro: 'sem_pertenca' }, { status: 403 });

  try {
    if (accao === 'criar_funcao') {
      const nome = texto(dados, 'nome') ?? '';
      if (!nome.trim()) return voltarPara(`${raiz()}/funcoes`, { erro: 'nome' });
      await comEscopoDoPedido(sessao, (db) => criarFuncao(db, {
        organizationId, locationId: unidade.id, nome,
      }));
      return voltarPara(`${raiz()}/funcoes`, { ok: 'funcao' });
    }

    if (accao === 'criar_turno') {
      const membershipId = texto(dados, 'membershipId') ?? '';
      const roleId = texto(dados, 'roleId') ?? '';
      const dia = texto(dados, 'dia') ?? '';
      const inicio = inteiro(dados, 'inicioMinutos');
      const fim = inteiro(dados, 'fimMinutos');
      const nota = texto(dados, 'nota') ?? '';
      if (inicio === null || fim === null || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
        return voltarPara(`${raiz()}/escala/novo`, { erro: 'turno' });
      }
      await comEscopoDoPedido(sessao, (db) => criarTurno(db, {
        organizationId, locationId: unidade.id, membershipId,
        ...(roleId ? { roleId } : {}),
        diaDeServico: dia, inicioMinutos: inicio, fimMinutos: fim,
        ...(nota ? { nota } : {}),
      }));
      return voltarPara(`${raiz()}/escala`, { ok: 'turno' });
    }

    if (accao === 'picar') {
      // ── O momento é o carimbo do SERVIDOR ───────────────────────────────
      //
      // Não vem do formulário. Picar é dizer «agora»; declarar uma hora é a
      // correcção, que tem outro caminho e exige motivo.
      const membershipId = texto(dados, 'membershipId') ?? '';
      const tipo = texto(dados, 'tipo') === 'SAIDA' ? 'SAIDA' : 'ENTRADA';
      await comEscopoDoPedido(sessao, (db) => picar(db, {
        organizationId, locationId: unidade.id, membershipId,
        autorMembershipId: eu.id, tipo, momento: new Date(), fuso, origem: 'painel',
      }));
      return voltarPara(`${raiz()}/picar`, { ok: 'picado' });
    }

    if (accao === 'corrigir') {
      const marcacaoId = texto(dados, 'marcacaoId') ?? '';
      const bruto = (texto(dados, 'momento') ?? '').trim();
      const motivo = texto(dados, 'motivo') ?? '';
      // `AAAA-MM-DDTHH:MM` em hora da CASA. Sem o `Z` colado: essa foi a forma
      // exacta do defeito do fuso, e aqui a hora vem escrita por uma pessoa.
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(bruto) || !motivo.trim()) {
        return voltarPara(`${raiz()}/correccao`, { erro: 'correccao' });
      }
      const local = new Date(`${bruto}:00Z`);
      const desvio = local.getTime()
        - new Date(local.toLocaleString('sv-SE', { timeZone: fuso }).replace(' ', 'T') + 'Z').getTime();
      await comEscopoDoPedido(sessao, (db) => corrigir(db, {
        organizationId, locationId: unidade.id, marcacaoId,
        autorMembershipId: eu.id, momento: new Date(local.getTime() + desvio),
        fuso, motivo,
      }));
      return voltarPara(`${raiz()}/correccoes`, { ok: 'corrigido' });
    }

    return NextResponse.json({ erro: 'accao_desconhecida' }, { status: 400 });
  } catch (e) {
    const motivo = e instanceof Error && 'motivo' in e ? String(e.motivo) : 'erro';
    return voltarPara(raiz(), { erro: motivo });
  }
}
