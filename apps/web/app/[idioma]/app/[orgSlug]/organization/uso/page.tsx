import { redirect } from 'next/navigation';
import { Cartao } from '@bossaos/ui';
import { formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { contarPessoas, contarProdutos, contarUnidades, estadoComercial } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * ORG-013 · "Uso y límites" (atlas p. 50)
 *
 * ── Duas divergências do atlas, e as duas são a mesma decisão ───────────────
 *
 * O atlas desenha quatro contadores — estabelecimentos, personas, productos,
 * almacenamiento — e um gráfico de barras dos últimos sete dias. Escreve, por
 * baixo do gráfico, **"Datos ilustrativos"**, e é essa palavra que decide isto.
 *
 * 1. **Produtos e armazenamento não trazem número.** O catálogo de produtos e os
 *    ficheiros são de etapas que ainda não chegaram: não há o que contar. Pôr
 *    "86 publicados" porque o atlas o desenha seria inventar dados de um
 *    restaurante a sério num ecrã que ele usa para decidir se muda de plano.
 *    Dizem "aún no medido" e dizem porquê.
 * 2. **Não há gráfico.** Uma série de sete dias exigiria sete dias de história
 *    que ninguém guardou ainda. Um gráfico bonito com números fabricados é a
 *    pior das duas coisas: parece medido.
 *
 * O que tem número é contado com `count()` dentro do escopo do inquilino —
 * unidades e pessoas. E as quotas saem das concessões: **onde não há concessão
 * não há número**, e a interface diz "sem limite contratado" em vez de um
 * infinito. É o CT-02 outra vez: por configurar não é ilimitado.
 */
export default async function UsoELimites({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const m = mensagensDe(idioma);

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => ({
    unidades: await contarUnidades(db),
    pessoas: await contarPessoas(db),
    produtos: await contarProdutos(db),
    estado: await estadoComercial(db, sessao.contexto.organizationId),
  }));

  const quotaDe = (capacidade: string): number | null => {
    const comNumero = dados.estado.concessoes.filter((c) => c.capacidade === capacidade && c.quota !== null);
    return comNumero.length === 0 ? null : Math.max(...comNumero.map((c) => c.quota as number));
  };

  const medidos = [
    { rotulo: m.uso.unidades, valor: dados.unidades, quota: quotaDe('unidades'), sufixo: m.uso.contratados },
    { rotulo: m.uso.pessoas, valor: dados.pessoas, quota: quotaDe('utilizadores'), sufixo: m.uso.activas },
    // Os produtos saíram de "ainda não medido" quando o E07 trouxe o catálogo.
    // Um cartão que continuasse a dizer que isto chega numa etapa posterior
    // estaria a mentir sobre uma coisa que já está no ecrã ao lado.
    { rotulo: m.uso.produtos, valor: dados.produtos, quota: quotaDe('produtos'), sufixo: m.uso.contratados },
  ];
  const porMedir = [
    { rotulo: m.uso.armazenamento, razao: m.uso.razaoArmazenamento },
  ];

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.uso.sobrancelha}</p>
          <h1>{m.uso.titulo}</h1>
        </div>
        {/* "Ver opciones" tem destino: a comparação de planos existe e é onde
            as opções estão. Era um <Botao> sem manipulador — prometia e não ia
            a lado nenhum. */}
        <a className="bo-botao bo-botao--primario"
           href={`/${idioma}/app/${orgSlug}/organization/plano/cambiar`}>
          {m.uso.accao}
        </a>
      </div>

      <div className="bo-uso">
        {medidos.map((c) => (
          <Cartao key={c.rotulo} className="bo-uso__cartao">
            <p className="bo-uso__rotulo">{c.rotulo}</p>
            <p className="bo-uso__valor">
              {c.quota === null
                ? c.sufixo.replace('{n}', formatarNumero(c.valor, idioma))
                : m.uso.deQuota
                    .replace('{uso}', formatarNumero(c.valor, idioma))
                    .replace('{quota}', formatarNumero(c.quota, idioma))}
            </p>
            {c.quota === null ? <p className="bo-uso__nota">{m.uso.porContratar}</p> : null}
          </Cartao>
        ))}
        {porMedir.map((c) => (
          <Cartao key={c.rotulo} variante="suave" className="bo-uso__cartao">
            <p className="bo-uso__rotulo">{c.rotulo}</p>
            {/* Sem número. Um traço é honesto; um zero diria que se contou. */}
            <p className="bo-uso__valor bo-uso__valor--ausente">{m.uso.aindaNaoMedido}</p>
            <p className="bo-uso__nota">{c.razao}</p>
          </Cartao>
        ))}
      </div>

      <p className="bo-planos__nota">{m.uso.nota}</p>
    </div>
  );
}
