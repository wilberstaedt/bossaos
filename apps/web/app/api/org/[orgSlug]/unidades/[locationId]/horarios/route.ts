import { NextResponse } from 'next/server';
import { apagarExcepcao, guardarExcepcao, guardarSemana, registar } from '@bossaos/db';
import {
  corpoDaResposta, deRelogio, estadoHttp, exigirAccao,
  type DiaDaSemana, type EstadoDoDia, type Intervalo,
} from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DIAS: DiaDaSemana[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * ORG-006 · gravar os horários.
 *
 * ── A leitura do formulário é onde a regra desta etapa se ganha ou se perde ─
 *
 * Cada dia chega com um estado explícito: `por_configurar`, `fechado` ou
 * `aberto` com intervalos. **Não se infere.** A tentação é ler os campos de hora
 * e, se vierem vazios, assumir fechado — e isso apaga a diferença entre "está
 * fechado à segunda" e "ninguém disse nada sobre a segunda" no exacto sítio
 * onde ela nasce.
 *
 * Um dia sem campo `estado[n]` nem sequer entra no pedido: `guardarSemana` não
 * lhe toca, e é assim que um formulário que só mostra três dias não apaga os
 * outros quatro.
 */
export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; locationId: string }> },
) {
  const { orgSlug, locationId } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const destino = `/${idioma}/app/${orgSlug}/organization/unidades/${locationId}/horarios`;

  const semana: Partial<Record<DiaDaSemana, EstadoDoDia>> = {};
  for (const d of DIAS) {
    const estado = texto(dados, `estado${d}`);
    if (!estado) continue;
    if (estado === 'por_configurar') { semana[d] = { tipo: 'por_configurar' }; continue; }
    if (estado === 'fechado') { semana[d] = { tipo: 'fechado' }; continue; }

    const intervalos: Intervalo[] = [];
    // Até dois serviços por dia, que é o que o atlas desenha (almoço e noite).
    for (const n of [1, 2]) {
      const inicio = deRelogio(texto(dados, `inicio${d}_${n}`) ?? '');
      const fim = deRelogio(texto(dados, `fim${d}_${n}`) ?? '');
      if (inicio === null || fim === null) continue;
      // 20:00→01:00 chega como 1200 e 60. É AQUI que se soma o dia, uma vez, e
      // não em vinte sítios que leem horários depois.
      intervalos.push({ inicioMin: inicio, fimMin: fim <= inicio ? fim + 1440 : fim });
    }
    semana[d] = { tipo: 'aberto', intervalos };
  }

  const excepcaoData = texto(dados, 'excepcaoData');
  const r = await comEscopoDoPedido(sessao, async (db) => {
    const gravado = await guardarSemana(db, sessao.contexto.organizationId, locationId, semana);
    if (!gravado.ok) return gravado;

    if (excepcaoData) {
      // ── Marcar e DESMARCAR, e não só marcar ──────────────────────────
      //
      // A rota só sabia gravar. Uma casa que marcasse fechado a 25 de Dezembro
      // por engano ficava com o dia fechado **para sempre** — não havia caminho
      // nenhum no produto que o desfizesse.
      //
      // Foi a `validar-desfazer.sh` que o apanhou, e a regra dela é a certa: se
      // quem cria tem chamador e quem desfaz não tem, o produto deixa fazer e
      // não deixa voltar atrás.
      if (texto(dados, 'excepcaoApagar') === '1') {
        await apagarExcepcao(db, locationId, excepcaoData);
      } else {
        await guardarExcepcao(db, sessao.contexto.organizationId, locationId, {
          data: excepcaoData,
          motivo: texto(dados, 'excepcaoMotivo') ?? '—',
          estado: { tipo: 'fechado' },
        });
      }
    }
    await registar(db, sessao.contexto.organizationId, {
      accao: 'unidade.horarios.guardados', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'location', alvoId: locationId,
      detalhe: {
        dias: Object.keys(semana), excepcao: excepcaoData ?? null,
        // O rasto diz se a excepção foi posta ou tirada: «alguém mexeu no dia
        // 25» sem dizer em que sentido não explica nada a quem o for ler.
        apagada: texto(dados, 'excepcaoApagar') === '1',
      },
    });
    return gravado;
  });

  if (!r.ok) return voltarPara(destino, { erro: r.problemas[0]?.erro ?? 'invalido' });
  return voltarPara(destino, { guardado: '1' });
}
