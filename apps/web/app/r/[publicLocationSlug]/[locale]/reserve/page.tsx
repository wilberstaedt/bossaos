import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { unidadeDoEndereco } from '../../../../../src/reserva/publica.ts';

export const dynamic = 'force-dynamic';

/**
 * PUB-003 · «Reserva tu mesa» — a página do SITE (atlas)
 *
 * ── Porque é que esta e a RES-C-001 são duas ──────────────────────────────
 *
 * A matriz dá-lhes a mesma rota e o mesmo título, e a tentação é fundi-las. São
 * duas coisas: esta é a página para onde o **site público** aponta — a que
 * aparece no menu do restaurante, ao lado de «Carta» e «Contacto» — e a
 * RES-C-001 é o primeiro passo do fluxo.
 *
 * Fundi-las faria a ligação do site cair a meio de um formulário. Uma página que
 * diz o que é, e um botão que começa, é a diferença entre um sítio e um funil.
 */
export default async function PaginaReservar({
  params,
}: { params: Promise<{ publicLocationSlug: string; locale: Idioma }> }) {
  const { publicLocationSlug, locale } = await params;
  const m = mensagensDe(locale);
  const p = m.reservaE19;
  const unidade = await unidadeDoEndereco(publicLocationSlug);
  const base = `/r/${publicLocationSlug}/${locale}/reserve`;

  return (
    <div className="bo-publico__conteudo">
      <h1 data-tela="PUB-003">{p.titulo}</h1>
      <p>{p.sub.replace('{nome}', unidade.nome)}</p>
      {unidade.reservasActivas
        ? <a className="bo-botao" href={`${base}/inicio`}>{p.comecar}</a>
        : <p data-teste="desligado">{p.desligado}</p>}
    </div>
  );
}
