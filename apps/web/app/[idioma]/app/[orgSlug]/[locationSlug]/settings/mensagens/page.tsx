import { Aviso, Tabela } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { conectorDaUnidade, listarTemplates } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * SET-009 · «Mensajes de servicio» (atlas)
 *
 * ── Porque é que isto e o RES-B-017 são duas telas ────────────────────────
 *
 * O RES-B-017 é de quem opera as reservas: abre-o para escrever a confirmação de
 * uma noite. Esta é a das definições da unidade — a lista do que existe, ao lado
 * das outras preferências, para quem está a configurar a casa e nunca abriu o
 * painel de reservas.
 *
 * A lista é a mesma porque a fonte é a mesma. Duas listas seriam dois sítios onde
 * a mesma pergunta pode ter respostas diferentes.
 */
export default async function TemplatesTransaccionais({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const g = m.mensagensE19;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);

  const { templates, conector } = await comEscopoDoPedido(sessao, async (db) => ({
    templates: await listarTemplates(db, unidade.id),
    conector: await conectorDaUnidade(db, unidade.id),
  }));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="SET-009">{g.templates}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings`}>{m.comum.voltar}</a>
      </div>

      {!conector.activo ? (
        <Aviso tom="aviso" titulo={g.conector}>
          <p data-teste="conector-desligado">{g.semProvedor}</p>
          <p>{g.conectorAjuda}</p>
        </Aviso>
      ) : null}

      <Tabela
        legenda={g.templates}
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
      <p className="bo-campo__ajuda">
        <a href={`/${idioma}/app/${orgSlug}/${locationSlug}/reservations/mensagens`}
           data-seccao="RES-B-017">{g.mensagens}</a>
      </p>
    </div>
  );
}
