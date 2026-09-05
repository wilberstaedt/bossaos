import { Aviso, Botao, Campo, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { conectorDaUnidade } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INT-004 · «Mensajería del restaurante» (atlas)
 *
 * ── Desligado, e VISÍVEL como desligado ───────────────────────────────────
 *
 * «Sem provedor configurado, o conector fica desligado e visível como desligado —
 * não a fingir que enviou.»
 *
 * O estado está no ecrã com palavras, e a frase por baixo diz a consequência:
 * nada é enviado, e **nenhuma mensagem aparecerá como enviada**. Uma integração
 * que se apresenta como pronta e não entrega é pior do que não existir: ninguém
 * vai procurar o problema onde ele está.
 *
 * E ligar sem provedor não passa — a base tem um `CHECK`, e a tela não oferece
 * esse caminho.
 */
export default async function Mensageria({
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
  const conector = await comEscopoDoPedido(sessao, (db) => conectorDaUnidade(db, unidade.id));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="INT-004">{g.conector}</h1>
        </div>
        <Etiqueta tom={conector.activo ? 'sucesso' : 'neutro'}>
          {conector.activo ? g.ligado : g.desligado}
        </Etiqueta>
      </div>

      {!conector.activo ? (
        <Aviso tom="aviso" titulo={g.conector}>
          <p data-teste="estado-conector">{g.semProvedor}</p>
          {/* A consequência, por palavras. */}
          <p data-teste="conector-ajuda">{g.conectorAjuda}</p>
        </Aviso>
      ) : (
        <p data-teste="estado-conector">{conector.provedor}</p>
      )}

      {busca.erro === 'SEM_PROVEDOR' ? <p data-teste="erro">{g.semProvedor}</p> : null}

      <form method="post" action={`/api/org/${orgSlug}/reservas`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <input type="hidden" name="accao" value="guardar_conector" />
        <Campo rotulo={g.provedor} name="provedor" type="text"
               defaultValue={conector.provedor ?? ''} />
        <label className="bo-campo">
          <input type="checkbox" name="activo" value="1" data-teste="activo"
                 defaultChecked={conector.activo} />
          <span>{g.activar}</span>
        </label>
        <Botao type="submit">{g.guardar}</Botao>
      </form>
    </div>
  );
}
