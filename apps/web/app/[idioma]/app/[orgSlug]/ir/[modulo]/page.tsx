import { notFound } from 'next/navigation';
import { listarUnidades } from '@bossaos/db';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * A porta dos módulos que vivem DENTRO de uma unidade.
 *
 * ── Uma regra, e não uma por módulo ───────────────────────────────────────
 *
 * «Não há navegação para `/app/<org>/<unidade>/x` sem um sítio onde a unidade se
 * escolha.» Isso são três ou quatro escolhas de unidade, uma por módulo — e três
 * páginas com a mesma regra são três regras no dia em que uma mudar. É a mesma
 * decisão que pôs a casca do TPV a reaproveitar a do Staff.
 *
 * O módulo viaja no endereço; o que muda entre eles é só para onde a unidade
 * aponta. Um módulo que não esteja nesta tabela dá **ausência** — não é uma
 * página que aceita qualquer palavra e mostra uma lista vazia.
 */
const DESTINOS: Record<string, { rotulo: (m: ReturnType<typeof mensagensDe>) => string; caminho: string }> = {
  reservas: { rotulo: (m) => m.navegacao.reservas, caminho: 'reservations' },
  sala: { rotulo: (m) => m.navegacao.salaPedidos, caminho: 'floor' },
  pedidos: { rotulo: (m) => m.navegacao.salaPedidos, caminho: 'orders' },
  levar: { rotulo: (m) => m.navegacao.levar, caminho: 'takeaway' },
  entrega: { rotulo: (m) => m.navegacao.levar, caminho: 'delivery' },
  relatorios: { rotulo: (m) => m.navegacao.relatorios, caminho: 'reports' },
  stock: { rotulo: (m) => m.navegacao.inventario, caminho: 'inventory' },
  compras: { rotulo: (m) => m.comprasE26.compras, caminho: 'purchases' },
};

export default async function EscolherUnidade({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; modulo: string }> }) {
  const { idioma, orgSlug, modulo } = await params;
  const destino = DESTINOS[modulo];
  if (!destino) notFound();

  const m = mensagensDe(idioma);
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) notFound();
  const unidades = (await comEscopoDoPedido(
    sessao, (db) => listarUnidades(db),
  )) as { id: string; nome: string; slug: string }[];

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{orgSlug}</p>
          <h1 data-tela="NAV-UNIDADE">{destino.rotulo(m)}</h1>
        </div>
      </div>
      <p data-teste="escolher-unidade">{m.comum.trocarUnidade}</p>
      <p data-teste="quantas-unidades">{unidades.length}</p>
      {unidades.length === 0 ? <p data-teste="sem-unidades">{m.comum.trocarUnidade}</p> : (
        <ul className="bo-lista" data-teste="unidades">
          {unidades.map((u) => (
            <li key={u.id}>
              <a className="bo-botao" data-seccao={`ir-${modulo}`}
                 href={`/${idioma}/app/${orgSlug}/${u.slug}/${destino.caminho}`}>{u.nome}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
