import { notFound, redirect } from 'next/navigation';
import { Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import {
  CAPACIDADE_DO_TEMA, catalogoDePlanos, estadoComercial, listarUnidades,
  podeCapacidade, temaActivo,
} from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { BloqueioDePlano } from '../../../../../../../src/componentes/BloqueioDePlano.tsx';

export const dynamic = 'force-dynamic';

/**
 * THEME-001 · "Tu tema Starter" (atlas p. 379) — e STATE-006 onde ele acontece.
 *
 * ── O ecrã não é a guarda ───────────────────────────────────────────────────
 *
 * Esta página mostra que a edição de cores está fechada. Isso é cortesia, não
 * segurança: quem abrir as ferramentas do browser e fizer `PUT` à API continua a
 * bater no `guardarTema`, que verifica o plano **antes de tocar na base**. O
 * `planos-e-limites.md` diz-o em uma linha — *"o ecrã esconde para não frustrar;
 * o servidor recusa para proteger"* — e a prova do E05 exerce a API, não o ecrã.
 *
 * ── Porque é que o STATE-006 vive aqui ──────────────────────────────────────
 *
 * O CSV diz que o STATE-006 mora *"(na rota que executa a ação)"*. Esta é a
 * rota: é aqui que se editam cores, e é aqui que a recusa por plano tem cara.
 * Aparece **só quando o plano recusa de facto** — desenhá-lo sempre faria dele
 * uma ilustração, e uma ilustração não prova que a recusa existe.
 *
 * ── Uma divergência declarada ───────────────────────────────────────────────
 *
 * A rota tem `[locationSlug]` porque é o que o CSV manda, mas o tema é da
 * ORGANIZAÇÃO no modelo de dados: `ThemeRevision.organizationId`. O atlas mostra
 * um tema por organização ("Tu tema Starter", com o nome do restaurante). Se o
 * E12 precisar de um tema por unidade, muda-se a chave — não se inventa agora
 * uma coluna que ninguém usa. A unidade é validada à mesma: um `locationSlug`
 * que não é desta organização dá **ausência**, não permissão negada.
 */
export default async function TemaDaUnidade({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const unidades = await listarUnidades(db);
    return {
      unidade: unidades.find((u) => u.slug === locationSlug) ?? null,
      tema: await temaActivo(db, sessao.contexto.organizationId),
      estado: await estadoComercial(db, sessao.contexto.organizationId),
      catalogo: await catalogoDePlanos(db),
    };
  });

  // A unidade de outra organização e uma que não existe saem iguais: 404. É a
  // regra do E04, e vale aqui pela mesma razão — a diferença entre as duas
  // respostas é um oráculo de existência.
  if (!dados.unidade) notFound();

  const podeCores = podeCapacidade(dados.estado, {
    capacidade: CAPACIDADE_DO_TEMA,
    intencao: 'usar',
  });

  const mE12 = m.temaE12;
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/website/theme`;

  const amostras = [
    { rotulo: m.tema.primaria, cor: dados.tema.primaria },
    { rotulo: m.tema.acento, cor: dados.tema.acento },
    { rotulo: m.tema.fundo, cor: dados.tema.fundo },
  ];

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{dados.estado.planoNome ?? m.tema.sobrancelha}</p>
          <h1>{m.tema.titulo}</h1>
        </div>
        <div className="bo-estado__accoes">
          {/* O editor tem endereço para toda a gente, e é o SERVIDOR que recusa
              quem não tem plano. Esconder a ligação ao Starter tornaria o ecrã a
              guarda — e o `planos-e-limites.md` diz o contrário por escrito: «o
              ecrã esconde para não frustrar; o servidor recusa para proteger». O
              que se esconde é o BOTÃO PRIMÁRIO, não o caminho. */}
          <a
            className={`bo-botao ${podeCores.permitido ? 'bo-botao--primario' : 'bo-botao--secundario'}`}
            href={`${base}/editar`}
          >
            {mE12.editarAccao}
          </a>
          <a className="bo-botao bo-botao--secundario" href={`${base}/exemplos/brasa-norte`}>
            {mE12.exemplos}
          </a>
          <a className="bo-botao bo-botao--secundario" href={`${base}/plano`}>
            {mE12.planoTitulo}
          </a>
          <a className="bo-botao bo-botao--secundario" href={`/${idioma}/app/${orgSlug}/organization/plano`}>
            {m.tema.accao}
          </a>
        </div>
      </div>

      <div className="bo-tema">
        <div className="bo-tema__ficha">
          {amostras.map((a) => (
            <div key={a.rotulo} className="bo-tema__cor">
              {/* A amostra é decorativa: o valor está escrito ao lado, em texto,
                  e é ele que quem não distingue as cores lê. */}
              <span className="bo-tema__amostra" style={{ background: a.cor }} aria-hidden="true" />
              <span>
                <span className="bo-tema__rotulo">{a.rotulo}</span>
                <code className="bo-tema__valor">{a.cor.toUpperCase()}</code>
              </span>
            </div>
          ))}

          <dl className="bo-estado__factos">
            <dt>{m.tema.tipografia}</dt>
            <dd>{m.tema.tipografiaValor}</dd>
            <dt>{m.tema.edicao}</dt>
            <dd>{podeCores.permitido ? m.tema.aberta : m.tema.bloqueada}</dd>
            <dt>{m.tema.conteudo}</dt>
            <dd>{m.tema.conteudoValor}</dd>
          </dl>
        </div>

        <Cartao className="bo-tema__previa">
          <h2 className="bo-tema__nome">{dados.unidade.nome}</h2>
          <p className="bo-tema__legenda">{m.tema.carta}</p>
          <div className="bo-tema__imagem" style={{ background: dados.tema.fundo }} aria-hidden="true" />
          <a className="bo-botao bo-botao--primario" href="#">{m.tema.verCarta}</a>
        </Cartao>
      </div>

      {podeCores.permitido ? null : (
        <BloqueioDePlano
          idioma={idioma}
          resultado={podeCores}
          catalogo={dados.catalogo}
          planoActual={dados.estado.planoNome}
          hrefPlanos={`/${idioma}/app/${orgSlug}/organization/plano`}
        />
      )}
    </div>
  );
}
