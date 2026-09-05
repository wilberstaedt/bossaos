import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { comPasso, lerPasso, unidadeDoEndereco } from '../../../../../../src/reserva/publica.ts';

export const dynamic = 'force-dynamic';

/**
 * RES-C-008 · «No hay mesa a esa hora» (atlas)
 *
 * ── O caso feio da régua, e o ecrã que ele merece ─────────────────────────
 *
 * «O ecrã oferece um horário que entretanto ficou ocupado, e o servidor recusa
 * com uma mensagem que serve à pessoa.»
 *
 * «Recusado» sozinho manda recomeçar, e recomeçar é onde a pessoa desiste. Por
 * isso esta tela mostra as **alternativas** que o servidor devolveu — e, quando
 * não há nenhuma, oferece a lista de espera em vez de um beco.
 */
export default async function SemDisponibilidade({
  params, searchParams,
}: {
  params: Promise<{ publicLocationSlug: string; locale: Idioma }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { publicLocationSlug, locale } = await params;
  const busca = (await searchParams) ?? {};
  const passo = lerPasso(busca);
  const p = mensagensDe(locale).reservaE19;
  await unidadeDoEndereco(publicLocationSlug);
  const base = `/r/${publicLocationSlug}/${locale}/reserve`;

  const alternativas = (typeof busca.alt === 'string' && busca.alt !== ''
    ? busca.alt.split(',') : []).filter((h) => /^\d{2}:\d{2}$/.test(h));

  return (
    <div className="bo-publico__conteudo">
      <h1 data-tela="RES-C-008">{p.semMesa}</h1>
      <p>{p.semMesaTexto}</p>

      {alternativas.length > 0 ? (
        <>
          <p data-teste="tem-alternativas">{p.alternativas}</p>
          <ul className="bo-lista-horas">
            {alternativas.map((hora) => (
              <li key={hora}>
                <a className="bo-botao bo-botao--secundario"
                   href={comPasso(`${base}/dados`, { ...passo, hora })}>{hora}</a>
              </li>
            ))}
          </ul>
        </>
      ) : <p data-teste="sem-alternativas">{p.semAlternativas}</p>}

      {/* Nunca um beco: quem não consegue hora nenhuma tem para onde ir. */}
      <a className="bo-botao" data-teste="ir-para-espera"
         href={comPasso(`${base}/espera`, passo)}>{p.entrarEspera}</a>
    </div>
  );
}
