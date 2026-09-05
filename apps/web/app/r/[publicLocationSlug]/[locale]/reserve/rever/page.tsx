import { Botao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { lerPasso, unidadeDoEndereco } from '../../../../../../src/reserva/publica.ts';

export const dynamic = 'force-dynamic';

/**
 * RES-C-005 · «Revisa tu reserva» (atlas)
 *
 * O último ecrã antes da escrita, e o único `POST` do fluxo. A chave idempotente
 * nasce **aqui**, no HTML, e não no servidor: se nascesse no manipulador, dois
 * toques no botão seriam duas chaves e duas reservas — que é exactamente o
 * defeito que ela existe para impedir.
 */
export default async function RevisarReserva({
  params, searchParams,
}: {
  params: Promise<{ publicLocationSlug: string; locale: Idioma }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { publicLocationSlug, locale } = await params;
  const busca = (await searchParams) ?? {};
  const passo = lerPasso(busca);
  const p = mensagensDe(locale).reservaE19;
  const unidade = await unidadeDoEndereco(publicLocationSlug);

  // Determinística a partir do que o utilizador escolheu: o mesmo formulário
  // submetido duas vezes traz a mesma chave, e a segunda devolve a primeira
  // reserva em vez de criar outra.
  const chave = [publicLocationSlug, passo.dia, passo.hora ?? '', passo.pessoas,
    passo.contacto ?? ''].join('|');

  return (
    <div className="bo-publico__conteudo">
      <h1 data-tela="RES-C-005">{p.rever}</h1>
      <dl className="bo-estado__factos">
        <dt>{p.pessoas}</dt><dd data-teste="rever-pessoas">{passo.pessoas}</dd>
        <dt>{p.dia}</dt><dd data-teste="rever-dia">{passo.dia}</dd>
        <dt>{p.hora}</dt><dd data-teste="rever-hora">{passo.hora ?? '—'}</dd>
        <dt>{p.nome}</dt><dd data-teste="rever-nome">{passo.nome ?? '—'}</dd>
        <dt>{p.contacto}</dt><dd>{passo.contacto ?? '—'}</dd>
      </dl>
      <form method="post" action="/api/publico/reservar" className="bo-forma">
        <input type="hidden" name="slug" value={publicLocationSlug} />
        <input type="hidden" name="idioma" value={locale} />
        <input type="hidden" name="pessoas" value={String(passo.pessoas)} />
        <input type="hidden" name="dia" value={passo.dia} />
        <input type="hidden" name="hora" value={passo.hora ?? ''} />
        <input type="hidden" name="nome" value={passo.nome ?? ''} />
        <input type="hidden" name="contacto" value={passo.contacto ?? ''} />
        <input type="hidden" name="notas" value={passo.notas ?? ''} />
        <input type="hidden" name="marketing" value={passo.marketing ?? ''} />
        <input type="hidden" name="chave" value={chave} />
        <Botao type="submit" data-teste="confirmar">{p.confirmar}</Botao>
      </form>
      <p className="bo-campo__ajuda">{unidade.nome}</p>
    </div>
  );
}
