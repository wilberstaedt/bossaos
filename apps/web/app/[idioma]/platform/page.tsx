import { redirect } from 'next/navigation';
import { Tabela } from '@bossaos/ui';
import { formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { comIdentidade, obterPrisma, organizacoesDaPlataforma } from '@bossaos/db';
import { actorDoPedido } from '../../../src/sessao.ts';
import { obterEnv } from '../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * PLAT-002 · "Organizaciones BossaOS" (atlas p. 360)
 *
 * Quatro colunas, e **as quatro são lidas**: o plano vem da subscrição, o estado
 * dela, e as unidades de um `count()` na base. O atlas desenha "4 registros
 * mostrados" com três linhas visíveis; aqui o número é o que existe.
 *
 * A acção "Crear organización" está desenhada e não escreve: criar inquilinos é
 * escrita comercial, e essa passa pelo `scripts/plataforma.mjs`, com a
 * credencial certa e com rasto. A interface completa é a E33.
 */
export default async function Organizacoes({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const m = mensagensDe(idioma);
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  const orgs = await comIdentidade(prisma, actor.id, (db) => organizacoesDaPlataforma(db));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.plataforma.sobrancelhaTenants}</p>
          <h1>{m.plataforma.tituloTenants}</h1>
        </div>
        {/* Saiu: a escrita de plataforma é pelo script auditado, e a nota desta
            página já o diz. O botão contradizia a nota ao lado dele. */}
      </div>

      <Tabela
        legenda={m.plataforma.tituloTenants}
        colunas={[
          { chave: 'nome', rotulo: m.plataforma.colunaOrganizacao },
          { chave: 'plano', rotulo: m.plataforma.colunaPlano },
          { chave: 'estado', rotulo: m.plataforma.colunaEstado },
          { chave: 'unidades', rotulo: m.plataforma.colunaUnidades, numero: true },
        ]}
        linhas={orgs.map((o) => ({
          id: o.id,
          nome: o.nome,
          plano: o.plano ?? '—',
          estado: o.estado,
          unidades: formatarNumero(o.unidades, idioma),
        }))}
        celula={(linha, coluna) =>
          coluna.chave === 'nome' ? (
            <a href={`/${idioma}/platform/${linha.id}`}>{linha.nome}</a>
          ) : (
            linha[coluna.chave]
          )
        }
        vazio={m.plataforma.semRegistos}
      />
      <p className="bo-planos__nota">
        {m.plataforma.registosMostrados.replace('{n}', formatarNumero(orgs.length, idioma))}
      </p>
    </div>
  );
}
