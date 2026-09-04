import { redirect } from 'next/navigation';
import { Aviso, Cartao, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarProdutos } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-020 · «Menú del día» (atlas p. 106) — os combos.
 *
 * ── A regra que custa dinheiro está escrita em três sítios ───────────────
 *
 * «Não some o preço do combo e de seus componentes duas vezes» (E14, entregar 7).
 * O defeito é fácil de escrever: o combo entra como linha com preço fixo, os
 * componentes entram como linhas para a cozinha saber o que fazer, e a soma
 * apanha os dois. Cada linha isolada está certa; a conta vem a dobrar.
 *
 * Está fechado em três portas que falham por motivos diferentes:
 *
 *   1. a **base** recusa preço a uma linha com `linha_pai_id`
 *      (`componente_de_combo_nao_tem_preco`);
 *   2. `totalDoPedido` ignora as linhas com pai;
 *   3. os relatórios filtram-nas na consulta.
 *
 * Três e não uma porque a terceira é a mais provável de alguém reescrever sem
 * conhecer a regra — um relatório novo daqui a seis meses.
 *
 * ── E o componente continua IDENTIFICÁVEL ────────────────────────────────
 *
 * O prompt pede-o pelo nome. A cozinha lê a linha do componente; o cliente lê o
 * combo; a conta soma uma vez. Esconder os componentes resolvia a soma e cegava a
 * cozinha.
 */
export default async function Combos({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const m = mensagensDe(idioma);
  const p = m.pedidosE14;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const produtos = await comEscopoDoPedido(sessao, (db) => listarProdutos(db, {}));
  const combos = produtos.filter((x) => x.combo);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.catalogo.titulo}</p>
          <h1>{p.combos}</h1>
        </div>
      </div>

      {combos.length === 0 ? (
        <Aviso titulo={p.combos}>{p.semDados}</Aviso>
      ) : (
        <Cartao titulo={p.combos}>
          <ul className="bo-publico__lista">
            {combos.map((c) => (
              <li key={c.id} className="bo-publico__produto">
                <a href={`/${idioma}/app/${orgSlug}/catalogo/produtos/${c.id}`}>
                  <span className="bo-publico__nome">{c.nome}</span>
                  <span className="bo-publico__preco">
                    <Etiqueta tom="neutro">{p.combos}</Etiqueta>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      <Aviso tom="info" titulo={p.total}>
        {/* A regra dita a quem lê o ecrã, e não só a quem lê o código. */}
        {p.naoEReceita}
      </Aviso>
    </div>
  );
}
