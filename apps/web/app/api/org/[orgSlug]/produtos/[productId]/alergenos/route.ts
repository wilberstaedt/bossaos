import { NextResponse } from 'next/server';
import { guardarAlergenios, registar, type DeclaracaoParaGravar } from '@bossaos/db';
import { ALERGENIOS_UE, PREFERENCIAS, corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-013 · gravar a ficha de alérgenos. **A rota onde o contrato tem dentes.**
 *
 * ── Três decisões, e as três são a mesma decisão ───────────────────────────
 *
 * 1. **`DESCONHECIDO` apaga.** Não grava uma linha a dizer "não sei": apaga a
 *    declaração. O estado desconhecido é a AUSÊNCIA de declaração, e representá-lo
 *    como uma linha faria dele um quarto valor guardado — e um dia alguém
 *    escreveria `WHERE estado != 'CONTEM'` e apanhava-o.
 *
 * 2. **Um campo que não veio não se toca.** Nada aqui percorre os catorze a
 *    escrever um valor por omissão. Só se grava o que a pessoa disse.
 *
 * 3. **O responsável é quem está autenticado**, não um campo do formulário. Uma
 *    declaração sem responsável não é uma declaração, e o responsável não pode
 *    vir do lado de fora.
 *
 * As preferências alimentares são gravadas noutra tabela, no mesmo pedido e sem
 * se tocarem: vegetariano é escolha, contém amendoim é segurança. Marcar
 * "vegano" **não** declara nada sobre leite.
 */
export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; productId: string }> },
) {
  const { orgSlug, productId } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'catalogo.editar');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';

  const declaracoes: DeclaracaoParaGravar[] = [];
  for (const codigo of ALERGENIOS_UE) {
    const v = dados.get(`estado_${codigo}`);
    if (typeof v !== 'string') continue;
    if (v === 'DESCONHECIDO') { declaracoes.push({ codigo, estado: null }); continue; }
    if (v === 'CONTEM' || v === 'PODE_CONTER' || v === 'NAO_CONTEM') {
      declaracoes.push({ codigo, estado: v });
    }
    // Qualquer outro valor é ignorado — e ignorar é o comportamento certo:
    // gravar um estado que não se reconhece seria inventar uma declaração.
  }

  const escolhidas = dados.getAll('preferencia')
    .filter((x): x is string => typeof x === 'string')
    .filter((x) => (PREFERENCIAS as readonly string[]).includes(x));

  const contagem = await comEscopoDoPedido(sessao, async (db) => {
    const r = await guardarAlergenios(
      db, sessao.contexto.organizationId, productId, declaracoes,
      // Quem assina é quem está autenticado. Nunca um campo do formulário.
      sessao.actor.email,
    );

    await db.productDietaryTag.deleteMany({
      where: { productId, codigo: { notIn: escolhidas.length ? escolhidas : ['—'] } },
    });
    for (const codigo of escolhidas) {
      await db.productDietaryTag.upsert({
        where: {
          organizationId_productId_codigo: {
            organizationId: sessao.contexto.organizationId, productId, codigo,
          },
        },
        create: { organizationId: sessao.contexto.organizationId, productId, codigo },
        update: {},
      });
    }

    await registar(db, sessao.contexto.organizationId, {
      accao: 'produto.alergenos.guardados',
      actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'product', alvoId: productId,
      // O rasto guarda quantas foram DECLARADAS e quantas voltaram a
      // desconhecido. "Quem tirou a declaração de frutos secos, e quando" tem
      // de ter resposta — é a pergunta que se faz depois de uma urgência.
      detalhe: { gravadas: r.gravadas, apagadas: r.apagadas, preferencias: escolhidas },
    });
    return r;
  });
  void contagem;

  return voltarPara(`/${idioma}/app/${orgSlug}/catalogo/produtos/${productId}/alergenos`, { guardado: '1' });
}
