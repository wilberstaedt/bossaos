import { notFound } from 'next/navigation';
import { estadoParaOEcra } from '@bossaos/db';
import { obterBase } from '../servidor.ts';

/**
 * O que a casca do kiosk precisa, e precisa igual em todas as telas.
 *
 * ── Uma chamada, e nenhum escopo aberto aqui ──────────────────────────────
 *
 * A primeira versão deste ficheiro abria `comEscopo` com o inquilino que a
 * porta lhe tinha dado. Funcionava, e a `rotas-com-porta.test.ts` reprovou-a —
 * com razão: numa superfície sem sessão, a camada web tem de passar por portas
 * estreitas **e por mais nada**. Se ela própria abre escopo, o inquilino passa
 * a ser uma escolha desta camada, e quem ler o ficheiro não sabe de onde veio.
 *
 * ── Ausência, e nunca «proibido» ──────────────────────────────────────────
 *
 * Um aparelho que não existe, um por parear e um revogado dão os TRÊS a mesma
 * resposta: 404. Dizer «existe mas não podes» a quem experimenta identificadores
 * é um oráculo de existência — regra do E04, e vale igual aqui.
 */
export async function carregarKiosk(deviceId: string) {
  const estado = await estadoParaOEcra(obterBase(), deviceId);
  if (!estado) notFound();
  return estado;
}
