import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { horariosPublicos } from '@bossaos/db';
import { obterBase } from '../../../../../../src/servidor.ts';
import { comPasso, lerPasso, unidadeDoEndereco } from '../../../../../../src/reserva/publica.ts';

export const dynamic = 'force-dynamic';

/**
 * RES-C-002 · «Elige tu hora» (atlas)
 *
 * ── A palavra «orientativos» está no ECRÃ, e não num atributo ─────────────
 *
 * «Disponibilidade da tela nunca substitui verificação de servidor.» Estas horas
 * podem estar erradas no instante em que são lidas — alguém pode ficar com a
 * última mesa entre esta página e o toque no botão.
 *
 * A régua é explícita sobre onde a incerteza tem de estar: no texto que a pessoa
 * lê. Um `data-informativo=true` por cima de uma lista que parece garantida não
 * informa ninguém.
 */
export default async function HorariosDisponiveis({
  params, searchParams,
}: {
  params: Promise<{ publicLocationSlug: string; locale: Idioma }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { publicLocationSlug, locale } = await params;
  const passo = lerPasso((await searchParams) ?? {});
  const p = mensagensDe(locale).reservaE19;
  const unidade = await unidadeDoEndereco(publicLocationSlug);
  const base = `/r/${publicLocationSlug}/${locale}/reserve`;

  const horas = unidade.reservasActivas
    ? await horariosPublicos(obterBase(), unidade, new Date(`${passo.dia}T00:00:00Z`), passo.pessoas)
    : [];
  const livres = horas.filter((h) => h.cabe);

  return (
    <div className="bo-publico__conteudo">
      <h1 data-tela="RES-C-002">{p.hora}</h1>
      {/* A incerteza, por palavras, antes da lista. */}
      <p data-teste="aviso-informativo">{p.horaAjuda}</p>

      {livres.length === 0 ? (
        <p data-teste="sem-horas">{p.semHoras}</p>
      ) : (
        <ul className="bo-lista-horas">
          {livres.map((h) => {
            const hora = h.quando.toISOString().slice(11, 16);
            return (
              <li key={hora}>
                <a className="bo-botao bo-botao--secundario"
                   href={comPasso(`${base}/dados`, { ...passo, hora })}>{hora}</a>
              </li>
            );
          })}
        </ul>
      )}
      <a className="bo-botao bo-botao--secundario" href={comPasso(`${base}/inicio`, passo)}>{p.voltar}</a>
    </div>
  );
}
