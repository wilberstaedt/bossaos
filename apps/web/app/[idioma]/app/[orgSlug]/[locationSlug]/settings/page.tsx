import { notFound, redirect } from 'next/navigation';
import { Aviso, Botao, Campo } from '@bossaos/ui';
import { formatarData, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarUnidades } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';
import { CampoPorEscolher } from '../../../../../../src/componentes/CampoPorEscolher.tsx';
import { fusos, MOEDAS } from '../../../../../../src/componentes/opcoes.ts';

export const dynamic = 'force-dynamic';

/**
 * SET-001 · "Preferencias del restaurante" (atlas p. 341)
 *
 * O atlas põe cinco campos: idioma, moeda, zona horaria, formato de fecha e
 * unidad. Quatro são desta tela; o **formato de data não é um campo**, e essa é
 * a única divergência que vale explicar.
 *
 * O formato sai do idioma, pelo `Intl` — `DD/MM/AAAA` em espanhol e português,
 * `MM/DD/YYYY` em inglês americano. Dar um selector separado cria dois sítios
 * onde a mesma decisão vive, e o dia em que discordarem é o dia em que uma
 * factura tem a data trocada. Mostra-se o formato **resultante**, com um exemplo
 * de hoje, para não ser magia.
 */
export default async function PreferenciasDaUnidade({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const { guardado } = await searchParams;
  const m = mensagensDe(idioma);
  const p = m.preferencias;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const unidade = await comEscopoDoPedido(sessao, async (db) => {
    const todas = await listarUnidades(db);
    const encontrada = todas.find((u) => u.slug === locationSlug);
    if (!encontrada) return null;
    return db.location.findFirst({
      where: { id: encontrada.id },
      select: { id: true, nome: true, moeda: true, fuso: true, localidade: true, contactoEmail: true },
    });
  });
  if (!unidade) notFound();

  return (
    <div className="bo-pagina">

      {/* As quatro do E33: a política de acesso é a que faz «visível ao
          inquilino» ser verdade, e por isso vem primeiro. */}
      <nav className="bo-lista bo-lista--blocos" aria-label={mensagensDe(idioma).plataformaE33.acesso}>
        <a className="bo-lista__ligacao" data-seccao="SET-010"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings/acesso`}>
          {mensagensDe(idioma).plataformaE33.acesso}
        </a>
        <a className="bo-lista__ligacao" data-seccao="SET-011"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings/auditoria`}>
          {mensagensDe(idioma).plataformaE33.auditoria}
        </a>
        <a className="bo-lista__ligacao" data-seccao="SET-013"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings/retencao`}>
          {mensagensDe(idioma).plataformaE33.retencao}
        </a>
        <a className="bo-lista__ligacao" data-seccao="SET-014"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings/flags`}>
          {mensagensDe(idioma).plataformaE33.flags}
        </a>
      </nav>
      <form method="post" action={`/api/org/${orgSlug}/unidades/${unidade.id}/preferencias`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationSlug" value={locationSlug} />

        <div className="bo-estado__cabecalho">
          <div>
            <p className="bo-estado__sobrancelha">{p.sobrancelha}</p>
            <h1>{p.titulo}</h1>
          </div>
          <Botao type="submit">{p.accao}</Botao>
        </div>

        {guardado ? <Aviso tom="sucesso" titulo={m.comum.guardado} /> : null}

        <div className="bo-forma__grelha">
          <Campo rotulo={p.unidade} defaultValue={unidade.nome} readOnly />
          <CampoPorEscolher rotulo={p.moeda} name="moeda" opcoes={MOEDAS}
                            valor={unidade.moeda} rotuloVazio={m.arranque.porEscolher}
                            ajuda={p.moedaNaoRetroactiva} />
          <CampoPorEscolher rotulo={p.fuso} name="fuso" opcoes={fusos()}
                            valor={unidade.fuso} rotuloVazio={m.arranque.porEscolher}
                            ajuda={p.fusoNaoReinterpreta} />
          <Campo rotulo={m.unidades.localidade} name="localidade" defaultValue={unidade.localidade ?? ''} />
          <Campo rotulo={m.unidades.contacto} name="contactoEmail" type="email"
                 defaultValue={unidade.contactoEmail ?? ''} />
          {/* Derivado, não escolhido: um só sítio onde a decisão vive. */}
          <Campo rotulo={p.formatoData} defaultValue={formatarData(new Date(), idioma)} readOnly
                 ajuda={p.formatoDerivado} />
        </div>

        <p className="bo-planos__nota">{m.arranque.guardadoNoAmbito}</p>
      </form>

      {/* ── As outras telas de configuração desta unidade ──────────────────
          Estavam todas sem entrada nenhuma: `servicos`, `pedidos` e `idiomas`
          respondiam ao endereço e não havia por onde lá chegar. Descobri-o ao
          acrescentar o SET-008 e ter de decidir onde o pendurar — uma tela que
          só responde a quem sabe o endereço de cor está tão morta como uma que
          não existe, com a diferença de que ninguém repara. */}
      {/* `data-seccao` e nao `data-tela` nas ligacoes: uma LIGACAO para uma
          pagina nao e a pagina, e o marcador que a prova usa para afirmar
          «cheguei ao SET-008» existia tambem aqui. */}
      <nav className="bo-publico__seccoes" aria-label={p.titulo} data-teste="mais-configuracao">
        <a href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings/servicos`}>
          {m.salaE13.tiposDeServico}
        </a>
        <a href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings/pedidos`}>{m.pedidosE14.regras}</a>
        <a href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings/idiomas`}>{p.tituloIdiomas}</a>
        <a href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings/avisos`} data-seccao="SET-008">
          {m.staffE15.quemRecebe}
        </a>
        <a href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings/estacoes`} data-seccao="SET-005">
          {m.kdsE16.cadaProdutoASuaEstacao}
        </a>
        <a href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings/ecras`} data-seccao="SET-006">
          {m.kdsE16.ajustarEcras}
        </a>
      </nav>
    </div>
  );
}
