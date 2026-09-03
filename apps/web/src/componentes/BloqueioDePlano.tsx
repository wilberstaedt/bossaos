import { Estado } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import type { ResultadoDeCapacidade } from '@bossaos/domain';
import { planoQueInclui, TEXTO_DA_CAPACIDADE } from './planos.ts';

/**
 * STATE-006 · "Esta función está en Pro"
 *
 * É um ESTADO TRANSVERSAL, não uma página: o CSV di-lo por extenso — *"(na rota
 * que executa a ação)"*. Vive como componente para que a recusa por plano tenha
 * a mesma cara em qualquer rota, e para que a próxima rota que recuse não
 * invente a sua própria maneira de o dizer.
 *
 * ── O que ele NÃO inventa ───────────────────────────────────────────────────
 *
 * O nome do plano a sugerir sai do CATÁLOGO: o primeiro, por ordem comercial,
 * que inclui a capacidade recusada. Se nenhum a incluir — porque a capacidade
 * ainda não se vende — não se sugere plano nenhum; diz-se que a função não está
 * disponível. Escrever "está en Pro" sem confirmar que o Pro a tem seria vender
 * uma coisa que o portão vai recusar a seguir.
 *
 * E o atlas (p. 392) é explícito no facto que mais importa a quem está a ler:
 * **"Datos actuales: Se conservan"**. Quem bate neste ecrã está a pensar que vai
 * perder o que já fez.
 */
export function BloqueioDePlano({
  idioma, resultado, catalogo, planoActual, hrefPlanos,
}: {
  idioma: Idioma;
  resultado: Extract<ResultadoDeCapacidade, { permitido: false }>;
  catalogo: ReadonlyArray<{ codigo: string; nome: string; capacidades: ReadonlyArray<{ capacidade: string }> }>;
  planoActual: string | null;
  hrefPlanos: string;
}) {
  const m = mensagensDe(idioma);
  const b = m.bloqueioPlano;

  const capacidade = 'capacidade' in resultado ? resultado.capacidade : null;
  const sugerido = capacidade ? planoQueInclui(catalogo, capacidade) : null;
  const nomeDaFuncao = capacidade
    ? (m.planos.destaques as Record<string, string>)[TEXTO_DA_CAPACIDADE[capacidade] ?? ''] ?? capacidade
    : (('flag' in resultado && resultado.flag) || '');

  // Cada motivo diz uma coisa diferente porque SÃO coisas diferentes: comprada e
  // caducada não é o mesmo que nunca comprada, e nenhuma das duas é "construída
  // mas ainda não lançada". Colapsá-las num texto só mandava três pessoas
  // diferentes pedir três coisas erradas ao suporte.
  const proximoPasso =
    resultado.motivo === 'expirado' ? b.expirado
    : resultado.motivo === 'desligado' ? b.porLancar
    : resultado.motivo === 'quota_esgotada'
      ? b.quotaEsgotada
          .replace('{uso}', String(resultado.uso))
          .replace('{quota}', String(resultado.quota))
    : sugerido ? b.revisarAlcance.replace('{plano}', sugerido.nome)
    : b.porLancar;

  return (
    <Estado
      sobrancelha={b.sobrancelha}
      titulo={sugerido ? b.titulo.replace('{plano}', sugerido.nome) : b.porLancar}
      situacao={{ tom: 'sucesso', titulo: b.situacaoTitulo, detalhe: b.situacaoDetalhe }}
      factos={[
        { rotulo: b.funcao, valor: nomeDaFuncao },
        { rotulo: b.planoActual, valor: planoActual ?? m.planos.semSubscricao },
        // "Se conservan". O único facto deste ecrã que baixa a tensão de quem o lê.
        { rotulo: b.dadosActuais, valor: b.conservados },
        { rotulo: b.proximoPasso, valor: proximoPasso },
      ]}
      accaoPrincipal={
        <a className="bo-botao bo-botao--primario" href={hrefPlanos}>
          {b.accao}
        </a>
      }
      accaoNoTopo
    />
  );
}
