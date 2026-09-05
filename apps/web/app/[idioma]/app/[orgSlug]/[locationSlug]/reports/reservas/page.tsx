import { Tabela } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { relatorioDeReservas } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * REP-008 · «Cómo llegan las reservas» (atlas)
 *
 * ── É o MESMO número do RES-B-019, e é de propósito ───────────────────────
 *
 * Dois relatórios com a mesma pergunta e contas diferentes é a forma clássica de
 * uma organização discutir números em vez de decidir. A conta é uma —
 * `relatorioDeReservas` —, e as duas telas mostram-na para dois leitores: o host
 * vê-a no seu painel de reservas, o dono vê-a entre os outros relatórios.
 *
 * As definições viajam com os números, para que a mesma frase apareça nas duas.
 */
export default async function RelatorioDeReservasNosRelatorios({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const g = m.mensagensE19;
  const texto = (chave: string) => (g as unknown as Record<string, string | undefined>)[chave] ?? chave;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);

  const ate = new Date();
  const de = new Date(ate.getTime() - 30 * 24 * 3600_000);
  const numeros = await comEscopoDoPedido(sessao, (db) =>
    relatorioDeReservas(db, unidade.id, de, ate));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="REP-008">{g.relatorio}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/reports`}>{m.comum.voltar}</a>
      </div>
      <p className="bo-campo__ajuda">{g.periodo}</p>
      <Tabela
        legenda={g.relatorio}
        vazio={<p>{g.semMensagens}</p>}
        colunas={[
          { chave: 'nome', rotulo: g.relatorio },
          { chave: 'valor', rotulo: g.reservas, numero: true },
          { chave: 'definicao', rotulo: g.definicoes },
        ]}
        linhas={numeros.map((n) => ({
          id: n.chave, nome: texto(n.chave), valor: String(n.valor),
          definicao: texto(n.definicao),
        }))}
        celula={(linha, coluna) => (coluna.chave !== 'definicao' ? linha[coluna.chave] : (
          <span data-teste="definicao">{linha.definicao}</span>
        ))}
      />
    </div>
  );
}
