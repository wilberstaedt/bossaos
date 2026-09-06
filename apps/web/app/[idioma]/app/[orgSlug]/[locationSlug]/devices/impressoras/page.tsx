import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarData, mensagensDe, type Idioma } from '@bossaos/i18n';
import { impressorasDaUnidade } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * DEV-005 · «Impresoras de servicio» (atlas p. 131)
 *
 * ── A coluna que interessa é a da homologação, e ela tem TRÊS respostas ───
 *
 * Não há um «sim/não» aqui, e é de propósito: sem data de homologação, a
 * impressora está **por testar com aparelho real** — que não é o mesmo que
 * falhar. Um booleano tinha duas respostas e obrigava a escolher uma delas para
 * o que ninguém mediu.
 *
 * > «Uma linha vazia lê-se como uma linha aprovada, e as duas custam a mesma
 * > tinta.»
 *
 * Por isso a linha por testar **diz-o por palavras**, com a explicação ao lado,
 * em vez de ficar em branco.
 */
export default async function ImpressorasDaUnidade({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const s = mensagensDe(idioma).kioskE31;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const impressoras = await comEscopoDoPedido(sessao,
    (db) => impressorasDaUnidade(db, unidade.id));
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/devices/impressoras`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="DEV-005">{s.impressoras}</h1>
        </div>
      </div>

      {impressoras.length === 0 ? (
        <div data-teste="sem-impressoras">
          <Aviso tom="info" titulo={s.impressoras}>{s.impressorasVazio}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista" data-teste="impressoras">
          {impressoras.map((p: {
            id: string; nome: string; destino: string; modelo: string;
            ligacao: string; activa: boolean;
            homologadaEm: Date | null; homologadaPor: string | null;
          }) => (
            <li key={p.id} data-teste="impressora">
              <a className="bo-lista__ligacao" data-seccao="DEV-006"
                 href={`${base}/${p.id}`}>
                <span>{p.nome}</span>
                {/* Três respostas, e a terceira é «não medi». */}
                {p.homologadaEm === null ? (
                  <Etiqueta tom="neutro">{s.porTestar}</Etiqueta>
                ) : (
                  <Etiqueta tom="sucesso">
                    {s.homologada}: {formatarData(p.homologadaEm, idioma)}
                  </Etiqueta>
                )}
              </a>
              <p className="bo-campo__ajuda">
                {s.destino}: {p.destino} · {s.modelo}: {p.modelo} · {s.ligacao}: {p.ligacao}
              </p>
              {p.homologadaEm === null ? (
                <p className="bo-campo__ajuda" data-teste="por-testar-ajuda">
                  {s.porTestarAjuda}
                </p>
              ) : (
                <p className="bo-campo__ajuda">{p.homologadaPor}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
