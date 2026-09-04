import { NextResponse } from 'next/server';
import { guardarDefinicoes, listarUnidades } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';
import { SECCOES_DE_RESERVAS } from '../../../../../src/reservas/NavegacaoDeReservas.tsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A porta das reservas.
 *
 * ── O endereço de regresso é RECONSTRUÍDO, nunca aceite ───────────────────
 *
 * Mesma decisão da porta do KDS e da do Staff: o formulário manda uma **chave**
 * de secção e esta rota valida-a contra a lista fechada da navegação antes de
 * montar o caminho. Um campo com o caminho completo era uma redirecção
 * controlada pelo cliente.
 */
const ROTAS_VALIDAS = new Set<string>(SECCOES_DE_RESERVAS.map((s) => s.rota));

/** Um inteiro que veio de um formulário, ou o que lá estava. */
function inteiro(dados: FormData, campo: string, actual: number): number {
  const bruto = texto(dados, campo);
  if (bruto === undefined || bruto.trim() === '') return actual;
  const n = Number(bruto);
  // ── Recusar em silêncio é pior do que não guardar ──────────────────────
  //
  // Um `NaN` a chegar à base rebentaria com um erro de tipo, e um `0` por
  // omissão mudava a política de quem só escreveu mal um número. Fica o valor
  // que lá estava, que é a única resposta que não inventa uma decisão.
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : actual;
}

