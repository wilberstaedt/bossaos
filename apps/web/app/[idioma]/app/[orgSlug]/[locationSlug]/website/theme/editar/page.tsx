import { notFound, redirect } from 'next/navigation';
import { Aviso, Cartao, normalizarCor, validarTema, TEMA_BOSSAOS } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import {
  CAPACIDADE_DO_TEMA, catalogoDePlanos, estadoComercial, listarUnidades,
  podeCapacidade, rascunhoDoTema,
} from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../../src/sessao.ts';
import { BloqueioDePlano } from '../../../../../../../../src/componentes/BloqueioDePlano.tsx';
import { PreviaDoTema } from '../../../../../../../../src/componentes/PreviaDoTema.tsx';

export const dynamic = 'force-dynamic';

/**
 * THEME-002 · «Elige los colores de tu restaurante» (atlas p. 380)
 * THEME-004 · «Este color necesita ajuste» (atlas p. 382), no mesmo endereço.
 *
 * ── Porque é que o 004 vive aqui e não numa rota própria ──────────────────
 *
 * Porque é o estado em que esta tela fica quando o SERVIDOR recusa. Desenhá-lo
 * numa página separada fazia dele uma ilustração — e uma ilustração de recusa
 * passa o aceite sem que a recusa exista. É a mesma decisão que pôs o STATE-006
 * dentro do THEME-001, escrita no cabeçalho de lá.
 *
 * O par que o torna verdadeiro: sem `?erro=contraste`, este bloco **não
 * aparece**. Quem quiser vê-lo tem de submeter cores ilegíveis e ser recusado.
 *
 * ── As cores recusadas voltam pelo endereço, e são MEDIDAS outra vez ──────
 *
 * O que a página mostra não é «o que tu escreveste» — é o veredicto de
 * `validarTema` sobre o que se escreveu, calculado aqui, no servidor. A régua
 * reprova à cabeça *«validação de contraste só no cliente»*, e a maneira de não
 * ter duas verdades sobre contraste é não haver segunda conta em lado nenhum.
 *
 * `normalizarCor` corre antes de qualquer valor tocar num atributo `style`: o
 * que vem do endereço é escrito por quem quiser, e três destes valores acabam
 * numa folha de estilos.
 */
