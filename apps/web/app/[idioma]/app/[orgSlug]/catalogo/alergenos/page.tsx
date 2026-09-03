import { redirect } from 'next/navigation';
import { Aviso, Tabela } from '@bossaos/ui';
import { formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { ALERGENIOS_UE } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-022 · "Biblioteca de alérgenos" (atlas p. 74)
 *
 * ── Esta lista é de leitura, e isso é uma decisão de segurança ─────────────
 *
 * Os catorze alérgenos são o **Anexo II do Regulamento (UE) 1169/2011**. Não são
 * uma configuração do restaurante: são a lei. Se um utilizador pudesse apagar
 * "sésamo" da lista, as fichas de todos os produtos deixavam de o mencionar — e
 * ninguém notava, porque a coluna desaparecia inteira.
 *
 * Por isso a tabela `allergens` tem, na migração do E07:
 *
 *     REVOKE ALL ON allergens FROM bossaos_app;
 *     GRANT SELECT ON allergens TO bossaos_app;
 *
 * O runtime **não consegue** inserir, alterar nem apagar um alérgeno, mesmo que
 * alguém escreva o código para o fazer. Está provado em `provas/catalogo.test.ts`,
 * onde um `INSERT` com a credencial do runtime devolve *permission denied* — o
 * que o torna uma garantia da base de dados e não uma promessa da aplicação.
 *
 * A contagem à direita é o que falta declarar em todo o catálogo. É o número que
 * decide se esta carta se pode publicar.
 */
export default async function BibliotecaDeAlergenos({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string }>;
}) {
  const { idioma, orgSlug } = await params;
  const m = mensagensDe(idioma);
  const c = m.catalogoE07;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const lista = await db.allergen.findMany({ select: { id: true, codigo: true, regiao: true }, orderBy: { ordem: 'asc' } });
    const produtos = await db.product.count({ where: { archivedAt: null } });
    const declarados = await db.productAllergen.groupBy({
      by: ['allergenId'], _count: { _all: true },
    });
    const porAlergenio = new Map(declarados.map((d) => [d.allergenId, d._count._all]));
    return { lista, produtos, porAlergenio };
  });

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaAlergenos}</p>
          <h1>{c.tituloBibliotecaAlergenos}</h1>
        </div>
      </div>

      <Aviso tom="info" titulo={c.sobrancelhaAlergenos}>{c.avisoNaoInferimos}</Aviso>

      <Tabela
        legenda={c.tituloBibliotecaAlergenos}
        colunas={[
          { chave: 'nome', rotulo: c.colunaAlergeno },
          { chave: 'regiao', rotulo: c.colunaRegiao },
          { chave: 'declarados', rotulo: c.colunaProdutos, numero: true },
          { chave: 'porDeclarar', rotulo: c.porDeclarar.replace('{n} ', ''), numero: true },
        ]}
        linhas={dados.lista.map((a) => {
          const declarados = dados.porAlergenio.get(a.id) ?? 0;
          return {
            id: a.id,
            // O nome traduzido vem do dicionário; o código é a chave estável.
            nome: (m.alergenios as unknown as Record<string, string>)[a.codigo] ?? a.codigo,
            regiao: a.regiao,
            declarados: formatarNumero(declarados, idioma),
            // O que falta é uma subtracção, não uma estimativa: os produtos que
            // existem menos os que têm declaração para este alérgeno.
            porDeclarar: formatarNumero(dados.produtos - declarados, idioma),
          };
        })}
        vazio={m.plataforma.semRegistos}
      />
      <p className="bo-planos__nota">
        {`${formatarNumero(ALERGENIOS_UE.length, idioma)} · ${c.notaAlergenos}`}
      </p>
    </div>
  );
}
