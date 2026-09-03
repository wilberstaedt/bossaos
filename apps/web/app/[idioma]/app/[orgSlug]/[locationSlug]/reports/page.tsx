import { notFound, redirect } from 'next/navigation';
import { Cartao, Tabela } from '@bossaos/ui';
import { formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarUnidades } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * REP-001 · "Así visitan tu carta" (atlas p. 87)
 *
 * ── O relatório mostra o que se guarda, e o que se guarda é pouco ──────────
 *
 * Unidade, idioma e origem. **Nada que siga uma pessoa** — nem endereço IP, nem
 * agente do navegador, nem cookie, nem identificador de sessão. A tabela nem
 * sequer tem colunas para isso, e `registarConsulta` não tem parâmetros por onde
 * o receber: o que não entra não se guarda por distracção.
 *
 * A nota por baixo diz isto ao dono do restaurante. Não é conformidade
 * decorativa: é a resposta à pergunta que ele vai fazer — *"consigo saber quem
 * viu?"* — e a resposta é não, de propósito.
 *
 * E o número é o que há. Sem consultas, diz-se que não há; não se inventa uma
 * série ilustrativa, que foi a decisão do ORG-013 e do CAT-001.
 */
export default async function Relatorio({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const c = m.publicoE09;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const unidades = await listarUnidades(db);
    const unidade = unidades.find((u) => u.slug === locationSlug);
    if (!unidade) return null;
    const [porIdioma, porOrigem, total] = await Promise.all([
      db.menuView.groupBy({
        by: ['idioma'], where: { locationId: unidade.id }, _count: { _all: true },
      }),
      db.menuView.groupBy({
        by: ['origem'], where: { locationId: unidade.id }, _count: { _all: true },
      }),
      db.menuView.count({ where: { locationId: unidade.id } }),
    ]);
    return { unidade, porIdioma, porOrigem, total };
  });
  if (!dados) notFound();

  const rotuloDaOrigem = (o: string) =>
    (c as unknown as Record<string, string>)[
      `origem${o.replace(/-(.)/g, (_x, y: string) => y.toUpperCase())
        .replace(/^(.)/, (y: string) => y.toUpperCase())}`
    ] ?? o;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaRelatorio}</p>
          <h1>{c.tituloRelatorio}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/channels`}>{c.tituloCanais}</a>
      </div>

      {dados.total === 0 ? (
        // Sem consultas diz-se que não há. Uma série ilustrativa aqui seria a
        // mesma mentira que o gráfico do ORG-013.
        <Cartao variante="suave">{c.semConsultas}</Cartao>
      ) : (
        <>
          <Cartao className="bo-uso__cartao">
            <p className="bo-uso__rotulo">{c.colunaConsultas}</p>
            <p className="bo-uso__valor">{formatarNumero(dados.total, idioma)}</p>
          </Cartao>

          <Tabela
            legenda={c.colunaIdioma}
            colunas={[
              { chave: 'idioma', rotulo: c.colunaIdioma },
              { chave: 'consultas', rotulo: c.colunaConsultas, numero: true },
            ]}
            linhas={dados.porIdioma.map((x) => ({
              id: x.idioma,
              idioma: x.idioma,
              consultas: formatarNumero(x._count._all, idioma),
            }))}
            vazio={c.semConsultas}
          />

          <Tabela
            legenda={c.colunaOrigem}
            colunas={[
              { chave: 'origem', rotulo: c.colunaOrigem },
              { chave: 'consultas', rotulo: c.colunaConsultas, numero: true },
            ]}
            linhas={dados.porOrigem.map((x) => ({
              id: x.origem,
              origem: rotuloDaOrigem(x.origem),
              consultas: formatarNumero(x._count._all, idioma),
            }))}
            vazio={c.semConsultas}
          />
        </>
      )}

      {/* A resposta à pergunta que o dono do restaurante vai fazer. */}
      <p className="bo-planos__nota">{c.notaRelatorio}</p>
    </div>
  );
}
