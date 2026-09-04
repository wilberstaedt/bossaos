import { NextResponse } from 'next/server';
import { guardarLeadPublico, sitePublico } from '@bossaos/db';
import { obterBase, obterLogger } from '../../../../src/servidor.ts';

/**
 * A porta que recebe o formulário de contacto do site público.
 *
 * ── Porque é que esta rota NÃO vive debaixo de `/r/` ──────────────────────
 *
 * O E09 mede que nenhuma rota sob `app/r/` exporta um verbo de escrita, e mede-o
 * em onze formas diferentes de o escrever. Não é burocracia: `/r/` é o endereço
 * que vai **impresso** num QR, e o que está impresso lê-se — não se escreve.
 * O formulário aponta para aqui, e a regra do E09 continua inteira.
 *
 * ── O aceite 2, linha a linha ──────────────────────────────────────────────
 *
 * > *«Lead válido guarda-se uma vez; falha real não mostra sucesso.»*
 *
 * **A organização não vem do corpo do pedido.** Vem de resolver o endereço
 * público, que é a mesma porta que serve a página. Se viesse do formulário,
 * qualquer pessoa escrevia leads na conta de qualquer restaurante.
 *
 * **Guardar uma vez** é a restrição única da base, e não um `if (jaExiste)`:
 * duas submissões simultâneas leriam as duas "não existe".
 *
 * **E a falha não mostra sucesso.** Só há um caminho para `?enviado=1`, e ele
 * passa por `guardarLeadPublico` ter devolvido. Qualquer erro que suba
 * atravessa este `catch`, que redirecciona para `?erro=gravacao` — o ecrã diz
 * que **nada foi guardado**. O que este `catch` NÃO faz é redireccionar para
 * sucesso, e é essa a linha que a prova ataca a valer partindo a gravação.
 */

const IDIOMAS = ['es-ES', 'pt-BR', 'en'] as const;

export async function POST(pedido: Request): Promise<Response> {
  const formulario = await pedido.formData();
  const texto = (campo: string) => {
    const v = formulario.get(campo);
    return typeof v === 'string' ? v : '';
  };

  const slug = texto('slug');
  const idiomaPedido = texto('idioma');
  const idioma = (IDIOMAS as readonly string[]).includes(idiomaPedido) ? idiomaPedido : 'es-ES';

  const destino = (procura: string) => {
    const url = new URL(pedido.url);
    url.pathname = `/r/${slug}/${idioma}/contact`;
    url.search = procura;
    return NextResponse.redirect(url, { status: 303 });
  };

  const prisma = obterBase();

  // A unidade sai do ENDEREÇO PÚBLICO, pela mesma porta que serve a página. Um
  // site que não está publicado não recebe leads: não há para onde os pôr, e
  // fingir que recebeu era outra vez sucesso sobre nada.
  const servida = await sitePublico(prisma, slug);
  if (!servida) return destino('erro=gravacao');

  try {
    const resultado = await guardarLeadPublico(prisma, {
      organizationId: servida.organizationId,
      locationId: servida.locationId,
      nome: texto('nome'),
      email: texto('email'),
      telefone: texto('telefone') || null,
      mensagem: texto('mensagem'),
      origem: 'site',
    });

    if (!resultado.ok) return destino('erro=campos');
    return destino(resultado.duplicado ? 'enviado=repetido' : 'enviado=1');
  } catch (erro) {
    // O erro é registado com detalhe do lado de dentro e resumido do lado de
    // fora: quem submeteu precisa de saber que não ficou guardado, não de saber
    // qual coluna rebentou.
    obterLogger().error('lead não guardado', {
      slug, erro: erro instanceof Error ? erro.message : 'desconhecido',
    });
    return destino('erro=gravacao');
  }
}

/**
 * Um `GET` aqui não faz nada e não deve fingir que faz.
 *
 * Sem isto, visitar o endereço à mão dava 405 do Next — que é correcto, mas o
 * 405 não diz a ninguém para onde ir. Isto devolve a página de contacto.
 */
export async function GET(pedido: Request): Promise<Response> {
  const url = new URL(pedido.url);
  const slug = url.searchParams.get('slug') ?? '';
  if (slug === '') return new NextResponse(null, { status: 404 });
  url.pathname = `/r/${slug}/es-ES/contact`;
  url.search = '';
  return NextResponse.redirect(url, { status: 303 });
}
