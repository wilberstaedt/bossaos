import { Etiqueta } from '@bossaos/ui';
import { listarDispositivos } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import { CabecalhoDoStaff, porChave, textosDoStaff } from '../../../../../src/staff/PecasDoStaff.tsx';

export const dynamic = 'force-dynamic';

/** As quatro estações do modelo. Escrita a partir do enum, e não à mão. */
const ESTACOES = ['SALA', 'COZINHA', 'BALCAO', 'GERENCIA'] as const;

/**
 * STAFF-009 · «Cada artículo a su estación» (atlas p. 168)
 *
 * ── Uma estação sem aparelho não recebe nada, e diz-se ───────────────────
 *
 * A tentação era mostrar as quatro estações sempre, como se cada uma fosse um
 * destino garantido. Não é: se ninguém tem um ecrã de cozinha ligado, o artigo
 * que «vai para a cozinha» não chega a lado nenhum. Uma linha a dizer zero
 * tranquiliza; esta diz **que não chega a ninguém**, que é a mesma informação
 * sem a mentira por omissão.
 */
export default async function EstacoesDoStaff({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string }>;
}) {
  const { idioma, locationId } = await params;
  const s = textosDoStaff(idioma);
  const { sessao, unidade } = await carregarStaff(idioma, locationId);
  const dispositivos = await comEscopoDoPedido(sessao, (db) => listarDispositivos(db, unidade.id));
  const activos = dispositivos.filter(
    (d: { estado: string }) => d.estado === 'ACTIVO');

  return (
    <div className="bo-pagina">
      <CabecalhoDoStaff idioma={idioma} locationId={locationId} unidade={unidade.nome}
                        titulo={s.estacoes} tela="STAFF-009" actual="/estacoes" />

      {dispositivos.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-estacoes">{s.semEstacoes}</p>
      ) : null}

      <ul className="bo-publico__lista" data-teste="estacoes">
        {ESTACOES.map((estacao) => {
          const dela = activos.filter((d: { estacao: string }) => d.estacao === estacao);
          return (
            <li key={estacao} className="bo-publico__produto" data-teste="estacao"
                data-estacao={estacao} data-aparelhos={dela.length}>
              <span className="bo-publico__nome">{porChave(s, `estacao${estacao}`) ?? estacao}</span>
              <span className="bo-publico__preco">
                {dela.length === 0 ? (
                  <Etiqueta tom="aviso">{s.naoChegaANinguem}</Etiqueta>
                ) : (
                  <Etiqueta tom="sucesso">{s.dispositivosActivos}: {dela.length}</Etiqueta>
                )}
              </span>
              {dela.length > 0 ? (
                <p className="bo-publico__descricao">
                  {dela.map((d: { id: string; nome: string }) => d.nome).join(' · ')}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