export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const locationId = texto(dados, 'locationId') ?? '';
  const locationSlug = texto(dados, 'locationSlug') ?? '';
  const accao = texto(dados, 'accao') ?? '';
  const organizationId = sessao.contexto.organizationId;

  // A unidade é resolvida DENTRO do escopo. Um identificador vindo do formulário
  // e usado sem esta leitura deixava mexer na unidade de outra organização.
  const unidades = await comEscopoDoPedido(sessao, (db) => listarUnidades(db));
  const unidade = unidades.find((u: { id: string }) => u.id === locationId);
  if (!unidade) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  const paraSeccao = (rota: string) => {
    const validada = ROTAS_VALIDAS.has(rota) ? rota : '/regras';
    return `/${idioma}/app/${orgSlug}/${locationSlug}/reservations${validada}`;
  };
  const paraPreferencias = () => `/${idioma}/app/${orgSlug}/${locationSlug}/settings/reservas`;

  if (accao === 'guardar_preferencias' || accao === 'guardar_regras' || accao === 'guardar_politicas') {
    const { lerDefinicoes } = await import('@bossaos/db');
    const actual = await comEscopoDoPedido(sessao, (db) => lerDefinicoes(db, unidade.id));

    // ── Cada ecrã guarda o SEU grupo, e mais nada ───────────────────────
    //
    // As três telas partilham uma linha. Se cada uma gravasse o objecto todo, a
    // que não mostra a antecedência gravava-a com o valor por omissão — e quem
    // mexesse nas políticas apagava as regras sem tocar nelas. É o defeito
    // clássico de partilhar uma tabela entre formulários.
    const campos = accao === 'guardar_preferencias' ? {
      activo: dados.get('activo') === '1',
      duracaoPadraoMin: inteiro(dados, 'duracaoPadraoMin', actual.duracaoPadraoMin),
      bufferMin: inteiro(dados, 'bufferMin', actual.bufferMin),
    } : accao === 'guardar_regras' ? {
      antecedenciaMinMin: inteiro(dados, 'antecedenciaMinMin', actual.antecedenciaMinMin),
      antecedenciaMaxDias: inteiro(dados, 'antecedenciaMaxDias', actual.antecedenciaMaxDias),
      minPessoas: inteiro(dados, 'minPessoas', actual.minPessoas),
      maxPessoas: inteiro(dados, 'maxPessoas', actual.maxPessoas),
      permiteCombinacoes: dados.get('permiteCombinacoes') === '1',
    } : {
      cancelamentoAteMin: inteiro(dados, 'cancelamentoAteMin', actual.cancelamentoAteMin),
      retencaoMin: inteiro(dados, 'retencaoMin', actual.retencaoMin),
      toleranciaAtrasoMin: inteiro(dados, 'toleranciaAtrasoMin', actual.toleranciaAtrasoMin),
    };

    await comEscopoDoPedido(sessao, (db) =>
      guardarDefinicoes(db, organizationId, unidade.id, campos));
    const destino = accao === 'guardar_preferencias' ? paraPreferencias()
      : accao === 'guardar_regras' ? paraSeccao('/regras') : paraSeccao('/politicas');
    return voltarPara(destino, { guardado: '1' });
  }

  if (accao === 'guardar_turno') {
    await comEscopoDoPedido(sessao, (db) => db.serviceWindow.create({
      data: {
        organizationId, locationId: unidade.id,
        nome: texto(dados, 'nome') ?? '',
        diaDaSemana: inteiro(dados, 'diaDaSemana', 6),
        horaInicio: texto(dados, 'horaInicio') ?? '20:00',
        horaFim: texto(dados, 'horaFim') ?? '23:00',
      },
    }));
    return voltarPara(paraSeccao('/turnos'), { guardado: '1' });
  }

  if (accao === 'apagar_turno') {
    await comEscopoDoPedido(sessao, (db) => db.serviceWindow.deleteMany({
      where: { id: texto(dados, 'turnoId') ?? '', locationId: unidade.id } }));
    return voltarPara(paraSeccao('/turnos'), { guardado: '1' });
  }

  if (accao === 'guardar_capacidade') {
    const areaId = texto(dados, 'areaId');
    const windowId = texto(dados, 'windowId');
    await comEscopoDoPedido(sessao, (db) => db.capacityRule.create({
      data: {
        organizationId, locationId: unidade.id,
        maxComensais: inteiro(dados, 'maxComensais', 40),
        ...(areaId ? { areaId } : {}),
        ...(windowId ? { windowId } : {}),
      },
    }));
    return voltarPara(paraSeccao('/capacidade'), { guardado: '1' });
  }

  if (accao === 'apagar_capacidade') {
    await comEscopoDoPedido(sessao, (db) => db.capacityRule.deleteMany({
      where: { id: texto(dados, 'regraId') ?? '', locationId: unidade.id } }));
    return voltarPara(paraSeccao('/capacidade'), { guardado: '1' });
  }

  if (accao === 'guardar_bloqueio') {
    // ── O alvo vem como `zona:<id>` ou `mesa:<id>`, e é UM ────────────────
    //
    // A base tem um `CHECK` a impedir dois alvos na mesma linha; a forma de o
    // respeitar sem depender dele é o formulário só saber oferecer um.
    const alvo = texto(dados, 'alvo') ?? '';
    const [tipo, id] = alvo.split(':');
    const inicio = texto(dados, 'inicio');
    const fim = texto(dados, 'fim');
    if (!inicio || !fim) return voltarPara(paraSeccao('/bloqueios'), { erro: 'intervalo' });
    await comEscopoDoPedido(sessao, (db) => db.reservationBlock.create({
      data: {
        organizationId, locationId: unidade.id,
        inicio: new Date(inicio), fim: new Date(fim),
        motivo: texto(dados, 'motivo') ?? '',
        ...(tipo === 'zona' && id ? { areaId: id } : {}),
        ...(tipo === 'mesa' && id ? { tableId: id } : {}),
      },
    }));
    return voltarPara(paraSeccao('/bloqueios'), { guardado: '1' });
  }

  if (accao === 'apagar_bloqueio') {
    await comEscopoDoPedido(sessao, (db) => db.reservationBlock.deleteMany({
      where: { id: texto(dados, 'bloqueioId') ?? '', locationId: unidade.id } }));
    return voltarPara(paraSeccao('/bloqueios'), { guardado: '1' });
  }

  return NextResponse.json({ erro: 'accao_desconhecida' }, { status: 400 });
}
