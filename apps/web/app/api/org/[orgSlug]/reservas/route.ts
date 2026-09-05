import { NextResponse } from 'next/server';
import {
  abrirWalkIn, cancelar, confirmarReserva, guardarDefinicoes, listarUnidades,
  marcarChegada, reagendar, registarNaoCompareceu, sentarReserva,
  guardarConector, guardarTemplate, horaDaCasa, acontecimento, enfileirar,
  chamarDaEspera,
} from '@bossaos/db';
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

  // ── E19 · a operação do host ──────────────────────────────────────────
  //
  // Tudo passa pelo MESMO motor da reserva pública: a antecedência, a capacidade
  // da zona, a exclusão da mesa. Um caminho «do host» que saltasse as
  // verificações seria a forma mais rápida de duas famílias à porta — quem
  // atende o telefone não vê a sala.
  const paraAgenda = () => `/${idioma}/app/${orgSlug}/${locationSlug}/reservations`;
  const paraReserva = (id: string) => `${paraAgenda()}/${id}`;

  if (accao === 'nova_reserva') {
    const dia = texto(dados, 'dia') ?? '';
    const hora = texto(dados, 'hora') ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^\d{2}:\d{2}$/.test(hora)) {
      return voltarPara(`${paraAgenda()}/nova`, { erro: 'quando' });
    }
    // ── O motor abre a SUA transacção, e por isso recebe o cliente cru ────
    //
    // `confirmarReserva` corre em `serializable` com lock por unidade: precisa de
    // abrir a transacção ele próprio. Passar-lhe um cliente que já está dentro de
    // uma faria a serialização acontecer na transacção errada — e a contagem da
    // zona deixava de estar protegida sem ninguém dar por isso.
    // A hora que o host escreveu é LOCAL, e resolve-se pelo fuso da unidade
    // antes de existir instante. Sem fuso não se adivinha.
    const entendida = await comEscopoDoPedido(sessao, (db) =>
      horaDaCasa(db, unidade.id, dia, hora));
    if (!entendida) return voltarPara(`${paraAgenda()}/nova`, { erro: 'SEM_FUSO' });

    const r = await confirmarReserva(
      (await import('../../../../../src/servidor.ts')).obterBase(),
      { organizationId },
      {
        locationId: unidade.id,
        pessoas: inteiro(dados, 'pessoas', 2),
        inicio: entendida.instante,
        nome: texto(dados, 'nome') ?? '',
        contacto: texto(dados, 'contacto') ?? '',
        notas: texto(dados, 'notas') ?? null,
        origem: 'HOST',
        // A chave sai do que o host escreveu: dois toques no botão dão UMA
        // reserva, exactamente como na porta da rua.
        chaveIdempotente: `host|${unidade.id}|${dia}|${hora}|${texto(dados, 'contacto') ?? ''}`,
        criadaPor: sessao.actor.email,
      });
    if (!r.ok) return voltarPara(`${paraAgenda()}/nova`, { erro: r.motivo });
    // O ACONTECIMENTO: a reserva foi confirmada. A mesma porta que a rua usa.
    if (!r.repetida) {
      await comEscopoDoPedido(sessao, (db) => enfileirar(
        db, organizationId, unidade.id, r.reservaId, acontecimento(),
        'confirmacao', idioma));
    }
    return voltarPara(paraReserva(r.reservaId), {
      guardado: '1',
      ...(entendida.estado !== 'NORMAL' ? { hora: entendida.estado } : {}),
    });
  }

  if (accao === 'chegou') {
    await comEscopoDoPedido(sessao, (db) => marcarChegada(db, texto(dados, 'reservaId') ?? ''));
    return voltarPara(paraReserva(texto(dados, 'reservaId') ?? ''), { guardado: '1' });
  }

  if (accao === 'sentar') {
    const r = await comEscopoDoPedido(sessao, (db) => sentarReserva(
      db, organizationId, unidade.id,
      texto(dados, 'reservaId') ?? '', texto(dados, 'tableId') ?? '', sessao.actor.email));
    const destino = `${paraReserva(texto(dados, 'reservaId') ?? '')}/mesa`;
    if (!r.ok) return voltarPara(destino, { erro: r.motivo });
    return voltarPara(paraReserva(texto(dados, 'reservaId') ?? ''), { guardado: '1' });
  }

  if (accao === 'nao_compareceu') {
    await comEscopoDoPedido(sessao, (db) =>
      registarNaoCompareceu(db, texto(dados, 'reservaId') ?? ''));
    return voltarPara(paraAgenda(), { guardado: '1' });
  }

  if (accao === 'cancelar_reserva') {
    const reservaId = texto(dados, 'reservaId') ?? '';
    await comEscopoDoPedido(sessao, async (db) => {
      await cancelar(db, reservaId, sessao.actor.email);
      // O ACONTECIMENTO: a casa cancelou. Avisar é o mínimo que se deve a quem
      // ia jantar fora — e a mensagem nasce aqui, no momento do facto.
      await enfileirar(db, organizationId, unidade.id, reservaId, acontecimento(),
        'cancelamento', idioma);
    });
    return voltarPara(paraAgenda(), { guardado: '1' });
  }

  if (accao === 'chamar_espera') {
    // ── O ACONTECIMENTO: a mesa ficou pronta ────────────────────────────
    //
    // É o caso que o contrato usa para explicar a chave: «a sua mesa está
    // pronta» pode ter de sair DUAS VEZES na mesma noite — a pessoa não veio à
    // primeira, e o host volta a chamar meia hora depois.
    //
    // Cada chamada é um acontecimento novo, com identidade nova, logo entrega.
    // Com a chave antiga a segunda desaparecia em silêncio e a mesa ficava vazia
    // com gente à porta.
    const esperaId = texto(dados, 'esperaId') ?? '';
    const tableId = texto(dados, 'tableId') ?? '';
    await comEscopoDoPedido(sessao, async (db) => {
      const agora = new Date();
      await chamarDaEspera(db, unidade.id, esperaId, tableId,
        agora, new Date(agora.getTime() + 90 * 60_000));
      // `chamarDaEspera` avisa: o acontecimento vive onde o facto acontece.
    });
    return voltarPara(`${paraAgenda()}/espera`, { guardado: '1' });
  }

  if (accao === 'mover') {
    const dia = texto(dados, 'dia') ?? '';
    const hora = texto(dados, 'hora') ?? '';
    const reservaId = texto(dados, 'reservaId') ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^\d{2}:\d{2}$/.test(hora)) {
      return voltarPara(`${paraReserva(reservaId)}/mover`, { erro: 'quando' });
    }
    const nova = await comEscopoDoPedido(sessao, (db) =>
      horaDaCasa(db, unidade.id, dia, hora));
    if (!nova) return voltarPara(`${paraReserva(reservaId)}/mover`, { erro: 'SEM_FUSO' });
    const r = await reagendar(
      (await import('../../../../../src/servidor.ts')).obterBase(), { organizationId },
      unidade.id, reservaId, nova.instante);
    // A anterior sobrevive: o motor garante-o dentro da transacção, e o regresso
    // leva o motivo para a tela o poder dizer.
    if (!r.ok) return voltarPara(`${paraReserva(reservaId)}/mover`, { erro: r.motivo });
    return voltarPara(paraReserva(reservaId), { guardado: '1' });
  }

  if (accao === 'walk_in') {
    const r = await comEscopoDoPedido(sessao, (db) => abrirWalkIn(
      db, organizationId, unidade.id, texto(dados, 'tableId') ?? '',
      inteiro(dados, 'pessoas', 2), sessao.actor.email));
    if (!r.ok) return voltarPara(`${paraAgenda()}/walk-in`, { erro: r.motivo });
    return voltarPara(`${paraAgenda()}/mapa`, { guardado: '1' });
  }

  if (accao === 'guardar_template') {
    await comEscopoDoPedido(sessao, (db) => guardarTemplate(db, organizationId, unidade.id, {
      tipo: texto(dados, 'tipo') ?? 'confirmacao',
      idioma: texto(dados, 'idiomaDoTemplate') ?? idioma,
      assunto: texto(dados, 'assunto') ?? '',
      corpo: texto(dados, 'corpo') ?? '',
    }));
    return voltarPara(`${paraAgenda()}/mensagens`, { guardado: '1' });
  }

  if (accao === 'guardar_conector') {
    // ── Ligar sem provedor não passa, e a recusa é uma resposta ──────────
    //
    // A base tem um `CHECK` a segurá-lo. Aqui devolve-se o motivo em vez de
    // deixar rebentar: quem carregou tem de perceber o que falta, e um 500 não
    // explica nada.
    const provedor = texto(dados, 'provedor') ?? '';
    const r = await comEscopoDoPedido(sessao, (db) => guardarConector(
      db, organizationId, unidade.id, {
        provedor: provedor === '' ? null : provedor,
        activo: dados.get('activo') === '1',
      }));
    const destino = `/${idioma}/app/${orgSlug}/${locationSlug}/integrations/mensageria`;
    if (!r.ok) return voltarPara(destino, { erro: r.motivo });
    return voltarPara(destino, { guardado: '1' });
  }

  return NextResponse.json({ erro: 'accao_desconhecida' }, { status: 400 });
}
