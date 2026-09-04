import { notFound } from 'next/navigation';
import { eIdioma, mensagensDe, type Idioma } from '@bossaos/i18n';
import { OQueEsteAparelhoTem } from '../../../../src/staff/OQueEsteAparelhoTem.tsx';

export const dynamic = 'force-static';

/**
 * A casca de «sem rede» do Staff PWA — e o que o *service worker* guarda.
 *
 * ── É estática, e é por isso que se pode guardar ─────────────────────────
 *
 * Não recebe unidade, não abre sessão, não toca na base. Guardar uma página com
 * dados de inquilino num tablet **partilhado** era servir a mesa do turno da
 * tarde ao turno da noite — a regra 3 do contrato quebrada por uma cache, sem
 * sessão nenhuma pelo meio e sem deixar rasto.
 *
 * O que ela mostra vem do **próprio aparelho**: quantos comandos estão aqui por
 * enviar. É um número, nunca conteúdo — a mesma linha que o E13 traçou no ecrã
 * de revogar, e pela mesma razão.
 *
 * ── E o endereço é `/staff/offline`, o que fecha `offline` como id ───────
 *
 * Um segmento fixo ganha ao `[locationId]` no encaminhamento. Os identificadores
 * de unidade são UUID, portanto nenhum é a palavra `offline` — mas fica escrito,
 * porque a alternativa é alguém descobrir isto por um 404 que não se explica.
 */
export default async function CascaSemRede({
  params,
}: {
  params: Promise<{ idioma: string }>;
}) {
  const { idioma } = await params;
  if (!eIdioma(idioma)) notFound();
  const s = mensagensDe(idioma as Idioma).staffE15;

  return (
    <div className="bo-pagina bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{s.nomeDaApp}</p>
          <h1 data-tela="STATE-004">{s.semLigacao}</h1>
        </div>
      </div>
      <p>{s.semLigacaoAjuda}</p>
      <OQueEsteAparelhoTem
        m={{ porEnviarNoAparelho: s.porEnviarNoAparelho, ligacaoAjuda: s.ligacaoAjuda }}
      />
    </div>
  );
}
