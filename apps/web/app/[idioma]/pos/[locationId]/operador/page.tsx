import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarTpv } from '../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-001 · «Entra en tu caja» (atlas)
 *
 * Quem está nesta caixa não é uma escolha do ecrã: é quem entrou. Um TPV que
 * deixa escolher o operador numa lista é um TPV onde o rasto do dinheiro aponta
 * para quem calhou estar no topo.
 */
export default async function OperadorDoTpv({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string }> }) {
  const { idioma, locationId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { unidade, actor } = await carregarTpv(idioma, locationId);

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="POS-001">{t.operador}</h1>
        </div>
      </div>
      <p>{t.quemEsta}</p>
      <p data-teste="operador-nome">{actor.nome ?? actor.email}</p>
      <a className="bo-botao bo-botao--fantasma" data-seccao="tpv" href={`/${idioma}/pos/${locationId}`}>{t.voltar}</a>
    </div>
  );
}
