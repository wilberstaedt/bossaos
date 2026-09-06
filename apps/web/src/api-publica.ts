import { NextResponse } from 'next/server';
import { RecusaDaIntegracao, autorizarChave, registarChamadaPublica, type Autorizado } from '@bossaos/db';
import type { Escopo } from '@bossaos/domain';
import { obterBase } from './servidor.ts';

/**
 * A entrada da API pública — e o que ela deliberadamente NÃO é.
 *
 * ── Isto não é um portão à entrada ────────────────────────────────────────
 *
 * Parece um, e é a diferença que decide a fronteira 2: **o âmbito é um
 * argumento obrigatório**. Não há como chamar `comChave(pedido)` e ficar
 * autorizado para tudo; cada rota diz para que precisa, e o compilador obriga a
 * rota nova a escolher.
 *
 * Um portão único no início do encaminhador é um portão que a próxima rota
 * esquece — e a rota nova é sempre a que ninguém reviu.
 *
 * ── E esta camada não abre escopo ─────────────────────────────────────────
 *
 * Passa pela porta `autorizarChave`, que resolve o inquilino e abre o escopo lá
 * dentro. Aqui não há `comEscopo` — a `rotas-com-porta.test.ts` reprovou a
 * primeira versão, e tinha razão.
 */
export type { Autorizado };

function chaveDoPedido(pedido: Request): string | null {
  const cabecalho = pedido.headers.get('authorization');
  if (!cabecalho) return null;
  return /^Bearer\s+(\S+)$/i.exec(cabecalho)?.[1] ?? null;
}

/**
 * Autoriza um pedido **para uma operação**.
 *
 * A recusa não distingue «chave desconhecida» de «chave revogada» no corpo: as
 * duas dão 401 e a mesma palavra, porque a diferença só interessa a quem esteja
 * a sondar. O âmbito errado dá 403 — aí a chave é válida e quem chama tem
 * direito a saber que lhe falta permissão, não acesso.
 */
export async function comChave(
  pedido: Request, precisa: Escopo,
): Promise<{ ok: true; autorizado: Autorizado } | { ok: false; resposta: Response }> {
  const valor = chaveDoPedido(pedido);
  if (!valor) {
    return { ok: false, resposta: NextResponse.json({ erro: 'nao_autorizado' }, { status: 401 }) };
  }

  try {
    return { ok: true, autorizado: await autorizarChave(obterBase(), valor, precisa) };
  } catch (erro) {
    if (erro instanceof RecusaDaIntegracao) {
      const estado = erro.motivo === 'FORA_DE_AMBITO' ? 403 : 401;
      return {
        ok: false,
        resposta: NextResponse.json({ erro: 'nao_autorizado' }, { status: estado }),
      };
    }
    throw erro;
  }
}

export function registarChamada(
  autorizado: Autorizado, accao: string, resultado: string, detalhe: unknown,
) {
  return registarChamadaPublica(obterBase(), autorizado, accao, resultado, detalhe);
}
