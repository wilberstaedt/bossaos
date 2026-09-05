import { Tabela } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { relatorioDeReservas } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';
import { EstruturaDoHost } from '../../../../../../../src/reservas/EstruturaDoHost.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-019 · «Reservas en cifras» (atlas p. 155)
 *
 * ── A definição está AO LADO do número, e não numa página de ajuda ────────
 *
 * «Cinco números que toda a gente acha que sabe o que são e ninguém define
 * igual.» Um «no-show: 12» sem dizer se conta a reserva ou as pessoas é um
 * número que o dono vai usar para decidir e que ninguém consegue reproduzir.
 *
 * Não é preciso que a definição seja a certa — essa é do negócio. É preciso que
 * esteja lá, ao lado, onde quem lê o número a lê também.
 */
export default async function RelatorioDeReservas({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const g = m.mensagensE19;
  // Os números e as definições vêm por chave do motor; a leitura por índice
  // devolve `string | undefined`, e a chave que faltar cai no próprio nome —
  // que é visível no ecrã, e por isso é a falha certa: aparece a quem olha.
  const texto = (chave: string) => (g as unknown as Record<string, string | undefined>)[chave] ?? chave;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);

  const ate = new Date();
  const de = new Date(ate.getTime() - 30 * 24 * 3600_000);
  const numeros = await comEscopoDoPedido(sessao, (db) =>
    relatorioDeReservas(db, unidade.id, de, ate));

  return (
    <EstruturaDoHost idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
      unidade={unidade.nome} tela="RES-B-019" titulo={g.relatorio} activa="">
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
          // A definição viaja com o número: não há uma no código e outra na
          // legenda, porque só existe uma.
          definicao: texto(n.definicao),
        }))}
        celula={(linha, coluna) => (coluna.chave !== 'definicao' ? linha[coluna.chave] : (
          <span data-teste="definicao">{linha.definicao}</span>
        ))}
      />
    </EstruturaDoHost>
  );
}
