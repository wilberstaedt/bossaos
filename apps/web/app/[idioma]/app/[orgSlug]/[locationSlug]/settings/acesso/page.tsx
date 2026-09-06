import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { politicaDeAcesso, sessoesDaCasa } from '@bossaos/db';
import { estadoDaSessao } from '@bossaos/domain';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * SET-010 · «Política de acceso» (atlas p. 168)
 *
 * ── Esta tela é o «visível ao inquilino» ──────────────────────────────────
 *
 * Das quatro condições de uma sessão de suporte, esta é a que não vive na base:
 * temporária, com âmbito e com motivo são restrições; **visível ao inquilino é
 * um ecrã que tem de existir.**
 *
 * Um acesso que só aparece do nosso lado é um acesso que o cliente não pode
 * contestar — e não poder contestar é a diferença entre um fornecedor e um
 * senhorio.
 *
 * ── E a política é DELES ──────────────────────────────────────────────────
 *
 * O tecto e o consentimento escrevem-se aqui, pela casa. Há casas que aceitam
 * entrada sem pedir; há casas que exigem consentimento a cada vez. Nós não
 * escolhemos por elas — e o gatilho da base recusa qualquer sessão que passe o
 * que aqui ficou escrito.
 */
export default async function PoliticaDeAcesso({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const s = mensagensDe(idioma).plataformaE33;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const org = sessao.contexto.organizationId;

  const [politica, sessoes] = await Promise.all([
    comEscopoDoPedido(sessao, (db) => politicaDeAcesso(db, org)),
    comEscopoDoPedido(sessao, (db) => sessoesDaCasa(db, org)),
  ]);
  const agora = new Date();

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="SET-010">{s.acesso}</h1>
        </div>
      </div>

      {/* A promessa, por palavras. Quem lê isto tem de perceber que vê tudo. */}
      <p data-teste="ves-tudo">{s.vesTudo}</p>

      <form method="post" action={`/api/org/${orgSlug}/acesso`}>
        <label className="bo-campo__linha">
          <input type="checkbox" name="exigeConsentimento" value="1"
                 defaultChecked={politica?.exigeConsentimento ?? false}
                 data-teste="exige-consentimento" />
          <span>{s.exigeConsentimento}</span>
        </label>
        <p className="bo-campo__ajuda">{s.exigeConsentimentoAjuda}</p>

        <label className="bo-campo__linha">
          <span>{s.tectoMinutos}</span>
          <input type="text" inputMode="numeric" name="duracaoMaximaMin"
                 defaultValue={String(politica?.duracaoMaximaMin ?? 60)}
                 data-teste="tecto" />
        </label>
        <p className="bo-campo__ajuda">{s.tectoAjuda}</p>

        <button className="bo-botao" type="submit">{s.guardar}</button>
      </form>

      <h2>{s.quemEntrou}</h2>
      <p className="bo-campo__ajuda" data-teste="expira-sozinha">{s.expiraSozinha}</p>

      {sessoes.length === 0 ? (
        <div data-teste="sem-sessoes">
          <Aviso tom="sucesso" titulo={s.quemEntrou}>{s.semSessoes}</Aviso>
        </div>
      ) : (
        <ul className="bo-lista bo-lista--blocos" data-teste="sessoes">
          {sessoes.map((x: {
            id: string; staffEmail: string; motivo: string; ambito: string[];
            abertaEm: Date; expiraEm: Date; terminadaEm: Date | null;
          }) => {
            const estado = estadoDaSessao(x, agora);
            return (
              <li key={x.id} data-teste="sessao">
                {/* A PESSOA, e não o papel. */}
                <span data-teste="quem">{x.staffEmail}</span>{' '}
                <Etiqueta tom={estado === 'viva' ? 'aviso' : 'neutro'}>
                  {estado === 'viva' ? s.sessaoViva
                    : estado === 'terminada' ? s.sessaoTerminada : s.sessaoExpirada}
                </Etiqueta>
                <p className="bo-campo__ajuda" data-teste="porque">
                  {s.porque}: {x.motivo}
                </p>
                <p className="bo-campo__ajuda">
                  {s.quando}: {formatarDataHora(x.abertaEm, idioma)} ·{' '}
                  {s.ateQuando}: {formatarDataHora(x.expiraEm, idioma)}
                </p>
                <p className="bo-campo__ajuda" data-teste="ambito">
                  {s.ambito}: {x.ambito.join(', ')}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <p className="bo-campo__ajuda">{s.vemosOQuePrecisamos}</p>
    </div>
  );
}
