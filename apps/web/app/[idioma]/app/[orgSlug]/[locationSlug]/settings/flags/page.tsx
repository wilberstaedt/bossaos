import { Aviso, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * SET-014 · «Funciones en pruebas» (atlas p. 172)
 *
 * ── A casa vê o que está ligado para ela, e não pode ligá-lo ──────────────
 *
 * As flags são libertações controladas: uma casa que pudesse ligar as suas
 * próprias estaria a dar-se acesso a código que ainda não está pronto — e a
 * culpa do que corresse mal seria nossa na mesma.
 *
 * O E05 já tirou a escrita ao runtime. Esta tela mostra, e a coluna que importa
 * é a de **quem** — global ou só para esta casa —, porque uma flag global que
 * parece específica muda a conversa quando alguma coisa falha.
 */
export default async function FlagsDoInquilino({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const s = mensagensDe(idioma).plataformaE33;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);

  // A política do E05 deixa ver as globais e as desta casa, e mais nenhumas.
  const flags = await comEscopoDoPedido(sessao, (db) =>
    db.featureFlag.findMany({ orderBy: { nome: 'asc' } }));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="SET-014">{s.flags}</h1>
        </div>
      </div>

      {flags.length === 0 ? (
        <div data-teste="sem-flags">
          <Aviso tom="info" titulo={s.flags}>{s.semIncidentes}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="flags">
          {flags.map((f: {
            id: string; nome: string; ligada: boolean;
            organizationId: string | null; descricao: string | null;
          }) => (
            <li key={f.id} data-teste="flag">
              <span className="bo-identificador">{f.nome}</span>{' '}
              <Etiqueta tom={f.ligada ? 'sucesso' : 'neutro'}>
                {f.ligada ? s.segredoConfigurado : s.segredoEmFalta}
              </Etiqueta>
              <p className="bo-campo__ajuda" data-teste="alcance">
                {f.organizationId === null ? s.painel : unidade.nome}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
