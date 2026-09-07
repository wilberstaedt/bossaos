import { CabecalhoDePagina } from '@bossaos/ui';
import { type Idioma } from '@bossaos/i18n';
import { carregarVisita, chamadasDaVisitaActual } from '../../../../../../src/visitante/carregar-visita.ts';
import {
  ChamadasDaMesa, RespostaDaChamada,
} from '../../../../../../src/visitante/ChamadasDaMesa.tsx';
import { NavegacaoDaVisita, textosDoVisitante } from '../../../../../../src/visitante/PecasDoVisitante.tsx';

export const dynamic = 'force-dynamic';

/**
 * MENU-012 · «¿Cómo podemos ayudarte?» (atlas p. 92)
 *
 * ── O aviso vai para o ECRÃ de quem serve, e não para um apito ────────────
 *
 * «Nenhuma informação pode existir só como um apito» — é a regra do
 * `kds-e-tempo-real.md`, e vale igual do lado do cliente: se a única forma de
 * saber que a mesa 5 chamou fosse uma notificação que já passou, o pedido de
 * ajuda perdia-se sem deixar rasto e a pessoa acabava por levantar a mão na
 * mesma.
 *
 * O que este botão faz é marcar o sinal de vida da visita, que o QR-006 lê. A
 * fila de avisos por estação é do E16 e deriva do estado — não há aqui uma tabela
 * de avisos nova, porque uma tabela de avisos precisa de alguém a apagá-los e o
 * dia em que a escrita falha o ecrã fica calmo sobre uma sala em pânico.
 */
export default async function ComoPodemosAjudar({
  params, searchParams,
}: {
  params: Promise<{ publicLocationSlug: string; locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { publicLocationSlug, locale } = await params;
  const busca = (await searchParams) ?? {};
  const idioma = locale as Idioma;
  const s = textosDoVisitante(idioma);
  const visitante = await carregarVisita(publicLocationSlug, locale);
  const chamadas = await chamadasDaVisitaActual();
  const base = `/r/${publicLocationSlug}/${locale}`;

  return (
    <div className="bo-pagina">
      <CabecalhoDePagina sobrancelha={`${s.naMesa} ${visitante.mesaCodigo}`}
                         titulo={s.comoAjudamos} tela="MENU-012" />
      <NavegacaoDaVisita idioma={idioma} base={base} actual="/ajuda" />

      {/* As três respostas, distinguidas. É o que faz alguém parar de carregar. */}
      <RespostaDaChamada
        avisado={typeof busca.avisado === 'string' ? busca.avisado : null} s={s} />

      <p className="bo-campo__ajuda">{s.chamarAjuda}</p>

      <ChamadasDaMesa chamadas={chamadas.filter((c) => c.tipo === 'AJUDA')}
                      idioma={idioma} s={s} />

      <form method="post" action={`/r/${publicLocationSlug}/api/mesa`} data-teste="chamar">
        <input type="hidden" name="slug" value={publicLocationSlug} />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="accao" value="chamar" />
        <div className="bo-estado__accoes">
          <button className="bo-botao bo-botao--primario" type="submit">{s.chamarEquipa}</button>
        </div>
      </form>
    </div>
  );
}
