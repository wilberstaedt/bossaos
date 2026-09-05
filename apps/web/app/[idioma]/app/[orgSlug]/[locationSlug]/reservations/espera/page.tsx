import { Botao, Tabela } from '@bossaos/ui';
import { formatarHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { esperaDaUnidade, salaAgora } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';
import { EstruturaDoHost } from '../../../../../../../src/reservas/EstruturaDoHost.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-008 · «Lista de espera» (atlas p. 144)
 *
 * ── O host vê a ordem de CHEGADA, e a tela diz que é isso ─────────────────
 *
 * «O host precisa de ver a ordem de chegada, porque é a informação que lhe
 * permite ser justo de propósito quando decide não a seguir.»
 *
 * Esta lista **não** mostra posições. Mostra quem chegou primeiro, e diz por
 * palavras que essa não é a ordem em que se sentam — senão o host lê-a como uma
 * fila e o produto acaba a decidir por ele em silêncio.
 */
export default async function EsperaOperacional({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const h = mensagensDe(idioma).hostE19;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);
  const { lista, mesas } = await comEscopoDoPedido(sessao, async (db) => ({
    lista: await esperaDaUnidade(db, unidade.id),
    mesas: await salaAgora(db, unidade.id, sessao.contexto.organizationId),
  }));
  const livres = mesas.filter((x) => !x.sessao);

  return (
    <EstruturaDoHost idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
      unidade={unidade.nome} tela="RES-B-008" titulo={h.espera} activa="/espera">
      <p className="bo-campo__ajuda" data-teste="ordem-chegada">{h.ordemChegada}</p>
      {/* A frase que impede a lista de ser lida como uma fila. */}
      <p className="bo-campo__ajuda" data-teste="ordem-ajuda">{h.ordemAjuda}</p>
      <Tabela
        legenda={h.espera}
        vazio={<p data-teste="sem-espera">{h.semEspera}</p>}
        colunas={[
          { chave: 'chegou', rotulo: h.hora },
          { chave: 'nome', rotulo: h.nome },
          { chave: 'pessoas', rotulo: h.pessoas, numero: true },
          { chave: 'estado', rotulo: h.estado },
          { chave: 'accoes', rotulo: h.chegou },
        ]}
        linhas={lista.map((e) => ({
          id: e.id, chegou: formatarHora(e.chegouEm, idioma), nome: e.nome,
          pessoas: String(e.pessoas), estado: e.estado, accoes: '',
        }))}
        celula={(linha, coluna) => (coluna.chave !== 'accoes' ? linha[coluna.chave] : (
          /* ── Chamar OUTRA VEZ é um acontecimento novo ─────────────────
             «A sua mesa está pronta» pode ter de sair duas vezes na mesma
             noite: a pessoa não veio à primeira. O botão não desaparece
             depois da primeira chamada, de propósito. */
          <form method="post" action={`/api/org/${orgSlug}/reservas`}>
            <input type="hidden" name="idioma" value={idioma} />
            <input type="hidden" name="locationId" value={unidade.id} />
            <input type="hidden" name="locationSlug" value={locationSlug} />
            <input type="hidden" name="accao" value="chamar_espera" />
            <input type="hidden" name="esperaId" value={linha.id} />
            <input type="hidden" name="tableId" value={livres[0]?.id ?? ''} />
            <Botao type="submit" densidade="operacao"
                   data-teste="chamar-espera">{h.chamar}</Botao>
          </form>
        ))}
      />
    </EstruturaDoHost>
  );
}
