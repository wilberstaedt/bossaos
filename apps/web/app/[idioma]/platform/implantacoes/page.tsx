import { redirect } from 'next/navigation';
import { Botao, Cartao, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import {
  comIdentidade, implantacoes, obterPrisma, organizacaoDaPlataforma, organizacoesDaPlataforma,
} from '@bossaos/db';
import { actorDoPedido } from '../../../../src/sessao.ts';
import { obterEnv } from '../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * PLAT-006 · "Implantaciones en curso" (atlas p. 364)
 *
 * ── A fase é derivada, não guardada ─────────────────────────────────────────
 *
 * Não há coluna de "estado de onboarding" no modelo, e criar uma agora abriria
 * um segundo sítio onde a verdade vive: a coluna diria "concluído" e a
 * organização não teria uma unidade. A fase sai do que existe — sem plano é
 * preparação, com plano e sem unidade é catálogo, com as duas é piloto.
 *
 * ── Um dos dois itens da checklist não se mede, e diz-se ────────────────────
 *
 * O atlas mostra "Catálogo revisado" e "Equipo invitado". O segundo conta-se: há
 * filiações activas ou não. **O primeiro não existe** — o catálogo de produtos é
 * de uma etapa que ainda não chegou. Um visto verde ao lado de "Catálogo
 * revisado" seria a coisa mais fácil de desenhar e a mais fácil de acreditar.
 */
export default async function ImplantacoesEmCurso({
  params,
}: {
  params: Promise<{ idioma: Idioma }>;
}) {
  const { idioma } = await params;
  const m = mensagensDe(idioma);
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  const lista = await comIdentidade(prisma, actor.id, async (db) => {
    const orgs = await organizacoesDaPlataforma(db);
    // Os utilizadores por organização não vêm da lista — vêm do detalhe, que é
    // a função que os conta. Estimá-los aqui seria inventar.
    const pares = await Promise.all(
      orgs.map(async (o) => [o.id, (await organizacaoDaPlataforma(db, o.id))?.utilizadores ?? 0] as const),
    );
    return implantacoes(orgs, new Map(pares));
  });

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{m.plataforma.sobrancelhaImplantacoes}</p>
          <h1>{m.plataforma.tituloImplantacoes}</h1>
        </div>
        <Botao>{m.plataforma.accaoChecklist}</Botao>
      </div>

      <div className="bo-planos">
        {lista.map((i) => (
          <Cartao key={i.organizacao.id} className="bo-planos__cartao">
            <p className="bo-planos__destaque">
              <Etiqueta tom={i.fase === 'PILOTO' ? 'sucesso' : 'neutro'}>
                {(m.plataforma as unknown as Record<string, string>)[`fase${i.fase}`] ?? i.fase}
              </Etiqueta>
            </p>
            <h2 className="bo-planos__nome">{i.organizacao.nome}</h2>

            <Cartao variante="suave">
              <p className="bo-tema__rotulo">{m.plataforma.catalogoRevisto}</p>
              {/* Sem visto: não há catálogo de produtos para rever ainda. */}
              <p className="bo-uso__nota bo-uso__valor--ausente">{m.uso.aindaNaoMedido}</p>
            </Cartao>

            <Cartao variante="suave">
              <p className="bo-tema__rotulo">{m.plataforma.equipaConvidada}</p>
              <p className="bo-uso__nota">
                {i.equipaConvidada ? m.plataforma.incluida : m.plataforma.pendentes}
              </p>
            </Cartao>

            <a className="bo-botao bo-botao--primario" href={`/${idioma}/platform/${i.organizacao.id}`}>
              {m.plataforma.abrirDetalhe}
            </a>
          </Cartao>
        ))}
      </div>
    </div>
  );
}
