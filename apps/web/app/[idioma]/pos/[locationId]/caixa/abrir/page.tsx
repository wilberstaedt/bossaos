import { Botao, Campo } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarTpv } from '../../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-015 · «Abre tu caja» (atlas)
 *
 * Abrir é o primeiro acontecimento do rasto, e o rasto não é um efeito
 * secundário da abertura: é onde o estado vive. Não há coluna «aberta» para
 * alguém pôr a verdadeiro sem ficar registo de quem abriu.
 */
export default async function AbrirCaixa({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string }> }) {
  const { idioma, locationId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { unidade, orgSlug, actor } = await carregarTpv(idioma, locationId);

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="POS-015">{t.abrirCaixa}</h1>
        </div>
      </div>
      <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
                <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="abrir_caixa" />
        <input type="hidden" name="locationId" value={unidade.id} />
        <Campo rotulo={t.caixa} name="nome" required maxLength={60}  />
        <Campo rotulo={t.fundo} name="fundo" type="text" inputMode="decimal" required  />
        <Botao type="submit">{t.abrirCaixa}</Botao>
      </form>
      <p data-teste="operador-nome">{actor.nome ?? actor.email}</p>
      <p data-teste="so-dinheiro">{t.apenasDinheiro}</p>
    </div>
  );
}
