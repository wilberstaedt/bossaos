import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarData, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarChaves } from '@bossaos/db';
import { estadoDaChave } from '@bossaos/domain';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INT-008 · «Claves de API» (atlas p. 261)
 *
 * ── Esta tela NÃO consegue mostrar uma chave antiga ───────────────────────
 *
 * E não é por ser cuidadosa: é porque não há de onde a ler. O que a base guarda
 * é o resumo, a listagem nem esse devolve, e não existe função no motor que
 * recupere o valor.
 *
 * > **Um ecrã que consegue mostrar outra vez uma chave antiga é um ecrã que
 * > prova que ela está guardada em claro.**
 *
 * O que se mostra é o prefixo — os primeiros caracteres, como os quatro últimos
 * dígitos de um cartão. Chega para a pessoa saber qual é qual, e não abre nada.
 *
 * ── E cada chave tem prazo, sempre ────────────────────────────────────────
 *
 * A coluna é `NOT NULL`. Uma chave sem prazo é uma chave para sempre, incluindo
 * depois de a pessoa que a criou sair da empresa.
 */
export default async function ChavesDeApi({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const s = mensagensDe(idioma).integracoesE32;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const chaves = await comEscopoDoPedido(sessao,
    (db) => listarChaves(db, sessao.contexto.organizationId));
  const agora = new Date();

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="INT-008">{s.chaves}</h1>
        </div>
      </div>

      {chaves.length === 0 ? (
        <div data-teste="sem-chaves">
          <Aviso tom="info" titulo={s.chaves}>{s.semChaves}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="chaves">
          {chaves.map((c: {
            id: string; nome: string; prefixo: string; escopos: string[];
            expiraEm: Date; revogadaEm: Date | null; ultimoUsoEm: Date | null;
          }) => {
            const estado = estadoDaChave(c, agora);
            return (
              <li key={c.id} data-teste="chave">
                <span>{c.nome}</span>{' '}
                <Etiqueta tom={estado === 'valida' ? 'sucesso' : 'neutro'}>
                  {estado === 'valida' ? s.valida
                    : estado === 'revogada' ? s.revogada : s.expirada}
                </Etiqueta>
                {/* O prefixo, e nunca a chave. */}
                {/* Duas linhas, e não uma: a 360 px o prefixo e a lista de
                    âmbitos juntos empurram a página para o lado. */}
                <p className="bo-campo__ajuda bo-identificador" data-teste="prefixo">
                  {s.prefixo} {c.prefixo}…
                </p>
                <p className="bo-campo__ajuda bo-identificador">
                  {s.escopos}: {c.escopos.join(', ')}
                </p>
                <p className="bo-campo__ajuda">
                  {s.expira}: {formatarData(c.expiraEm, idioma)}
                </p>
                {estado === 'valida' ? (
                  <form method="post"
                        action={`/api/org/${orgSlug}/chaves/${c.id}/revogar`}>
                    <button className="bo-botao" type="submit" data-teste="revogar">
                      {s.revogar}
                    </button>
                    <span className="bo-campo__ajuda"> {s.revogarAjuda}</span>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <p className="bo-campo__ajuda" data-teste="uma-vez">{s.chaveUmaVezAjuda}</p>
    </div>
  );
}
