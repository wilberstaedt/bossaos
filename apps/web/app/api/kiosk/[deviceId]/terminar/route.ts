import { NextResponse } from 'next/server';
import {
  RecusaDoKiosk, comEscopo, kioskDoAparelho, sessaoViva, terminarSessao,
  type MotivoDeSaida,
} from '@bossaos/db';
import { obterBase } from '../../../../../src/servidor.ts';

/**
 * As TRÊS saídas do kiosk, e uma porta só.
 *
 * ── Porque é que os três motivos entram pelo mesmo sítio ──────────────────
 *
 * Concluído (o cliente carregou em recomeçar), abandonado (a inactividade) e
 * reiniciado (alguém da casa). São três acontecimentos diferentes e **um único
 * efeito**, e por isso uma rota só. Três rotas seria como uma delas acabava a
 * limpar menos — e a que limpa menos é a que deixa o carrinho do cliente
 * anterior no ecrã do seguinte.
 *
 * O motivo distingue-os no registo; não pode distingui-los no efeito.
 */
const MOTIVOS: readonly MotivoDeSaida[] = ['CONCLUIDA', 'ABANDONADA', 'REINICIADA'];

export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await ctx.params;
  const prisma = obterBase();

  const kiosk = await kioskDoAparelho(prisma, deviceId);
  // Ausência e nunca «proibido»: um aparelho desconhecido, um por parear e um
  // revogado dão os três a mesma resposta.
  if (!kiosk) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  const dados = await pedido.formData().catch(() => null);
  const motivoCru = dados?.get('motivo');
  const idioma = typeof dados?.get('idioma') === 'string' ? String(dados.get('idioma')) : 'es-ES';
  const motivo = MOTIVOS.find((m) => m === motivoCru);
  if (!motivo) return NextResponse.json({ erro: 'motivo_invalido' }, { status: 400 });

  const escopo = { organizationId: kiosk.organizationId };
  try {
    await comEscopo(prisma, escopo, async (db) => {
      const viva = await sessaoViva(db, deviceId);
      // Não haver sessão viva não é erro: é o estado normal de um kiosk parado.
      // Devolver 404 aqui fazia o botão de recomeçar parecer avariado quando a
      // inactividade já tinha fechado a sessão por baixo.
      if (!viva) return;
      await terminarSessao(db, viva.id, motivo, `saida:${motivo}`);
    });
  } catch (erro) {
    // O gatilho da base recusa fechar com cobrança indeterminada. A pessoa vai
    // para o ecrã pausado e alguém da casa resolve — o que não pode acontecer é
    // o botão «funcionar» e a cobrança desaparecer.
    if (erro instanceof RecusaDoKiosk && erro.motivo === 'COBRANCA_POR_RESOLVER') {
      return NextResponse.redirect(
        new URL(`/${idioma}/kiosk/${deviceId}/pausado`, pedido.url), 303);
    }
    throw erro;
  }

  return NextResponse.redirect(new URL(`/${idioma}/kiosk/${deviceId}`, pedido.url), 303);
}
