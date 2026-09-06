import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarDispositivos } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * KIOSK-008 · «Tus kiosks» (atlas p. 221)
 *
 * ── O que esta tela mostra, e o que deliberadamente não mostra ────────────
 *
 * Mostra os aparelhos e se têm sessão aberta. **Não mostra o que está no
 * carrinho de quem está a usar o kiosk agora.** Um gerente que consegue ver o
 * que a pessoa no corredor está a escolher é vigilância, não gestão — e a
 * pergunta que esta tela existe para responder é «o terminal está a funcionar?»,
 * não «o que é que aquela pessoa vai comer?».
 *
 * Por isso a coluna diz «sessão aberta» ou «sem sessão», e mais nada.
 */
export default async function KiosksDaUnidade({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const s = mensagensDe(idioma).kioskE31;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);

  const aparelhos = await comEscopoDoPedido(sessao,
    (db) => listarDispositivos(db, unidade.id));
  const sessoes = await comEscopoDoPedido(sessao, (db) =>
    db.kioskSession.findMany({
      where: { locationId: unidade.id, estado: 'ABERTA' },
      // Só o identificador e a hora. O `order_id` não entra na consulta, e por
      // isso o carrinho de quem está lá não chega a este ecrã — garantia por
      // AUSÊNCIA, e não por alguém se lembrar de não o mostrar.
      select: { id: true, deviceId: true, abertaEm: true },
    }));
  const abertaDe = new Map<string, Date>(
    sessoes.map((x: { deviceId: string; abertaEm: Date }) => [x.deviceId, x.abertaEm]));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="KIOSK-008">{s.kiosks}</h1>
        </div>
      </div>

      {aparelhos.length === 0 ? (
        <div data-teste="sem-kiosks">
          <Aviso tom="info" titulo={s.kiosks}>{s.kiosksVazio}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista" data-teste="kiosks">
          {aparelhos.map((d: { id: string; nome: string; estado: string }) => {
            const aberta = abertaDe.get(d.id);
            return (
              <li key={d.id} data-teste="kiosk">
                <a className="bo-lista__ligacao" data-seccao="KIOSK-001"
                   href={`/${idioma}/kiosk/${d.id}`}>
                  <span>{d.nome}</span>
                  {aberta
                    ? <Etiqueta tom="sucesso">{s.sessaoAberta}</Etiqueta>
                    : <Etiqueta tom="neutro">{s.semSessao}</Etiqueta>}
                </a>
                {aberta ? (
                  <p className="bo-campo__ajuda">
                    {s.desde} {formatarDataHora(aberta, idioma)}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
