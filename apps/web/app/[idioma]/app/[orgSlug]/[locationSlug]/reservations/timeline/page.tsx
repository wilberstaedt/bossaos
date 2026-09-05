import { Tabela } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { chegadasPorHora } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';
import { EstruturaDoHost } from '../../../../../../../src/reservas/EstruturaDoHost.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-003 · «La ocupación por hora» (atlas p. 139)
 *
 * ── A definição está AO LADO do número ────────────────────────────────────
 *
 * A régua é explícita: «um número sem definição não é comparável». Uma reserva
 * das 20h que dura 90 minutos toca as 20h e as 21h — contá-la nas duas dá uma
 * ocupação com mais gente do que existe na sala.
 *
 * Este número conta **chegadas**: os comensais das reservas que COMEÇAM naquela
 * hora. É uma escolha, é defensável, e está escrita no ecrã para quem a usar
 * poder reproduzi-la. Não peço que seja a definição certa — essa é do negócio —
 * peço que esteja lá.
 */
export default async function Timeline({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const busca = (await searchParams) ?? {};
  const h = mensagensDe(idioma).hostE19;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);
  const dia = typeof busca.dia === 'string' ? new Date(`${busca.dia}T00:00:00Z`) : new Date();

  const horas = await comEscopoDoPedido(sessao, (db) => chegadasPorHora(db, unidade.id, dia));

  return (
    <EstruturaDoHost idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
      unidade={unidade.nome} tela="RES-B-003" titulo={h.timeline} activa="/timeline">
      {/* A definição, antes do número. */}
      <p className="bo-campo__ajuda" data-teste="definicao">{h.definicaoChegadas}</p>
      <Tabela
        legenda={h.timeline}
        vazio={<p data-teste="sem-reservas">{h.semReservas}</p>}
        colunas={[
          { chave: 'hora', rotulo: h.hora },
          { chave: 'reservas', rotulo: h.agenda, numero: true },
          { chave: 'pessoas', rotulo: h.pessoas, numero: true },
        ]}
        linhas={horas.map((x) => ({
          id: String(x.hora), hora: `${String(x.hora).padStart(2, '0')}:00`,
          reservas: String(x.reservas), pessoas: String(x.pessoas),
        }))}
      />
    </EstruturaDoHost>
  );
}
