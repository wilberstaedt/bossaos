import { Aviso, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { dominiosDaUnidade } from '@bossaos/db';
import { NavegacaoDoSite } from '../../../../../../../src/componentes/NavegacaoDoSite.tsx';
import { carregarSite } from '../../../../../../../src/site-da-pagina.ts';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * WEB-009 · «Conecta tu dominio» (atlas p. 253) — o aceite 3 do E10.
 *
 * ── Quatro estados, e o ecrã diz qual e porquê ────────────────────────────
 *
 * Um booleano aqui obrigava a escolher entre duas mentiras. `INDETERMINADO` quer
 * dizer *"o DNS não respondeu"* — e o site **continua no ar**, porque perder a
 * posse é uma conclusão que exige ver outro dono, não deixar de ver o nosso.
 * `CONTESTADO` é a única que diz que se viu outro dono.
 *
 * O `motivo` está no ecrã ao lado do estado. Sem ele, "não conseguimos comprovar"
 * e "outro registo reclama este domínio" leem-se iguais, e são a diferença entre
 * esperar e agir.
 *
 * ── A propagação de DNS é do mundo real e fica DECLARADA ──────────────────
 *
 * O que se prova em casa é a máquina de estados e a recusa de servir sem prova.
 * O tempo que o DNS demora a propagar não é nosso e não se simula com verdade —
 * está declarado no `E10.md` como pendência, e não como um passo dado.
 */
/**
 * O rótulo de cada estado, num sítio só.
 *
 * Escrito com um `switch` e não com uma tabela indexada por cadeia: o
 * compilador exige que os quatro estados estejam cobertos, e um quinto estado
 * acrescentado ao domínio parte a compilação em vez de aparecer em branco no
 * ecrã. Uma tabela indexada devolveria `undefined` em silêncio.
 */
function rotuloDoEstado(
  estado: 'PENDENTE' | 'VERIFICADO' | 'INDETERMINADO' | 'CONTESTADO',
  g: ReturnType<typeof mensagensDe>['gestaoSiteE10'],
): string {
  switch (estado) {
    case 'PENDENTE': return g.estadoPendente;
    case 'VERIFICADO': return g.estadoVerificado;
    case 'INDETERMINADO': return g.estadoIndeterminado;
    case 'CONTESTADO': return g.estadoContestado;
  }
}

export default async function DominioDoSite({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams: Promise<{ guardado?: string; erro?: string; estado?: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const procura = await searchParams;
  const m = mensagensDe(idioma);
  const g = m.gestaoSiteE10;
  const { sessao, unidade } = await carregarSite(idioma, orgSlug, locationSlug);

  const dominios = await comEscopoDoPedido(sessao, (db) => dominiosDaUnidade(db, unidade.id));
  const accao = `/api/org/${orgSlug}/site/dominio`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{g.dominio}</h1>
        </div>
      </div>

      <NavegacaoDoSite idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/dominio" />

      {procura.erro === 'em_uso' ? <Aviso tom="aviso" titulo={g.dominio}>{g.dominioEmUso}</Aviso> : null}
      {procura.erro === 'reservado_por_outra_organizacao'
        ? <Aviso tom="aviso" titulo={g.dominio}>{g.dominioReservado}</Aviso> : null}
      {procura.erro === 'invalido' ? <Aviso tom="aviso" titulo={g.dominio}>{g.dominioInvalido}</Aviso> : null}
      {procura.guardado === '1' ? <Aviso tom="sucesso" titulo={m.comum.guardado}>{g.registoDns}</Aviso> : null}

      {dominios.map((d) => (
        <section key={d.dominio} aria-labelledby={`d-${d.dominio}`}>
          <h2 id={`d-${d.dominio}`}>{d.dominio}</h2>
          <p>
            <Etiqueta tom={d.estado === 'VERIFICADO' ? 'sucesso'
              : d.estado === 'CONTESTADO' ? 'perigo' : 'neutro'}>
              {rotuloDoEstado(d.estado, g)}
            </Etiqueta>
          </p>
          {/* O motivo, em texto. Sem ele o estado é uma cor com um rótulo curto,
              e "não conseguimos comprovar agora" e "outro reclama este domínio"
              pedem coisas opostas a quem lê. */}
          {d.motivo ? <p className="bo-publico__descricao">{d.motivo}</p> : null}

          <dl className="bo-estado__factos">
            <dt>{g.registoDns}</dt>
            <dd><code>{d.registo.nome}</code></dd>
            <dt>TXT</dt>
            <dd><code>{d.registo.valor}</code></dd>
          </dl>

          <form method="post" action={accao}>
            <input type="hidden" name="idioma" value={idioma} />
            <input type="hidden" name="locationSlug" value={locationSlug} />
            <input type="hidden" name="dominio" value={d.dominio} />
            <input type="hidden" name="accao" value="verificar" />
            <button type="submit" className="bo-botao bo-botao--primario">{g.verificar}</button>
          </form>
          <form method="post" action={accao}>
            <input type="hidden" name="idioma" value={idioma} />
            <input type="hidden" name="locationSlug" value={locationSlug} />
            <input type="hidden" name="dominio" value={d.dominio} />
            <input type="hidden" name="accao" value="largar" />
            <button type="submit" className="bo-botao bo-botao--secundario">{m.comum.cancelar}</button>
          </form>
        </section>
      ))}

      <form method="post" action={accao} className="bo-publico__formulario">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <input type="hidden" name="accao" value="vincular" />
        <div className="bo-campo">
          <label className="bo-campo__rotulo" htmlFor="dominio">{g.dominioCampo}</label>
          <input className="bo-campo__controlo" id="dominio" name="dominio" required
                 placeholder="carta.orestaurante.com" maxLength={253} />
        </div>
        <p><button type="submit" className="bo-botao bo-botao--primario">{g.vincular}</button></p>
      </form>
    </div>
  );
}
