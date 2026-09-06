import { NextResponse } from 'next/server';
import { cartaPublica, comOEscopoDaChave, listarUnidades } from '@bossaos/db';
import { comChave, registarChamada } from '../../../../src/api-publica.ts';
import { obterBase } from '../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * `GET /api/v1/catalogo` — a carta, para quem integra.
 *
 * ── O âmbito é declarado AQUI, e é o ponto ────────────────────────────────
 *
 * `'CATALOGO_LER'` não vem de um encaminhador nem de uma configuração: está
 * escrito nesta linha, nesta rota. Uma rota nova que se esqueça de o declarar
 * não compila — o `comChave` exige o argumento.
 *
 * É a diferença entre verificar por OPERAÇÃO e verificar à entrada. Um portão
 * único no início é um portão que a próxima rota esquece, e a próxima rota é
 * sempre a que ninguém reviu.
 */
export async function GET(pedido: Request) {
  const autorizacao = await comChave(pedido, 'CATALOGO_LER');
  if (!autorizacao.ok) return autorizacao.resposta;
  const { autorizado } = autorizacao;

  const prisma = obterBase();
  const unidades = await comOEscopoDaChave(prisma, autorizado, (db) => listarUnidades(db));

  const unidade = unidades[0] as { publicSlug?: string | null } | undefined;
  const slug = unidade?.publicSlug ?? null;
  const carta = slug ? await cartaPublica(prisma, slug, 'CARTA', 'es-ES') : null;

  await registarChamada(autorizado, 'api.catalogo.ler', carta ? 'ok' : 'sem_carta', {
    unidades: unidades.length,
  });

  if (!carta) {
    // Ausência declarada: a organização existe e não tem carta publicada. Não é
    // erro, e um 404 aqui mandava quem integra procurar um problema de acesso.
    return NextResponse.json({ carta: null, motivo: 'sem_carta_publicada' }, { status: 200 });
  }
  return NextResponse.json({ carta: carta.carta }, { status: 200 });
}
