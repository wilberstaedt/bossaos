import { notFound, redirect } from 'next/navigation';
import { Aviso, Cartao, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarUnidades } from '@bossaos/db';
import { codificar, densidade, paraSvg } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { obterEnv } from '../../../../../../../src/servidor.ts';

export const dynamic = 'force-dynamic';

/**
 * QR-001, QR-003 e QR-004 · os códigos QR (atlas pp. 84-86)
 *
 * ── O QR é um ENDEREÇO, não uma credencial ─────────────────────────────────
 *
 * A régua é explícita: *"O QR geral não concede sessão de mesa nem permissão de
 * encomendar."* Ler este código abre a carta pública e mais nada — não há aqui
 * token, não há identificador de mesa, e o endereço é exactamente o mesmo que
 * qualquer pessoa pode escrever à mão.
 *
 * Isso é uma propriedade e não uma promessa: o que o QR contém é o URL que está
 * escrito por baixo dele, à vista.
 *
 * ── E é um QR a sério ──────────────────────────────────────────────────────
 *
 * *"Não use QR ilustrativo como código funcional."* O código é gerado pelo
 * codificador do domínio — Reed-Solomon, máscaras, informação de formato — e não
 * é um desenho. O que **não** está feito é a leitura em dois aparelhos reais, e
 * isso está dito no ecrã em vez de ficar por dizer.
 */
export default async function CodigosQr({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const c = m.publicoE09;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const unidade = await comEscopoDoPedido(sessao, async (db) => {
    const todas = await listarUnidades(db);
    return todas.find((u) => u.slug === locationSlug) ?? null;
  });
  if (!unidade) notFound();

  // Sem endereço público não há QR — e não se inventa um provisório: um código
  // impresso que aponta para um endereço que vai mudar é papel para deitar fora.
  if (!unidade.publicSlug) {
    return (
      <div className="bo-pagina">
        <div className="bo-estado__cabecalho">
          <div>
            <p className="bo-estado__sobrancelha">{c.canalQr}</p>
            <h1>{c.tituloQr}</h1>
          </div>
        </div>
        <Aviso tom="aviso" titulo={c.semEndereco}>
          <a href={`/${idioma}/app/${orgSlug}/${locationSlug}/channels`}>
            {c.accaoDefinirEndereco}
          </a>
        </Aviso>
      </div>
    );
  }

  const base = obterEnv().BETTER_AUTH_URL.replace(/\/$/, '');
  // `?de=qr` é a CATEGORIA de origem para o relatório. Não identifica ninguém —
  // é a diferença entre contar por onde entram e seguir quem entra.
  const endereco = `${base}/r/${unidade.publicSlug}/${idioma}/menu?de=qr`;

  // Nível Q: um QR colado numa mesa apanha gordura, riscos e luz de lado. `M`
  // chegava num ecrã; em papel, o que sobra de margem de erro paga-se sozinho.
  const codigo = codificar(endereco, 'Q');
  const svg = paraSvg(codigo, { tamanho: 320 });

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.canalQr}</p>
          <h1>{c.tituloQr}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/channels`}>{c.tituloCanais}</a>
      </div>

      <Cartao>
        <h2 className="bo-planos__nome">{c.tituloQrGerar}</h2>
        {/* O SVG é gerado no servidor e inserido como marcação — não é um
            ficheiro do cliente. O `dangerouslySetInnerHTML` aqui recebe algo que
            este processo acabou de construir a partir de uma matriz de booleanos,
            e não texto de fora. */}
        <div className="bo-qr" dangerouslySetInnerHTML={{ __html: svg }} />

        {/* O endereço à vista, por baixo do código: é a prova de que o QR não
            leva nada além disto. */}
        <p className="bo-qr__endereco"><code>{endereco}</code></p>
        <p className="bo-planos__nota">{c.notaQrEndereco}</p>

        <dl className="bo-estado__factos">
          <div><dt>{m.catalogoE07.colunaEstado}</dt><dd>{`v${codigo.versao} · ${codigo.nivel}`}</dd></div>
          <div><dt>{c.colunaConsultas}</dt><dd>{`${Math.round(densidade(codigo) * 100)}%`}</dd></div>
        </dl>
      </Cartao>

      <Cartao>
        <h2 className="bo-planos__nome">{c.tituloQrExportar}</h2>
        <div className="bo-estado__accoes">
          <a className="bo-botao bo-botao--primario"
             href={`/api/org/${orgSlug}/unidades/${unidade.id}/qr.svg`}>
            {c.accaoDescarregarSvg}
          </a>
        </div>
        <p className="bo-planos__nota">{c.notaQrImpressao}</p>
        {/* A pendência, no ecrã e não só no documento: o aceite permite
            registá-la, e uma pendência declarada é resposta. */}
        <Etiqueta tom="aviso">{c.notaQrPendente}</Etiqueta>
      </Cartao>
      {/* ── E17 · o QR DA MESA, que é outra coisa ───────────────────────────
          O código acima é um endereço: abre a carta e mais nada. O da mesa leva
          um segredo, e por isso tem par de actos próprio — rodar e revogar. As
          duas famílias vivem lado a lado de propósito: quem chega aqui tem de
          poder ver que são diferentes. */}
      <nav className="bo-publico__seccoes" data-teste="qr-das-mesas">
        <a href={`/${idioma}/app/${orgSlug}/${locationSlug}/channels/qr/sessoes`}
           data-seccao="QR-006">{m.visitanteE17.sessoesActivas}</a>
      </nav>

    </div>
  );
}
