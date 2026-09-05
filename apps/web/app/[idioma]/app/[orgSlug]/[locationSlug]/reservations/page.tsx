import { Aviso, Botao, Etiqueta, Tabela } from '@bossaos/ui';
import { formatarHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { agendaDoDia, atrasadas } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../src/reservas/pagina.ts';
import { EstruturaDoHost } from '../../../../../../src/reservas/EstruturaDoHost.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-001 · «Reservas de hoy» (atlas p. 137)
 *
 * ── As atrasadas são DITAS, e não varridas ────────────────────────────────
 *
 * «Libertar uma reserva atrasada é política e acção do host, nunca uma limpeza
 * automática silenciosa.» O aviso no topo diz quem passou da tolerância — e diz,
 * por palavras, que o sistema não libertou nenhuma.
 *
 * Sem essa frase, um host razoável assume que o sistema já tratou do assunto. É
 * a diferença entre informar e decidir por ele.
 */
export default async function AgendaDoDia({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const h = m.hostE19;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);
  const dia = typeof busca.dia === 'string' ? new Date(`${busca.dia}T00:00:00Z`) : new Date();
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/reservations`;

  const { agenda, tarde } = await comEscopoDoPedido(sessao, async (db) => ({
    agenda: await agendaDoDia(db, unidade.id, dia),
    tarde: await atrasadas(db, unidade.id),
  }));

  return (
    <EstruturaDoHost idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
      unidade={unidade.nome} tela="RES-B-001" titulo={h.agenda} activa=""
      accao={<a className="bo-botao" href={`${base}/nova`}>{h.nova}</a>}>

      {tarde.length > 0 ? (
        <Aviso tom="aviso" titulo={h.atrasadas}>
          <p data-teste="atrasadas">{tarde.map((r) => r.nome).join(', ')}</p>
          {/* A frase que impede o host de assumir que o sistema já tratou disto. */}
          <p data-teste="atrasadas-ajuda">{h.atrasadasAjuda}</p>
        </Aviso>
      ) : null}

      <Tabela
        legenda={h.agenda}
        vazio={<p data-teste="sem-reservas">{h.semReservas}</p>}
        colunas={[
          { chave: 'hora', rotulo: h.hora },
          { chave: 'nome', rotulo: h.nome },
          { chave: 'pessoas', rotulo: h.pessoas, numero: true },
          { chave: 'mesas', rotulo: h.mesas },
          { chave: 'estado', rotulo: h.estado },
          { chave: 'accoes', rotulo: h.detalhe },
        ]}
        linhas={agenda.map((r) => ({
          id: r.id, hora: formatarHora(r.inicio, idioma), nome: r.nome,
          pessoas: String(r.pessoas), mesas: r.mesas.map((x) => x.codigo).join(' + ') || '—',
          estado: r.estado, accoes: '',
        }))}
        celula={(linha, coluna) => (
          coluna.chave === 'estado' ? <Etiqueta tom={linha.estado === 'CANCELADA' ? 'perigo' : 'neutro'}>{linha.estado}</Etiqueta>
          : coluna.chave === 'accoes' ? (
            <a className="bo-botao bo-botao--secundario" href={`${base}/${linha.id}`}>{h.detalhe}</a>
          ) : linha[coluna.chave])}
      />
      <Botao tom="fantasma" densidade="operacao">{h.verDia}</Botao>
    </EstruturaDoHost>
  );
}
