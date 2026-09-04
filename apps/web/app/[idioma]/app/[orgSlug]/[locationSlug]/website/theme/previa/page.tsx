import { notFound, redirect } from 'next/navigation';
import { Aviso } from '@bossaos/ui';
import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarUnidades, rascunhoDoTema, temaActivo } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../../src/sessao.ts';
import { PreviaDoTema } from '../../../../../../../../src/componentes/PreviaDoTema.tsx';

export const dynamic = 'force-dynamic';

/**
 * THEME-003 · «Mira el tema antes de publicar» (atlas p. 381)
 *
 * ── Duas larguras, uma carta ──────────────────────────────────────────────
 *
 * *«Crie editor e previews mobile/desktop sobre a mesma carta»* (E12, entregar
 * 2). **A mesma** — duas cartas diferentes deixavam de ser uma prévia e passavam
 * a ser duas ilustrações que por acaso se parecem.
 *
 * O móvel é 360 px porque é a largura mais estreita que a inspecção mede, e é
 * onde uma cor de fundo escura com texto claro se paga: no telemóvel de alguém a
 * ler à luz do sol, apontado a um código impresso na mesa.
 *
 * ── E diz o que está a ver ────────────────────────────────────────────────
 *
 * Se houver rascunho, isto mostra o RASCUNHO — e diz que ninguém mais o vê. Sem
 * rascunho, mostra o que está no ar. A régua reprova «verde sobre tema por
 * omissão»: uma prévia que não diz qual dos dois está a desenhar deixa quem olha
 * a concluir o que lhe apetecer.
 */
export default async function PreviaDoTemaDaUnidade({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const t = m.temaE12;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const unidades = await listarUnidades(db);
    return {
      unidade: unidades.find((u) => u.slug === locationSlug) ?? null,
      rascunho: await rascunhoDoTema(db, sessao.contexto.organizationId),
      activo: await temaActivo(db, sessao.contexto.organizationId),
    };
  });
  if (!dados.unidade) notFound();

  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/website/theme`;
  const tema = {
    primaria: dados.rascunho.primaria,
    acento: dados.rascunho.acento,
    fundo: dados.rascunho.fundo,
  };

  // ── A moeda da unidade, e o que acontece quando não há ────────────────
  //
  // `locations.moeda` é anulável e o esquema diz porquê: *«uma unidade sem moeda
  // não é AUD»*. Escrever `?? 'EUR'` aqui era inventar a moeda de um restaurante
  // para uma prévia ficar bonita — a mesma regra dos alergénios e do DNS, e a
  // mesma que a prova de jornada apanhou quando a publicação dizia «sem preço» a
  // uma unidade que na verdade não tinha moeda.
  //
  // Sem moeda, os pratos aparecem sem preço. A prévia é de CORES; o preço está
  // aqui só para haver um número alinhado à direita a ganhar contraste.
  const moeda = dados.unidade.moeda;
  const amostra = (montanteMenor: number) =>
    moeda ? formatarDinheiro({ montanteMenor, moeda }, idioma) : m.publicoE09.semPreco;
  const pratos = [
    { nome: 'Croquetas caseras', preco: amostra(850) },
    { nome: 'Pulpo a la gallega', preco: amostra(1890) },
    { nome: 'Café', preco: amostra(150) },
  ];

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{t.sobrancelha}</p>
          <h1>{t.previaTitulo}</h1>
        </div>
        <div className="bo-estado__accoes">
          <a className="bo-botao bo-botao--secundario" href={`${base}/editar`}>{t.editarAccao}</a>
          <a className="bo-botao bo-botao--primario" href={`${base}/publicar`}>{t.publicarAccao}</a>
        </div>
      </div>

      <Aviso titulo={m.comum.datosDemostracion}>
        {dados.rascunho.origem === 'RASCUNHO' ? t.previaAviso : t.semAlteracoes}
      </Aviso>

      {dados.unidade.publicSlug ? (
        <p>
          <a href={`/r/${dados.unidade.publicSlug}/${idioma}/menu`}>{t.verPublico}</a>
          {' · '}
          {/* Diz-se qual é o tema NO AR, porque a prévia mostra o rascunho e as
              duas coisas divergem exactamente quando isto interessa. */}
          {t.origemPublicado}: {dados.activo.padrao ? t.origemPadrao : dados.activo.primaria}
        </p>
      ) : (
        <p className="bo-campo__ajuda">{t.previaSemPublico}</p>
      )}

      <div className="bo-previas">
        <section aria-labelledby="movel">
          <h2 id="movel">{t.previaMovel}</h2>
          <PreviaDoTema
            tema={tema} unidade={dados.unidade.nome} marca={t.sobrancelha}
            pratos={pratos} verCarta={m.tema.verCarta} largura="movel"
          />
        </section>
        <section aria-labelledby="escritorio">
          <h2 id="escritorio">{t.previaEscritorio}</h2>
          <PreviaDoTema
            tema={tema} unidade={dados.unidade.nome} marca={t.sobrancelha}
            pratos={pratos} verCarta={m.tema.verCarta} largura="escritorio"
          />
        </section>
      </div>
    </div>
  );
}
