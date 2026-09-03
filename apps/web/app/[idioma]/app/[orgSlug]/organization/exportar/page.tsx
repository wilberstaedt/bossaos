import { redirect } from 'next/navigation';
import { Aviso, Botao, Cartao, Etiqueta, Seletor, Tabela } from '@bossaos/ui';
import { formatarDataHora, formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarExportacoes, listarMarcas } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * SET-012 · "Exporta tus datos" (atlas p. 342)
 *
 * ── As duas notas por baixo são o ecrã inteiro ─────────────────────────────
 *
 * *"O link caduca numa hora e volta a verificar a tua permissão ao descarregar."*
 * Diz-se porque a alternativa — um link que funciona para sempre — parece melhor
 * a quem exporta e é uma porta que fica aberta atrás de quem sai.
 *
 * *"Os campos que começam por = + - ou @ saem neutralizados."* Diz-se porque um
 * ficheiro que abre no Excel e mostra um número diferente do esperado parece um
 * defeito nosso, e a explicação tem de estar antes da pergunta.
 *
 * A coluna **Caduca** mostra o estado calculado, não a data crua: "caducado" é
 * uma resposta, uma data no passado é um enigma.
 */
export default async function Exportar({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
  searchParams: Promise<{ erro?: string; pedido?: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const { erro, pedido } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.publicacaoE08;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => ({
    marcas: await listarMarcas(db),
    // Só as desta pessoa. Uma exportação é de quem a pediu, e listar as dos
    // outros já é dizer o que eles andaram a levar.
    exportacoes: await listarExportacoes(db, sessao.actor.id),
  }));

  const agora = Date.now();

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaExportar}</p>
          <h1>{c.tituloExportar}</h1>
        </div>
      </div>

      {pedido ? <Aviso tom="sucesso" titulo={m.catalogoE07.guardado} /> : null}
      {erro ? <Aviso tom="perigo" titulo={erro} urgente /> : null}

      <Cartao>
        <form method="post" action={`/api/org/${orgSlug}/exportacoes`} className="bo-forma">
          <input type="hidden" name="idioma" value={idioma} />
          <div className="bo-forma__grelha">
            <Seletor rotulo="Marca" name="brandId" defaultValue="">
              <option value="">{m.plataforma.abrirDetalhe}</option>
              {dados.marcas.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </Seletor>
          </div>
          <Botao type="submit">{c.accaoExportar}</Botao>
        </form>
        <p className="bo-planos__nota">{c.notaExportacao}</p>
        <p className="bo-planos__nota">{c.notaFormula}</p>
      </Cartao>

      <Tabela
        legenda={c.tituloExportar}
        colunas={[
          { chave: 'formato', rotulo: c.colunaFormato },
          { chave: 'quando', rotulo: c.colunaQuando },
          { chave: 'tamanho', rotulo: c.colunaTamanho, numero: true },
          { chave: 'estado', rotulo: c.colunaExpira },
        ]}
        linhas={dados.exportacoes.map((e) => ({
          id: e.id,
          formato: e.formato,
          quando: formatarDataHora(e.createdAt, idioma, 'UTC'),
          tamanho: e.bytes === null ? '—' : `${formatarNumero(Math.round(e.bytes / 1024), idioma)} kB`,
          // Estado, não data crua: "caducado" é uma resposta.
          estado: e.revogadaEm ? c.revogado
            : e.expiraEm.getTime() <= agora ? c.expirado
            : formatarDataHora(e.expiraEm, idioma, 'UTC'),
        }))}
        celula={(linha, coluna) =>
          coluna.chave === 'estado'
            ? (linha.estado === c.expirado || linha.estado === c.revogado
                ? <Etiqueta tom="neutro">{linha.estado}</Etiqueta>
                : (
                  // O botão existe; quem decide é a rota, que verifica a
                  // permissão OUTRA VEZ. Mostrá-lo não concede nada.
                  <a className="bo-botao bo-botao--secundario"
                     href={`/api/org/${orgSlug}/exportacoes/${linha.id}`}>
                    {c.accaoDescarregar}
                  </a>
                ))
            : linha[coluna.chave]}
        vazio={m.plataforma.semRegistos}
      />
    </div>
  );
}
