import { Aviso, Botao, Campo, Tabela } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { conectorDaUnidade, listarTemplates } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';
import { EstruturaDoHost } from '../../../../../../../src/reservas/EstruturaDoHost.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-017 · «Mensajes de reservas» (atlas p. 153)
 *
 * ── O estado do conector aparece AQUI, e não só na integração ─────────────
 *
 * Quem escreve os textos é quem vai perguntar porque é que os clientes não os
 * recebem. Sem o aviso, escrevem-se cinco mensagens bonitas e ninguém descobre
 * que nada sai daqui até alguém reclamar ao telefone.
 */
export default async function TemplatesDeMensagens({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const g = m.mensagensE19;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);

  const { templates, conector } = await comEscopoDoPedido(sessao, async (db) => ({
    templates: await listarTemplates(db, unidade.id),
    conector: await conectorDaUnidade(db, unidade.id),
  }));

  return (
    <EstruturaDoHost idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
      unidade={unidade.nome} tela="RES-B-017" titulo={g.mensagens} activa="">
      {!conector.activo ? (
        <Aviso tom="aviso" titulo={g.conector}>
          <p data-teste="conector-desligado">{g.semProvedor}</p>
          <p>{g.conectorAjuda}</p>
        </Aviso>
      ) : null}
      {busca.guardado === '1' ? <Aviso tom="sucesso" titulo={g.mensagens}>{g.guardar}</Aviso> : null}

      <Tabela
        legenda={g.mensagens}
        vazio={<p data-teste="sem-templates">{g.semTemplates}</p>}
        colunas={[
          { chave: 'tipo', rotulo: g.tipo },
          { chave: 'idioma', rotulo: g.idioma },
          { chave: 'assunto', rotulo: g.assunto },
        ]}
        linhas={templates.map((t) => ({
          id: t.id, tipo: t.tipo, idioma: t.idioma, assunto: t.assunto,
        }))}
      />

      <form method="post" action={`/api/org/${orgSlug}/reservas`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <input type="hidden" name="accao" value="guardar_template" />
        <Campo rotulo={g.tipo} name="tipo" type="text" defaultValue="confirmacao" />
        <Campo rotulo={g.idioma} name="idiomaDoTemplate" type="text" defaultValue={idioma} />
        <Campo rotulo={g.assunto} name="assunto" type="text" defaultValue="" />
        <Campo rotulo={g.corpo} name="corpo" type="text" defaultValue="" />
        <Botao type="submit">{g.guardar}</Botao>
      </form>
    </EstruturaDoHost>
  );
}
