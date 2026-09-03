import { redirect } from 'next/navigation';
import { Botao, Campo, Cartao, Etiqueta, Seletor, Tabela } from '@bossaos/ui';
import { formatarData, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarMarcas } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-002 · "Menús" (atlas p. 54)
 *
 * A coluna **Ámbito** é a que carrega o modelo: um menu ou é da marca inteira ou
 * é de uma unidade. Não há um terceiro estado "das unidades do sul" — se
 * aparecer essa necessidade, resolve-se com outro menu, e não com um campo que
 * ninguém consegue interpretar seis meses depois.
 *
 * **Período ausente dos dois lados é "todo el año"** e diz-se com palavras. Uma
 * data em branco lê-se como esquecimento; a frase diz que foi decidido.
 */
export default async function Menus({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const m = mensagensDe(idioma);
  const c = m.catalogoE07;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const { menus, marcas } = await comEscopoDoPedido(sessao, async (db) => ({
    marcas: await listarMarcas(db),
    menus: await db.menu.findMany({
      where: { archivedAt: null },
      select: {
        id: true, nome: true, estado: true, periodoDe: true, periodoAte: true,
        location: { select: { nome: true } },
        canais: { select: { canal: true } },
      },
      orderBy: { nome: 'asc' },
    }),
  }));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaMenus}</p>
          <h1>{c.tituloMenus}</h1>
        </div>
      </div>


      {/* ── Criar sem uma tela nova ────────────────────────────────────────
          O atlas não desenha um ecrã de criação para menus: a matriz tem
          CAT-002 e CAT-003 e mais nenhum. Uma rota `/novo` seria uma tela a mais, e
          colidia com o segmento dinâmico ao lado. O formulário mínimo vive
          aqui, e o resto edita-se na ficha. */}
      <Cartao>
        <form method="post" action="{`/api/org/${orgSlug}/menus`}" className="bo-forma__grelha">
          <input type="hidden" name="idioma" value={idioma} />
          <Campo rotulo={c.nome} name="nome" required />
          <Seletor rotulo={c.colunaAmbito} name="brandId" required>
            {marcas.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </Seletor>
          <Botao type="submit">{c.accaoCriarMenu}</Botao>
        </form>
      </Cartao>

      <Tabela
        legenda={c.tituloMenus}
        colunas={[
          { chave: 'nome', rotulo: c.colunaMenu },
          { chave: 'ambito', rotulo: c.colunaAmbito },
          { chave: 'canais', rotulo: c.colunaCanais },
          { chave: 'periodo', rotulo: c.periodo },
          { chave: 'estado', rotulo: c.colunaEstado },
        ]}
        linhas={menus.map((x) => ({
          id: x.id,
          nome: x.nome,
          ambito: x.location?.nome ?? c.ambitoMarca,
          canais: x.canais
            .map((k) => (c as unknown as Record<string, string>)[`canal${k.canal}`] ?? k.canal)
            .join(', ') || '—',
          periodo:
            x.periodoDe || x.periodoAte
              ? [x.periodoDe, x.periodoAte]
                  .map((d) => (d ? formatarData(d, idioma) : '—')).join(' → ')
              : c.todoOAno,
          estado: (c as unknown as Record<string, string>)[`estado${x.estado}`] ?? x.estado,
        }))}
        celula={(linha, coluna) =>
          coluna.chave === 'nome'
            ? <a href={`/${idioma}/app/${orgSlug}/catalogo/menus/${linha.id}`}>{linha.nome}</a>
            : coluna.chave === 'estado'
              ? <Etiqueta tom={linha.estado === c.estadoACTIVO ? 'sucesso' : 'neutro'}>{linha.estado}</Etiqueta>
              : linha[coluna.chave]}
        vazio={m.plataforma.semRegistos}
      />
    </div>
  );
}
