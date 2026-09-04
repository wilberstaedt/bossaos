import { redirect } from 'next/navigation';
import { Aviso, Tabela } from '@bossaos/ui';
import { formatarNumero, mensagensDe, type Idioma } from '@bossaos/i18n';
import { comIdentidade, flagsDaPlataforma, obterPrisma } from '@bossaos/db';
import { actorDoPedido } from '../../../../src/sessao.ts';
import { obterEnv } from '../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * PLAT-010 · "Lanzamientos controlados" (atlas p. 368)
 *
 * O catálogo de recursos e as flags de lançamento são **tabelas separadas**, e o
 * prompt do E05 pede exactamente isso. Respondem a perguntas diferentes: o
 * catálogo diz o que se vende, a flag diz o que existe. Um cliente pode ter
 * pago uma coisa que ainda não foi construída, e essas duas recusas têm de sair
 * com mensagens diferentes — senão manda-se alguém comprar o que já comprou.
 *
 * Desde esta etapa a flag aplica-se por **convenção de nome**: uma linha
 * chamada como a capacidade fecha-a em todo o lado. Antes disso era opcional e
 * ninguém a passava — a verificação existia e nunca disparava.
 */
export default async function Flags({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const m = mensagensDe(idioma);
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  const flags = await comIdentidade(prisma, actor.id, (db) => flagsDaPlataforma(db));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.plataforma.sobrancelhaFlags}</p>
          <h1>{m.plataforma.tituloFlags}</h1>
        </div>
        {/* Saiu: o aviso desta página diz, com este mesmo título, que a escrita
            é pelo script e que a edição chega na E33. */}
      </div>

      <Tabela
        legenda={m.plataforma.tituloFlags}
        colunas={[
          { chave: 'nome', rotulo: m.plataforma.colunaFuncao },
          { chave: 'ambiente', rotulo: m.plataforma.colunaAmbiente },
          { chave: 'alcance', rotulo: m.plataforma.colunaTenants },
          { chave: 'estado', rotulo: m.plataforma.colunaEstado },
        ]}
        linhas={flags.map((f) => ({
          id: `${f.nome}:${f.organizationId ?? 'global'}`,
          nome: f.nome,
          ambiente: f.organizationId ? m.plataforma.ambienteTenant : m.plataforma.ambienteGlobal,
          alcance: f.organizacao ?? m.plataforma.todosOsTenants,
          estado: f.ligada ? m.plataforma.flagLigada : m.plataforma.flagDesligada,
        }))}
        vazio={m.plataforma.semRegistos}
      />
      <p className="bo-planos__nota">
        {m.plataforma.registosMostrados.replace('{n}', formatarNumero(flags.length, idioma))}
      </p>
      <Aviso titulo={m.plataforma.accaoCriarFlag}>{m.plataforma.escritaPorScript}</Aviso>
    </div>
  );
}
