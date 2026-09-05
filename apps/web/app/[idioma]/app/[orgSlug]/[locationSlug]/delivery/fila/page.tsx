import { Etiqueta, Tabela } from '@bossaos/ui';
import { formatarHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { filaDoCanal } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarLevar } from '../../../../../../../src/levar/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * DEL-003 · «Cola de reparto» (atlas)
 *
 * ── A morada NÃO está aqui, e não é por esquecimento ──────────────────────
 *
 * «Não exponha endereços ou telefones nas telas públicas de fila.» A consulta
 * que alimenta esta tela lê `orders`, e a morada vive noutra tabela — não é uma
 * coluna que alguém tenha de se lembrar de não seleccionar.
 *
 * Quem precisa da morada é quem vai à porta, e essa é outra tela com outra
 * pergunta.
 */
export default async function FilaDeEntrega({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).levarE20;
  const { sessao, unidade } = await carregarLevar(idioma, orgSlug, locationSlug);
  const fila = await comEscopoDoPedido(sessao, (db) => filaDoCanal(db, unidade.id, 'DELIVERY'));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="DEL-003">{t.filaEntrega}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/delivery`}>{t.voltar}</a>
      </div>

      {/* «Verde sobre fila vazia» é o que a régua reprova: o número está no ecrã. */}
      <p data-teste="quantos">{fila.length} {t.quantos}</p>

      <Tabela
        legenda={t.filaEntrega}
        vazio={<p data-teste="sem-entregas">{t.semEntregas}</p>}
        colunas={[
          { chave: 'numero', rotulo: t.numero },
          { chave: 'hora', rotulo: t.hora },
          { chave: 'cozinha', rotulo: t.producao },
          { chave: 'estado', rotulo: t.estado },
        ]}
        linhas={fila.map((p) => ({
          id: p.id, numero: p.numero,
          hora: p.entregarAs ? formatarHora(p.entregarAs, idioma) : '—',
          cozinha: p.naCozinha ? t.producao : t.porEntrar,
          estado: p.estado,
        }))}
        celula={(linha, coluna) => (coluna.chave !== 'cozinha' ? linha[coluna.chave] : (
          <Etiqueta tom={linha.cozinha === t.producao ? 'sucesso' : 'neutro'}>
            {linha.cozinha}
          </Etiqueta>
        ))}
      />
    </div>
  );
}
