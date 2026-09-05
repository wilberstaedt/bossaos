import { mensagensDe, formatarData, type Idioma } from '@bossaos/i18n';
import { reservaPorSegredo } from '@bossaos/db';
import { obterBase } from '../../../../../../src/servidor.ts';
import { unidadeDoEndereco } from '../../../../../../src/reserva/publica.ts';

export const dynamic = 'force-dynamic';

/**
 * RES-C-007 · «Tu reserva» (atlas)
 *
 * ── A credencial é o SEGREDO, e o que a base guarda é o resumo ────────────
 *
 * O que viaja no endereço é o segredo; o que fica na base é o `sha256` dele. Uma
 * cópia de segurança lida por alguém não dá acesso a nada, e nem nós conseguimos
 * reemitir o link original.
 *
 * E é aqui que o token **não enumerável** paga: com um número sequencial, quem
 * tem o link da sua reserva tem o da reserva do vizinho.
 */
export default async function GerirReserva({
  params, searchParams,
}: {
  params: Promise<{ publicLocationSlug: string; locale: Idioma }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { publicLocationSlug, locale } = await params;
  const busca = (await searchParams) ?? {};
  const p = mensagensDe(locale).reservaE19;
  await unidadeDoEndereco(publicLocationSlug);
  const segredo = typeof busca.t === 'string' ? busca.t : '';
  const reserva = await reservaPorSegredo(obterBase(), publicLocationSlug, segredo);

  return (
    <div className="bo-publico__conteudo">
      <h1 data-tela="RES-C-007">{p.gerir}</h1>
      {!reserva ? <p data-teste="nao-encontrada">{p.naoEncontrada}</p> : (
        <>
          <dl className="bo-estado__factos">
            <dt>{p.nome}</dt><dd>{reserva.nome}</dd>
            <dt>{p.pessoas}</dt><dd>{reserva.pessoas}</dd>
            <dt>{p.dia}</dt><dd>{formatarData(reserva.inicio, locale)}</dd>
          </dl>
          <p data-teste="estado-da-reserva">{reserva.estado}</p>
        </>
      )}
    </div>
  );
}
