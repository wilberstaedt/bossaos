import { Botao, Campo, Tabela } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarMapasExternos } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarLevar } from '../../../../../../../src/levar/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * DEL-002 · «Catálogo externo» (atlas)
 *
 * ── Sem mapa não se adivinha ──────────────────────────────────────────────
 *
 * O que lá fora se chama «Burger 4» é aqui um produto. Um pedido externo com um
 * item sem mapa é **recusado** — adivinhar num pedido é servir outra coisa, e
 * quem recebe descobre quando abre o saco.
 *
 * A frase está no ecrã porque quem configura isto precisa de saber que deixar um
 * item por mapear não é um detalhe adiável: é um pedido que não entra.
 */
export default async function MapeamentoExterno({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).levarE20;
  const { sessao, unidade } = await carregarLevar(idioma, orgSlug, locationSlug);
  const mapas = await comEscopoDoPedido(sessao, (db) => listarMapasExternos(db, unidade.id));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="DEL-002">{t.mapeamento}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/delivery`}>{t.voltar}</a>
      </div>

      {/* ── A explicação está SEMPRE no ecrã, e não só quando a lista vazia ──
          Escrevi-a primeiro dentro do `vazio`, e por isso desaparecia assim que
          houvesse um mapa. Quem configura o segundo item precisa de a ler tanto
          como quem configurou o primeiro — e é aí que um item por mapear passa
          despercebido. */}
      <p className="bo-campo__ajuda" data-teste="sem-mapas-ajuda">{t.semMapasAjuda}</p>

      <Tabela
        legenda={t.mapeamento}
        vazio={<p data-teste="sem-mapas">{t.semMapas}</p>}
        colunas={[
          { chave: 'canal', rotulo: t.canalExterno },
          { chave: 'idExterno', rotulo: t.idExterno },
          { chave: 'produto', rotulo: t.produto },
        ]}
        linhas={mapas.map((x) => ({
          id: x.id, canal: x.canalExterno, idExterno: x.idExterno, produto: x.produto.nome,
        }))}
      />

      <form method="post" action={`/api/org/${orgSlug}/levar`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <input type="hidden" name="accao" value="guardar_mapa" />
        <Campo rotulo={t.canalExterno} name="canalExterno" type="text" defaultValue="" />
        <Campo rotulo={t.idExterno} name="idExterno" type="text" defaultValue="" />
        <Campo rotulo={t.produto} name="productId" type="text" defaultValue="" />
        <Botao type="submit" data-teste="guardar-mapa">{t.adicionar}</Botao>
      </form>
    </div>
  );
}
