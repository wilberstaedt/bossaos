import { NextResponse } from 'next/server';
import { registarPedidoDeDemo } from '@bossaos/db';
import { obterBase, obterLogger } from '../../../../src/servidor.ts';

/**
 * MKT-007 · recebe o pedido de demo.
 *
 * ── O mesmo desenho da rota do lead, e pelo mesmo motivo ──────────────────
 *
 * Há **um** caminho para `/demo/thanks`, e ele passa por a porta da base ter
 * devolvido. Tudo o resto — validação recusada, erro a subir — vai para
 * `/demo?erro=`, onde o ecrã diz que **nada foi guardado**.
 *
 * O `catch` regista o erro com detalhe e redirecciona para o erro. O que ele não
 * faz, e é a única linha que interessa nesta rota, é redireccionar para o
 * obrigado.
 */

const IDIOMAS = ['es-ES', 'pt-BR', 'en'] as const;

export async function POST(pedido: Request): Promise<Response> {
  const formulario = await pedido.formData();
  const texto = (campo: string) => {
    const v = formulario.get(campo);
    return typeof v === 'string' ? v : '';
  };

  /**
   * Uma caixa de verificação NÃO MARCADA não é enviada pelo navegador.
   *
   * Chega **ausente**, e não `false` — que é a razão pela qual isto lê presença
   * e não compara com uma cadeia. `texto('x') === 'false'` daria sempre `false`
   * para o valor ausente e `false` para o marcado, ou seja o mesmo resultado nos
   * dois casos: um consentimento que nunca se registava.
   *
   * E a ausência é a resposta segura. Quem não marca, não consentiu.
   */
  const marcada = (campo: string) => formulario.get(campo) !== null;

  const pedidoIdioma = texto('idioma');
  const idioma = (IDIOMAS as readonly string[]).includes(pedidoIdioma) ? pedidoIdioma : 'es-ES';

  const destino = (caminho: string, procura = '') => {
    const url = new URL(pedido.url);
    url.pathname = `/${idioma}${caminho}`;
    url.search = procura;
    // 303: depois de um POST o navegador segue com GET, e um recarregar não
    // reenvia o formulário.
    return NextResponse.redirect(url, { status: 303 });
  };

  try {
    const r = await registarPedidoDeDemo(obterBase(), {
      nome: texto('nome'),
      email: texto('email'),
      restaurante: texto('restaurante'),
      telefone: texto('telefone') || null,
      mensagem: texto('mensagem') || null,
      idioma,
      consentimentoMarketing: marcada('consentimentoMarketing'),
    });
    if (!r.ok) return destino('/demo', 'erro=campos');
    return destino('/demo/thanks', r.duplicado ? 'repetido=1' : '');
  } catch (erro) {
    obterLogger().error('pedido de demo não guardado', {
      erro: erro instanceof Error ? erro.message : 'desconhecido',
    });
    return destino('/demo', 'erro=gravacao');
  }
}
