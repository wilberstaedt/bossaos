import { Tabela } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { agendaDoDia } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';
import { EstruturaDoHost } from '../../../../../../../src/reservas/EstruturaDoHost.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-002 · «Calendario de reservas» (atlas p. 138)
 *
 * Sete dias a partir de hoje, com quantas reservas e quanta gente. É a vista de
 * quem planeia a semana — o dia em si abre-se na agenda, que é a de quem serve.
 */
export default async function Calendario({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const h = mensagensDe(idioma).hostE19;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/reservations`;

  const hoje = new Date();
  const dias = await comEscopoDoPedido(sessao, async (db) => {
    const saida: { id: string; dia: string; reservas: string; pessoas: string }[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(Date.UTC(
        hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() + i));
      const agenda = (await agendaDoDia(db, unidade.id, d)).filter((r) => r.estado !== 'CANCELADA');
      saida.push({
        id: d.toISOString().slice(0, 10), dia: d.toISOString().slice(0, 10),
        reservas: String(agenda.length),
        pessoas: String(agenda.reduce((t, r) => t + r.pessoas, 0)),
      });
    }
    return saida;
  });

  return (
    <EstruturaDoHost idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
      unidade={unidade.nome} tela="RES-B-002" titulo={h.calendario} activa="/calendario">
      <Tabela
        legenda={h.calendario}
        vazio={<p>{h.semReservas}</p>}
        colunas={[
          { chave: 'dia', rotulo: h.dia },
          { chave: 'reservas', rotulo: h.agenda, numero: true },
          { chave: 'pessoas', rotulo: h.pessoas, numero: true },
          { chave: 'accoes', rotulo: h.verDia },
        ]}
        linhas={dias.map((d) => ({ ...d, accoes: '' }))}
        celula={(linha, coluna) => (coluna.chave !== 'accoes' ? linha[coluna.chave] : (
          <a className="bo-botao bo-botao--secundario" href={`${base}?dia=${linha.dia}`}>{h.verDia}</a>
        ))}
      />
    </EstruturaDoHost>
  );
}
