import { Aviso, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarDispositivos } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { porChave } from '../../../../../../../src/staff/PecasDoStaff.tsx';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/** As quatro estações do modelo, e é a lista fechada do enum. */
const ESTACOES = ['SALA', 'COZINHA', 'BALCAO', 'GERENCIA'] as const;

/**
 * SET-008 · «Quién recibe cada aviso» (atlas p. 327)
 *
 * ── Diz que não chega a ninguém, em vez de dizer zero ────────────────────
 *
 * A leitura fácil era uma tabela com quatro linhas e uma contagem. Uma linha a
 * dizer «0» é tranquilizadora e não é uma resposta: quem lê conclui que está
 * calmo, quando o que está é que o aviso da cozinha não tem para onde ir.
 *
 * Uma estação sem dispositivo activo aparece com a frase, e não com o número. É
 * a mesma regra do ecrã de revogar do E13 — ausência não é zero — aplicada ao
 * caso em que a ausência custa comida fria.
 *
 * ── E é uma leitura do estado real, não uma configuração ─────────────────
 *
 * Não há aqui uma tabela de «quem recebe o quê» a manter de acordo com os
 * dispositivos. Quem recebe é quem **está** naquela estação, agora. Uma segunda
 * lista de destinatários seria uma cópia a envelhecer, e o dia em que
 * divergisse o ecrã dizia que alguém recebia.
 */
export default async function QuemRecebeCadaAviso({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const s = m.staffE15;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const dispositivos = await comEscopoDoPedido(sessao, (db) => listarDispositivos(db, unidade.id));
  const activos = dispositivos.filter((d: { estado: string }) => d.estado === 'ACTIVO');

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="SET-008">{s.quemRecebe}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings`}>{m.comum.voltar}</a>
      </div>

      <p className="bo-campo__ajuda">{s.quemRecebeAjuda}</p>

      {dispositivos.length === 0 ? (
        <Aviso tom="aviso" titulo={s.quemRecebe}>{s.semEstacoes}</Aviso>
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
