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

  /**
   * O destino é RELATIVO, e essa é a linha que faz o resto funcionar.
   *
   * ── O que a versão absoluta partia ────────────────────────────────────
   *
   * Isto fazia `new URL(pedido.url)` e mandava o endereço inteiro. Medido a
   * 07/09 no caminho comercial: o pedido entra em `http://127.0.0.1:3018` e o
   * `Location` sai `http://localhost:3018` — **o anfitrião muda no meio do
   * 303**, porque o `pedido.url` do Next não é o que o navegador escreveu.
   *
   * Para o navegador, `127.0.0.1` e `localhost` são sítios **diferentes**. O
   * `Set-Cookie` da recusa fica no anfitrião que respondeu, o GET seguinte vai
   * para o outro, e **o cookie nunca é enviado**: quem escreveu mal o email
   * perdia os cinco campos, e não por causa do cookie — por causa do endereço.
   *
   * Um `Location` relativo não pode mudar de sítio: o navegador resolve-o
   * contra o pedido que fez. Fecha a perda de cookie e fecha, com ela, um
   * risco maior que estava por acontecer — um `pedido.url` que reporte
   * `localhost` em produção mandava o cliente para a máquina dele.
   *
   * 303: depois de um POST o navegador segue com GET, e um recarregar não
   * reenvia o formulário.
   */
  const destino = (caminho: string, procura = '') => {
    const alvo = `/${idioma}${caminho}${procura ? `?${procura}` : ''}`;
    return new NextResponse(null, { status: 303, headers: { Location: alvo } });
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
    if (!r.ok) {
      /**
       * A recusa devolve o que a pessoa escreveu.
       *
       * ── RV100-021: o funil inteiro acaba aqui ─────────────────────────
       *
       * Uma recusa mandava `erro=campos` e mais nada. O nome, o restaurante, o
       * correio, o telefone e a mensagem livre perdiam-se todos — e a mensagem
       * livre é a que custa mais a reescrever, porque é a única que a pessoa
       * teve de PENSAR. Numa página que é a única porta pública, mandar
       * recomeçar do zero por causa de um ponto num endereço é onde se perde o
       * pedido.
       *
       * ── Porque é um COOKIE e não a barra de endereço ──────────────────
       *
       * A saída óbvia era devolver os valores em `?nome=…&email=…`. São dados
       * pessoais: iam para o histórico do navegador, para o `Referer` de
       * qualquer ligação seguinte e para os registos de qualquer intermediário
       * que veja o endereço. Numa página que acabou de prometer o contrário,
       * seria a pior das trocas.
       *
       * O cookie é `httpOnly` — nem o JavaScript da própria página o lê —,
       * `SameSite=Lax` para sobreviver ao 303 e não sair do sítio, e dura
       * **dois minutos**. Não é recolha nova: é o eco do que a pessoa acabou
       * de escrever, a voltar para o ecrã de onde saiu.
       *
       * E não se apaga na leitura porque um componente de servidor não pode
       * escrever cabeçalhos — expira sozinho, e é por isso que dura pouco.
       */
      const resposta = destino('/demo', 'erro=campos');
      resposta.cookies.set('bo_demo_repor', JSON.stringify({
        nome: texto('nome'), email: texto('email'), restaurante: texto('restaurante'),
        telefone: texto('telefone'), mensagem: texto('mensagem'),
      }), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 120 });
      return resposta;
    }
    return destino('/demo/thanks', r.duplicado ? 'repetido=1' : '');
  } catch (erro) {
    obterLogger().error('pedido de demo não guardado', {
      erro: erro instanceof Error ? erro.message : 'desconhecido',
    });
    return destino('/demo', 'erro=gravacao');
  }
}
