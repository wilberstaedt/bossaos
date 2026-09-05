import { Aviso, Botao, Etiqueta, Tabela } from '@bossaos/ui';
import { formatarHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { agendadosEmRisco, filaDoCanal } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';
import { carregarLevar } from '../../../../../../src/levar/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * TAKE-003 · «Fila de recogida» (atlas)
 *
 * ── A fila diz o que já está na cozinha e o que ainda não ─────────────────
 *
 * São duas coisas diferentes e a tela separa-as, porque quem está ao balcão
 * pergunta as duas: «isto já se está a fazer?» e «isto ainda vem?». Um pedido
 * que ainda não entrou **não é** um pedido atrasado, e mostrá-los juntos fazia
 * parecer que sim.
 *
 * ── E o que ainda não entrou entra SOZINHO ────────────────────────────────
 *
 * A frase está no ecrã porque quem trabalha ao balcão precisa de saber que não
 * tem de fazer nada — senão fica a carregar em recarregar, ou pior, a mandar o
 * pedido para a cozinha à mão.
 */
export default async function FilaDeRetirada({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const t = m.levarE20;
  const { sessao, unidade } = await carregarLevar(idioma, orgSlug, locationSlug);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/takeaway`;

  const { fila, risco } = await comEscopoDoPedido(sessao, async (db) => ({
    fila: await filaDoCanal(db, unidade.id, 'TAKEAWAY'),
    risco: await agendadosEmRisco(db, unidade.id),
  }));
  const naCozinha = fila.filter((p) => p.naCozinha);
  const porEntrar = fila.filter((p) => !p.naCozinha);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="TAKE-003">{t.fila}</h1>
        </div>
        <a className="bo-botao" href={`${base}/novo`}>{t.cliente}</a>
      </div>

      {/* ── A régua reprova «verde sobre fila vazia»: o número está no ecrã ── */}
      <dl className="bo-estado__factos">
        <dt>{t.fila}</dt><dd data-teste="quantos">{fila.length}</dd>
        <dt>{t.porEntrar}</dt><dd data-teste="quantos-por-entrar">{porEntrar.length}</dd>
      </dl>

      {risco.length > 0 ? (
        <Aviso tom="aviso" titulo={t.emRisco}>
          <p data-teste="em-risco">{risco.map((r) => r.numero).join(', ')}</p>
          <p>{t.emRiscoAjuda}</p>
        </Aviso>
      ) : null}

      <Tabela
        legenda={t.fila}
        vazio={<p data-teste="sem-pedidos">{t.semPedidos}</p>}
        colunas={[
          { chave: 'numero', rotulo: t.numero },
          { chave: 'hora', rotulo: t.hora },
          { chave: 'estado', rotulo: t.estado },
          { chave: 'accoes', rotulo: t.entregue },
        ]}
        linhas={naCozinha.map((p) => ({
          id: p.id, numero: p.numero,
          hora: p.entregarAs ? formatarHora(p.entregarAs, idioma) : '—',
          estado: p.estado, accoes: '',
        }))}
        celula={(linha, coluna) => (coluna.chave !== 'accoes' ? linha[coluna.chave] : (
          <a className="bo-botao bo-botao--secundario"
             href={`${base}/${linha.id}`}>{t.retirada}</a>
        ))}
      />

      {porEntrar.length > 0 ? (
        <>
          <h2>{t.porEntrar}</h2>
          {/* A frase que impede alguém de empurrar o pedido para a cozinha à mão. */}
          <p className="bo-campo__ajuda" data-teste="por-entrar-ajuda">{t.porEntrarAjuda}</p>
          <ul className="bo-publico__lista">
            {porEntrar.map((p) => (
              <li key={p.id} className="bo-publico__produto">
                <span className="bo-publico__nome">{p.numero}</span>
                <span className="bo-publico__preco">
                  <Etiqueta tom="neutro">
                    {p.producaoEm ? formatarHora(p.producaoEm, idioma) : '—'}
                  </Etiqueta>
                </span>
                <p className="bo-publico__descricao">
                  {t.producao}: {p.producaoEm ? formatarHora(p.producaoEm, idioma) : '—'}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <Botao tom="fantasma" densidade="operacao">{t.quantos}</Botao>
    </div>
  );
}
