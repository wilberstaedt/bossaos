import { Aviso } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { auditoriaDaCasa } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * SET-011 · «Registro de acciones» (atlas p. 169)
 *
 * ── A casa lê o registo dela, incluindo o que NÓS fizemos lá ──────────────
 *
 * As acções da plataforma aparecem nesta lista com o mesmo peso que as da casa —
 * e assinadas pela **pessoa**, não pelo papel. É por isso que existe um gatilho
 * a recusar `plataforma.%` assinado por «suporte»: sem ele, esta tela mostrava
 * uma palavra em vez de um nome, e a pergunta *quem fez isto* ficava sem
 * resposta seis meses depois.
 *
 * E o registo é **append-only**: a base recusa apagar. Nem nós, nem a casa.
 */
export default async function AuditoriaDaCasa({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const s = mensagensDe(idioma).plataformaE33;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const eventos = await comEscopoDoPedido(sessao,
    (db) => auditoriaDaCasa(db, sessao.contexto.organizationId));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="SET-011">{s.auditoria}</h1>
        </div>
      </div>

      <p className="bo-campo__ajuda" data-teste="papel-nao-e-pessoa">{s.papelNaoEPessoa}</p>

      {eventos.length === 0 ? (
        <div data-teste="sem-auditoria">
          <Aviso tom="info" titulo={s.auditoria}>{s.semAuditoria}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="eventos">
          {eventos.map((e: {
            id: string; accao: string; actorEmail: string | null;
            motivo: string | null; createdAt: Date;
          }) => (
            <li key={e.id} data-teste="evento">
              <span className="bo-identificador">{e.accao}</span>
              <p className="bo-campo__ajuda" data-teste="quem">
                {/* Sempre a pessoa. Quando falta, diz-se que falta. */}
                {e.actorEmail ?? '—'} · {formatarDataHora(e.createdAt, idioma)}
              </p>
              {e.motivo ? <p className="bo-campo__ajuda">{e.motivo}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