export default async function EditarTema({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const t = m.temaE12;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const unidades = await listarUnidades(db);
    return {
      unidade: unidades.find((u) => u.slug === locationSlug) ?? null,
      rascunho: await rascunhoDoTema(db, sessao.contexto.organizationId),
      estado: await estadoComercial(db, sessao.contexto.organizationId),
      catalogo: await catalogoDePlanos(db),
    };
  });
  if (!dados.unidade) notFound();

  const podeCores = podeCapacidade(dados.estado, {
    capacidade: CAPACIDADE_DO_TEMA, intencao: 'usar',
  });

  const doEndereco = (chave: string): string | undefined => {
    const v = busca[chave];
    return typeof v === 'string' ? v : undefined;
  };

  // As cores recusadas, se as houver. Guardam-se em bruto para o campo do
  // formulário as devolver tal e qual — quem escreveu "vermelho" tem de ver
  // "vermelho" no campo, e não um branco silencioso.
  const recusadas = busca.erro === 'contraste'
    ? {
        ...(doEndereco('primaria') ? { primaria: doEndereco('primaria')! } : {}),
        ...(doEndereco('acento') ? { acento: doEndereco('acento')! } : {}),
        ...(doEndereco('fundo') ? { fundo: doEndereco('fundo')! } : {}),
      }
    : null;
  // Medido aqui, no servidor. Não é o que a rota disse: é a mesma conta outra vez.
  const veredicto = recusadas ? validarTema(recusadas) : null;

  const valor = (token: 'primaria' | 'acento' | 'fundo') =>
    recusadas?.[token] ?? dados.rascunho[token];

  // ── As amostras mostram o que se escreveu; a PRÉVIA, não ───────────────
  //
  // A amostra é um quadrado sem texto: mostrar nela a cor recusada é útil e não
  // faz mal a ninguém. A prévia põe texto por cima — e pintar a prévia com um
  // par que o servidor acabou de reprovar era o produto a servir texto ilegível
  // dentro do próprio ecrã que diz que aquilo não se lê.
  //
  // Foi a inspecção de contraste a 360 px que apanhou isto, no THEME-004, e é o
  // instrumento a funcionar: a mesma regra que mede a carta pública mediu esta
  // tela e recusou-a.
  const amostraDe = (token: 'primaria' | 'acento' | 'fundo') =>
    normalizarCor(valor(token)) ?? TEMA_BOSSAOS[token];
  // A prévia usa o rascunho GUARDADO — o último par que passou no servidor.
  const temaDaPrevia = {
    primaria: normalizarCor(dados.rascunho.primaria) ?? TEMA_BOSSAOS.primaria,
    acento: normalizarCor(dados.rascunho.acento) ?? TEMA_BOSSAOS.acento,
    fundo: normalizarCor(dados.rascunho.fundo) ?? TEMA_BOSSAOS.fundo,
  };

  const campos = [
    { token: 'primaria' as const, rotulo: m.tema.primaria },
    { token: 'acento' as const, rotulo: m.tema.acento },
    { token: 'fundo' as const, rotulo: m.tema.fundo },
  ];

  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/website/theme`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{t.sobrancelha}</p>
          <h1>{t.editarTitulo}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario" href={base}>{m.comum.voltar}</a>
      </div>

      {podeCores.permitido ? null : (
        <BloqueioDePlano
          idioma={idioma} resultado={podeCores} catalogo={dados.catalogo}
          planoActual={dados.estado.planoNome}
          hrefPlanos={`/${idioma}/app/${orgSlug}/organization/plano`}
        />
      )}

      {/* ── THEME-004 · o servidor recusou, e diz o número ────────────────── */}
      {veredicto && !veredicto.aprovado ? (
        <Aviso tom="perigo" titulo={t.ajusteTitulo}>
          <p>{t.ajusteExplicacao}</p>
          <ul className="bo-lista">
            {veredicto.veredictos.filter((v) => !v.cumpre).map((v) => (
              <li key={v.token}>
                <strong>{(m.tema as unknown as Record<string, string>)[v.token] ?? v.token}</strong>
                {' · '}{t.contra}: {v.contra}
                {' · '}{t.razao}: {v.razao}:1
                {' · '}{t.minimo}: {v.limiar}:1
              </li>
            ))}
            {/* Uma cor mal escrita não tem razão de contraste nenhuma: não é uma
                cor. A reprovação de forma vem em texto e aparece na mesma lista,
                para quem escreveu «vermelho» perceber o que se passou. */}
            {veredicto.veredictos.length === 0
              ? veredicto.reprovacoes.map((r) => <li key={r}>{r}</li>)
              : null}
          </ul>
        </Aviso>
      ) : null}

      {busca.guardado === '1' ? <Aviso tom="sucesso" titulo={t.guardado}>{t.porPublicar}</Aviso> : null}
      {busca.igual === '1' ? <Aviso titulo={t.semAlteracoes}>{t.semAlteracoes}</Aviso> : null}
      {busca.descartado === '1' ? <Aviso titulo={t.descartado}>{t.descartado}</Aviso> : null}

      <div className="bo-tema">
        <form
          className="bo-tema__ficha" method="post"
          action={`/api/org/${orgSlug}/tema/rascunho`}
        >
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="accao" value="guardar" />

          {campos.map((c) => (
            <div key={c.token} className="bo-tema__cor">
              <span
                className="bo-tema__amostra"
                style={{ background: amostraDe(c.token) }}
                aria-hidden="true"
              />
              <span className="bo-campo">
                <label className="bo-campo__rotulo" htmlFor={c.token}>{c.rotulo}</label>
                {/* `type="text"` e não `type="color"`: o selector nativo não deixa
                    escrever um valor exacto, e a cor de uma marca vem escrita num
                    manual, não escolhida a olho. É a mesma decisão do E07 sobre o
                    `type="number"`, e pela mesma razão — a validação nativa
                    recusa antes de o servidor ver o que a pessoa quis. */}
                <input
                  className="bo-campo__controlo" type="text" id={c.token} name={c.token}
                  defaultValue={valor(c.token)} inputMode="text"
                  spellCheck={false} autoComplete="off"
                />
              </span>
            </div>
          ))}

          <dl className="bo-estado__factos">
            <dt>{t.origem}</dt>
            <dd>
              {dados.rascunho.origem === 'RASCUNHO' ? t.origemRascunho
                : dados.rascunho.origem === 'PUBLICADO' ? t.origemPublicado : t.origemPadrao}
              {dados.rascunho.actualizadoPor
                ? ` · ${t.actualizadoPor}: ${dados.rascunho.actualizadoPor}` : ''}
            </dd>
            <dt>{t.heranca}</dt>
            <dd>{t.herancaTexto}</dd>
            <dt>{t.naoPersonalizavel}</dt>
            <dd>{t.naoPersonalizavelTexto}</dd>
          </dl>

          <div className="bo-estado__accoes">
            <button className="bo-botao bo-botao--primario" type="submit">{t.guardar}</button>
            <button
              className="bo-botao bo-botao--secundario" type="submit"
              name="accao" value="descartar"
            >
              {t.descartar}
            </button>
          </div>
          <p className="bo-campo__ajuda">{t.ajuda}</p>
        </form>

        <Cartao className="bo-tema__previa" titulo={t.previaTitulo}>
          <PreviaDoTema
            tema={temaDaPrevia} unidade={dados.unidade.nome} marca={t.sobrancelha}
            pratos={[{ nome: m.tema.carta, preco: '', descricao: t.previaAviso }]}
            verCarta={m.tema.verCarta}
          />
          <p className="bo-estado__accoes">
            <a className="bo-botao bo-botao--secundario" href={`${base}/previa`}>{t.previaTitulo}</a>
            <a className="bo-botao bo-botao--primario" href={`${base}/publicar`}>{t.publicarAccao}</a>
          </p>
        </Cartao>
      </div>
    </div>
  );
}
