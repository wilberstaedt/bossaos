import { redirect } from 'next/navigation';
import { Aviso, Botao, Campo, Cartao, Etiqueta, Seletor, Tabela } from '@bossaos/ui';
import { formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarMarcas } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-027 · "Importa y exporta productos" (atlas p. 77)
 *
 * ── A estratégia não tem valor por omissão, e isso vê-se ───────────────────
 *
 * O selector abre em "não tocar nada, só criar". Não é a opção mais útil — é a
 * que **não destrói**. Uma importação que só cria faz, no pior caso, duplicados
 * visíveis, que se apagam; uma que actualiza por engano funde produtos, e com
 * eles a ficha de alérgenos que alguém assinou.
 *
 * E a nota por baixo diz a regra por extenso: dois produtos com o mesmo nome não
 * são o mesmo produto. Quem escolhe "actualizar" tem de saber que a chave é o
 * SKU e mais nada.
 *
 * **A prévia não escreve.** Diz-se com essas palavras porque o botão a seguir
 * escreve, e a diferença entre os dois é a coisa mais importante deste ecrã.
 */
export default async function ImportarEExportar({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
  searchParams: Promise<{ erro?: string; importado?: string; job?: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const { erro, importado, job } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.publicacaoE08;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => ({
    marcas: await listarMarcas(db),
    // A prévia do trabalho escolhido, quando há um. Fica NESTE ecrã: a matriz
    // tem CAT-027 e mais nenhum, e uma rota `/importar/[jobId]` seria uma tela
    // a mais para mostrar uma coisa que pertence ao mesmo passo.
    escolhido: job
      ? await db.importJob.findFirst({
          where: { id: job },
          select: {
            id: true, ficheiroNome: true, estado: true, estrategia: true, resumo: true,
            linhas: {
              select: { linha: true, accao: true, erro: true, dados: true },
              orderBy: { linha: 'asc' },
              take: 200,
            },
          },
        })
      : null,
    trabalhos: await db.importJob.findMany({
      select: {
        id: true, ficheiroNome: true, estado: true, estrategia: true,
        resumo: true, createdAt: true, criadoPor: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  }));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaImportar}</p>
          <h1>{c.tituloImportar}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/organization/exportar`}>{c.tituloExportar}</a>
      </div>

      {importado ? <Aviso tom="sucesso" titulo={m.catalogoE07.guardado} /> : null}
      {erro ? <Aviso tom="perigo" titulo={erro} urgente /> : null}

      <Cartao>
        <form method="post" action={`/api/org/${orgSlug}/importacoes`}
              encType="multipart/form-data" className="bo-forma">
          <input type="hidden" name="idioma" value={idioma} />
          <div className="bo-forma__grelha">
            <Seletor rotulo="Marca" name="brandId" required>
              {dados.marcas.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </Seletor>
            <Campo rotulo={c.ficheiro} name="ficheiro" type="file" accept=".csv,text/csv" required />
            {/* Vazio = detectar. O Excel espanhol escreve `;`, e assumir `,` lê a
                carta inteira como uma coluna só. */}
            <Seletor rotulo={c.separador} name="separador" defaultValue="">
              <option value="">{m.arranque.porEscolher}</option>
              <option value=";">;</option>
              <option value=",">,</option>
              <option value="&#9;">tab</option>
            </Seletor>
            <Seletor rotulo={c.estrategia} name="estrategia" defaultValue="criar_apenas" required>
              <option value="criar_apenas">{c.estrategiaCriar}</option>
              <option value="actualizar_por_sku">{c.estrategiaActualizar}</option>
            </Seletor>
          </div>
          <Botao type="submit" tom="secundario">{c.accaoPrevisualizar}</Botao>
        </form>
        <p className="bo-planos__nota">{c.notaEstrategia}</p>
        <p className="bo-planos__nota">{c.notaPrevia}</p>
      </Cartao>


      {dados.escolhido ? (
        <Cartao>
          <div className="bo-estado__cabecalho">
            <h2 className="bo-planos__nome">{dados.escolhido.ficheiroNome}</h2>
            <Etiqueta tom={dados.escolhido.estado === 'CONFIRMADA' ? 'sucesso' : 'info'}>
              {dados.escolhido.estado}
            </Etiqueta>
          </div>

          <Tabela
            legenda={c.accaoPrevisualizar}
            colunas={[
              { chave: 'linha', rotulo: c.colunaLinha, numero: true },
              { chave: 'nome', rotulo: m.catalogoE07.nome },
              { chave: 'sku', rotulo: m.catalogoE07.referencia },
              { chave: 'accao', rotulo: c.colunaAccao },
              { chave: 'problema', rotulo: c.colunaErro },
            ]}
            linhas={dados.escolhido.linhas.map((l) => {
              const d = (l.dados ?? {}) as { nome?: string; sku?: string | null };
              return {
                id: String(l.linha),
                // A linha como a pessoa a vê no Excel, não o índice do vector.
                linha: formatarNumero(l.linha, idioma),
                nome: d.nome ?? '',
                sku: d.sku ?? '—',
                accao: l.accao === 'CRIAR' ? c.accaoCriar
                  : l.accao === 'ACTUALIZAR' ? c.accaoActualizar
                  : l.accao === 'IGNORAR' ? c.accaoIgnorar : c.accaoErro,
                problema: l.erro
                  ? ((c as unknown as Record<string, string>)[
                      `erro${l.erro.replace(/_(.)/g, (_x, y: string) => y.toUpperCase())
                        .replace(/^(.)/, (y: string) => y.toUpperCase())}`
                    ] ?? l.erro)
                  : '',
              };
            })}
            celula={(linha, coluna) =>
              coluna.chave === 'accao'
                ? <Etiqueta tom={
                    linha.accao === c.accaoErro ? 'perigo'
                      : linha.accao === c.accaoIgnorar ? 'neutro' : 'sucesso'
                  }>{linha.accao}</Etiqueta>
                : linha[coluna.chave]}
            vazio={m.plataforma.semRegistos}
          />

          {dados.escolhido.estado === 'PREVISTA' ? (
            <form method="post"
                  action={`/api/org/${orgSlug}/importacoes/${dados.escolhido.id}/confirmar`}>
              <input type="hidden" name="idioma" value={idioma} />
              <Botao type="submit">{c.accaoConfirmar}</Botao>
            </form>
          ) : null}
        </Cartao>
      ) : null}

      <Tabela
        legenda={c.sobrancelhaImportar}
        colunas={[
          { chave: 'ficheiro', rotulo: c.ficheiro },
          { chave: 'estrategia', rotulo: c.estrategia },
          { chave: 'resumo', rotulo: c.colunaAccao },
          { chave: 'estado', rotulo: m.catalogoE07.colunaEstado },
        ]}
        linhas={dados.trabalhos.map((t) => {
          const r = (t.resumo ?? {}) as { criar?: number; actualizar?: number; ignorar?: number; erro?: number };
          return {
            id: t.id,
            ficheiro: t.ficheiroNome,
            estrategia: t.estrategia === 'criar_apenas' ? c.estrategiaCriar : c.estrategiaActualizar,
            resumo: c.resumoPrevia
              .replace('{criar}', formatarNumero(r.criar ?? 0, idioma))
              .replace('{actualizar}', formatarNumero(r.actualizar ?? 0, idioma))
              .replace('{ignorar}', formatarNumero(r.ignorar ?? 0, idioma))
              .replace('{erro}', formatarNumero(r.erro ?? 0, idioma)),
            estado: t.estado,
          };
        })}
        celula={(linha, coluna) =>
          coluna.chave === 'ficheiro'
            ? <a href={`/${idioma}/app/${orgSlug}/catalogo/importar?job=${linha.id}`}>{linha.ficheiro}</a>
            : coluna.chave === 'estado'
              ? <Etiqueta tom={linha.estado === 'CONFIRMADA' ? 'sucesso' : 'neutro'}>{linha.estado}</Etiqueta>
              : linha[coluna.chave]}
        vazio={m.plataforma.semRegistos}
      />
    </div>
  );
}
