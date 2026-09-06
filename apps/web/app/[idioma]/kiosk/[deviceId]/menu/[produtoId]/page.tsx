import { notFound, redirect } from 'next/navigation';
import { Etiqueta } from '@bossaos/ui';
import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';
import { cartaPublica } from '@bossaos/db';
import {
  IDIOMAS_DE_CONTEUDO, avisosPorAlergenio, produtoDaCarta, type IdiomaDeConteudo,
} from '@bossaos/domain';
import { carregarKiosk } from '../../../../../../src/kiosk/carregar-kiosk.ts';
import { CabecalhoDoKiosk, textosDoKiosk } from '../../../../../../src/kiosk/PecasDoKiosk.tsx';

export const dynamic = 'force-dynamic';

/**
 * KIOSK-003 · «Elige tus opciones» (atlas p. 216)
 *
 * ── Os alérgenos aparecem aqui pela mesma razão que na carta pública ───────
 *
 * Os catorze, incluindo os que **ninguém declarou**. E o tom de cada linha vem
 * do domínio (`avisosPorAlergenio`), não de um encadeado de ternários escrito
 * outra vez — uma cópia da regra é uma regra que a guarda não vigia, e esta é a
 * regra onde o erro manda alguém para o hospital.
 *
 * ── E porque é que o kiosk é PIOR do que a carta ao telemóvel ─────────────
 *
 * Na carta ao telemóvel há um empregado a três metros. Aqui não há ninguém:
 * quem tem uma alergia lê isto e decide sozinho.
 */
export default async function KioskProduto({
  params,
}: {
  params: Promise<{ idioma: Idioma; deviceId: string; produtoId: string }>;
}) {
  const { idioma, deviceId, produtoId } = await params;
  const s = textosDoKiosk(idioma);
  const m = mensagensDe(idioma);
  const c = m.publicoE09;
  const { kiosk, disponibilidade, prisma } = await carregarKiosk(deviceId);
  if (!disponibilidade.disponivel) redirect(`/${idioma}/kiosk/${deviceId}/pausado`);

  const conteudo: IdiomaDeConteudo =
    (IDIOMAS_DE_CONTEUDO as readonly string[]).includes(idioma)
      ? (idioma as IdiomaDeConteudo)
      : IDIOMAS_DE_CONTEUDO[0];

  const servida = await cartaPublica(prisma, kiosk.locationSlug, 'KIOSK', conteudo);
  // Procura DENTRO da projecção, e não na base: se fosse à base, esta tela
  // repetia os filtros de publicação e de canal, e bastava esquecer um para o
  // detalhe mostrar o que a lista esconde.
  const produto = servida ? produtoDaCarta(servida.carta, produtoId) : null;
  if (!produto) notFound();

  const rotulo = (chave: string): string => {
    const v = (c as unknown as Record<string, unknown>)[chave];
    return typeof v === 'string' ? v : chave;
  };

  return (
    <div className="bo-pagina">
      <CabecalhoDoKiosk sobrancelha={produto.nome} titulo={s.opcoes} tela="KIOSK-003" />

      <p className="bo-publico__preco" data-teste="preco">
        {produto.preco ? formatarDinheiro(produto.preco, idioma) : '—'}
      </p>
      {produto.descricao ? <p>{produto.descricao}</p> : null}

      {produto.variantes.length > 0 ? (
        <section aria-labelledby="variantes">
          <h2 id="variantes">{s.opcoes}</h2>
          <ul className="bo-lista" data-teste="variantes">
            {produto.variantes.map((v) => (
              <li key={v.nome}>
                {v.nome}
                {v.predefinida ? <Etiqueta tom="neutro">{m.catalogoE07.predefinida}</Etiqueta> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="alergenos">
        <h2 id="alergenos">{c.alergenos}</h2>
        <ul className="bo-publico__alergenos" data-teste="alergenos">
          {avisosPorAlergenio(
            produto.alergenos.map((a) => ({ alergenio: a.codigo, estado: a.estado })),
          ).map((a) => (
            <li key={a.alergenio}>
              <span>
                {(m.alergenios as unknown as Record<string, string>)[a.alergenio] ?? a.alergenio}
              </span>
              <Etiqueta tom={a.tom}>{rotulo(`estado${a.estado}`)}</Etiqueta>
            </li>
          ))}
        </ul>
        <p className="bo-publico__aviso">{c.notaAlergenosPublica}</p>
      </section>

      <a
        className="bo-lista__ligacao"
        data-seccao="KIOSK-004"
        href={`/${idioma}/kiosk/${deviceId}/carrinho`}
      >
        {s.adicionar}
      </a>
    </div>
  );
}
