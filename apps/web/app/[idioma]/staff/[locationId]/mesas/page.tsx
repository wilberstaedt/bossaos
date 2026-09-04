import { Etiqueta } from '@bossaos/ui';
import { salaAgora } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import { CabecalhoDoStaff, porChave, textosDoStaff } from '../../../../../src/staff/PecasDoStaff.tsx';

export const dynamic = 'force-dynamic';

/**
 * STAFF-003 · «Tus mesas» (atlas p. 162)
 *
 * ── Uma mesa por limpar NÃO é uma mesa livre ─────────────────────────────
 *
 * O estado da sessão vem por palavras, e `EM_LIMPEZA` aparece como o que é: a
 * mesa está vazia e continua ocupada. Pintar as duas de igual era o defeito que
 * o E13 fechou no modelo — sentar gente numa mesa por limpar — e trazê-lo de
 * volta no ecrã desfazia o trabalho todo.
 */
export default async function MesasDoStaff({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string }>;
}) {
  const { idioma, locationId } = await params;
  const s = textosDoStaff(idioma);
  const { sessao, unidade } = await carregarStaff(idioma, locationId);
  const mesas = await comEscopoDoPedido(sessao, (db) =>
    salaAgora(db, unidade.id, sessao.contexto.organizationId));
  const base = `/${idioma}/staff/${locationId}`;

  return (
    <div className="bo-pagina">
      <CabecalhoDoStaff idioma={idioma} locationId={locationId} unidade={unidade.nome}
                        titulo={s.mesas} tela="STAFF-003" actual="/mesas" />

      <div className="bo-estado__accoes">
        <a className="bo-botao bo-botao--primario" href={`${base}/mesas/nova`}>{s.novaMesa}</a>
      </div>

      {mesas.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-mesas">{s.semMesas}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="mesas">
          {mesas.map((mesa) => (
            <li key={mesa.id} className="bo-publico__produto" data-teste="mesa"
                data-estado={mesa.sessao?.estado ?? 'LIVRE'}>
              {mesa.sessao ? (
                <a href={`${base}/mesas/${mesa.sessao.id}`}>
                  <span className="bo-publico__nome">{mesa.codigo}</span>
                  <span className="bo-publico__preco">
                    <Etiqueta tom={mesa.sessao.estado === 'ABERTA' ? 'sucesso' : 'aviso'}>
                      {porChave(s, `sessao${mesa.sessao.estado}`) ?? mesa.sessao.estado}
                    </Etiqueta>
                  </span>
                </a>
              ) : (
                <>
                  <span className="bo-publico__nome">{mesa.codigo}</span>
                  <span className="bo-publico__preco">
                    <Etiqueta tom="neutro">{s.mesaLivre}</Etiqueta>
                  </span>
                </>
              )}
              <p className="bo-publico__descricao">
                {mesa.area.nome} · {s.capacidade}: {mesa.capacidade}
                {mesa.sessao ? ` · ${s.comensais}: ${mesa.sessao.comensais}` : ''}
                {/* Ausência é ausência: sem responsável diz-se, e nunca se põe o
                    identificador a fazer de nome. */}
                {mesa.sessao
                  ? ` · ${mesa.sessao.responsavel?.nome ?? mesa.sessao.responsavel?.email
                      ?? s.semResponsavel}`
                  : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
