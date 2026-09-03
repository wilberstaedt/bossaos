import { redirect } from 'next/navigation';
import { Aviso, Botao, Campo, Cartao, Etiqueta, Seletor, Tabela } from '@bossaos/ui';
import { formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarMarcas, listarMedia } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-023 · "Tus imágenes" (atlas p. 73)
 *
 * ── As duas notas por baixo dos formulários não são decoração ──────────────
 *
 * O SVG é recusado, e o ecrã **diz porquê** antes de alguém tentar: quem carrega
 * um logótipo SVG fá-lo de boa fé, e "formato não suportado" sem explicação faz
 * a pessoa tentar outra vez com o mesmo ficheiro renomeado — que é exactamente o
 * ataque, feito por acidente.
 *
 * E o "traer por URL" avisa que só aceita endereços públicos, porque é o pedido
 * que o **nosso** servidor faz. Sem isso parece um campo de conveniência.
 *
 * A coluna do texto alternativo mostra a AUSÊNCIA em vez de a esconder: uma foto
 * sem alternativa é uma foto que não existe para quem usa leitor de ecrã, e isso
 * não se descobre olhando para a grelha bonita.
 */
export default async function BibliotecaDeMedia({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
  searchParams: Promise<{ erro?: string; detalhe?: string; guardado?: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const { erro, detalhe, guardado } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.publicacaoE08;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => ({
    marcas: await listarMarcas(db),
    ficheiros: await listarMedia(db),
  }));

  const mensagemDeErro = erro === 'tipo_nao_permitido' ? c.erroTipo
    : erro === 'grande_demais' ? c.erroTamanho
    : erro === 'destino_interno' ? c.erroDestino
    : erro === 'sem_texto_alternativo' ? c.erroAlternativo
    : erro ? c.erroTipo : null;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaMedia}</p>
          <h1>{c.tituloMedia}</h1>
        </div>
      </div>

      {guardado ? <Aviso tom="sucesso" titulo={m.catalogoE07.guardado} /> : null}
      {mensagemDeErro
        ? <Aviso tom="perigo" titulo={mensagemDeErro} urgente>
            {/* O detalhe diz SVG quando é SVG. Um "tipo não permitido" genérico
                manda a pessoa tentar o mesmo ficheiro com outro nome. */}
            {detalhe === 'svg' ? c.notaSvg : detalhe ?? ''}
          </Aviso>
        : null}

      <Cartao>
        <h2 className="bo-planos__nome">{c.accaoCarregar}</h2>
        <form method="post" action={`/api/org/${orgSlug}/media`}
              encType="multipart/form-data" className="bo-forma">
          <input type="hidden" name="idioma" value={idioma} />
          <div className="bo-forma__grelha">
            <Seletor rotulo="Marca" name="brandId" required>
              {dados.marcas.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </Seletor>
            <Campo rotulo={c.colunaFicheiro} name="ficheiro" type="file"
                   accept="image/png,image/jpeg,image/webp,image/gif" required />
            <Campo rotulo={c.colunaAlternativo} name="textoAlternativo" required />
          </div>
          <Botao type="submit">{c.accaoCarregar}</Botao>
        </form>
        <p className="bo-planos__nota">{c.notaTipos}</p>
        <p className="bo-planos__nota">{c.notaSvg}</p>
      </Cartao>

      <Cartao variante="suave">
        <h2 className="bo-planos__nome">{c.accaoPorUrl}</h2>
        <form method="post" action={`/api/org/${orgSlug}/media/url`} className="bo-forma">
          <input type="hidden" name="idioma" value={idioma} />
          <div className="bo-forma__grelha">
            <Seletor rotulo="Marca" name="brandId" required>
              {dados.marcas.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </Seletor>
            <Campo rotulo="URL" name="url" type="url" required />
            <Campo rotulo={c.colunaAlternativo} name="textoAlternativo" required />
          </div>
          <Botao type="submit" tom="secundario">{c.accaoPorUrl}</Botao>
        </form>
        <p className="bo-planos__nota">{c.notaUrl}</p>
      </Cartao>

      <Tabela
        legenda={c.tituloMedia}
        colunas={[
          { chave: 'nome', rotulo: c.colunaFicheiro },
          { chave: 'tipo', rotulo: c.colunaTipo },
          { chave: 'tamanho', rotulo: c.colunaTamanho, numero: true },
          { chave: 'alternativo', rotulo: c.colunaAlternativo },
          { chave: 'uso', rotulo: c.colunaUso, numero: true },
        ]}
        linhas={dados.ficheiros.map((f) => ({
          id: f.id,
          nome: f.nomeOriginal ?? f.chave,
          // O tipo mostrado é o CALCULADO dos bytes, não o que veio no pedido.
          tipo: f.tipo,
          tamanho: `${formatarNumero(Math.round(f.bytes / 1024), idioma)} kB`,
          alternativo: f.textoAlternativo ?? c.semAlternativo,
          uso: formatarNumero(f._count.emProdutos, idioma),
        }))}
        celula={(linha, coluna) =>
          coluna.chave === 'alternativo' && linha.alternativo === c.semAlternativo
            ? <Etiqueta tom="aviso">{linha.alternativo}</Etiqueta>
            : linha[coluna.chave]}
        vazio={m.plataforma.semRegistos}
      />
    </div>
  );
}
