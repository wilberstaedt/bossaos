import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo } from '@bossaos/ui';
import { carregarEquipa } from '../../../../../../../src/ponto/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * HR-003 · «Funciones del equipo» (atlas)
 *
 * Estas funções são de ESCALA — cozinha, sala, barra. Quem pode o quê continua
 * a ser a autorização do E04, e misturar as duas coisas seria dar permissões a
 * quem só precisa de aparecer no mapa da semana.
 */
export default async function Funcoes({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).pontoE28;
  const { unidade, funcoes } = await carregarEquipa(idioma, orgSlug, locationSlug);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="HR-003">{t.funcoes}</h1>
        </div>
      </div>
      <p data-teste="quantas-funcoes">{funcoes.length}</p>
      {funcoes.length === 0 ? <p data-teste="sem-funcoes">{t.semFuncoes}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="funcoes">
          {funcoes.map((f) => (
            <li key={f.id}><span data-teste="nome">{f.nome}</span></li>
          ))}
        </ul>
      )}
      <form method="post" action={`/api/org/${orgSlug}/ponto`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="criar_funcao" />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Campo rotulo={t.nome} name="nome" required maxLength={60} />
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}
