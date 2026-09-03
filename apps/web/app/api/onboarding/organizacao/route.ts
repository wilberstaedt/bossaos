import { NextResponse } from 'next/server';
import { comIdentidade, criarOrganizacaoComDono, obterPrisma } from '@bossaos/db';
import { actorDoPedido } from '../../../../src/sessao.ts';
import { obterEnv } from '../../../../src/servidor.ts';
import { texto, voltarPara } from '../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ONB-001 · criar a organização.
 *
 * Não passa por `resolverPedido`: **ainda não há organização a resolver**. Corre
 * no caminho de identidade, que é o único que existe neste momento — e a porta
 * na base recusa se não houver sequer identidade.
 *
 * A chave de idempotência vem do formulário, num campo escondido gerado quando a
 * página é servida. É por isso que carregar duas vezes em "Criar organização"
 * com a mesma página aberta não cria duas: é a mesma chave.
 */
export async function POST(pedido: Request) {
  const actor = await actorDoPedido();
  if (!actor) return NextResponse.json({ erro: 'sem_sessao' }, { status: 401 });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const nome = texto(dados, 'nome');
  const slug = texto(dados, 'slug');
  const chave = texto(dados, 'chave');
  if (!nome || !slug || !chave) {
    return voltarPara(`/${idioma}/onboarding/organizacao`, { erro: 'campos' });
  }

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  try {
    const r = await comIdentidade(prisma, actor.id, (db) =>
      criarOrganizacaoComDono(db, { chave, slug, nome }));
    return voltarPara(`/${idioma}/onboarding/marca`, { org: slug, criada: String(r.criada) });
  } catch (e) {
    // O slug já existe, ou a base recusou. Não se diz qual das duas: um erro que
    // distingue "esse nome já é de alguém" de "erro interno" é um oráculo sobre
    // quem já é cliente.
    const detalhe = e instanceof Error && /duplicate|unique/i.test(e.message) ? 'slug' : 'erro';
    return voltarPara(`/${idioma}/onboarding/organizacao`, { erro: detalhe });
  }
}
