import { CabecalhoDePagina } from '@bossaos/ui';
import { redirect } from 'next/navigation';
import { formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { cartaPublica } from '@bossaos/db';
import { IDIOMAS_DE_CONTEUDO, type IdiomaDeConteudo } from '@bossaos/domain';
import { obterBase } from '../../../../../src/servidor.ts';
import { carregarKiosk } from '../../../../../src/kiosk/carregar-kiosk.ts';
import { textosDoKiosk } from '../../../../../src/kiosk/PecasDoKiosk.tsx';

export const dynamic = 'force-dynamic';

/**
 * KIOSK-002 · «¿Qué te apetece hoy?» (atlas p. 215)
 *
 * ── A carta é a MESMA projecção da carta pública, no canal KIOSK ───────────
 *
 * Não há aqui uma segunda leitura do catálogo. É a `cartaPublica` do E09 com
 * `canal = KIOSK`, e por isso o que não está publicado neste canal não existe
 * deste lado — garantia por AUSÊNCIA, e não por um filtro que alguém escreveu
 * duas vezes e acertou uma.
 *
 * O SKU, o custo e a margem não chegam ao ecrã porque a projecção nunca os
 * leu — não porque alguém se lembrou de os tirar.
 */
export default async function KioskMenu({
  params,
}: {
  params: Promise<{ idioma: Idioma; deviceId: string }>;
}) {
  const { idioma, deviceId } = await params;
  const s = textosDoKiosk(idioma);
  const { kiosk, disponibilidade } = await carregarKiosk(deviceId);
  if (!disponibilidade.disponivel) redirect(`/${idioma}/kiosk/${deviceId}/pausado`);

  const conteudo: IdiomaDeConteudo =
    (IDIOMAS_DE_CONTEUDO as readonly string[]).includes(idioma)
      ? (idioma as IdiomaDeConteudo)
      : IDIOMAS_DE_CONTEUDO[0];

  // ── Sem endereço público não há carta, e diz-se ─────────────────────
  //
  // `locationSlug` é anulável porque uma unidade pode não ter endereço público
  // reservado. Um `?? ''` aqui pedia a carta de uma unidade chamada vazio e
  // recebia ausência — indistinguível de «esta casa não publicou nada», que é a
  // confusão que este projecto passa o tempo a fechar.
  const servida = kiosk.locationSlug === null
    ? null
    : await cartaPublica(obterBase(), kiosk.locationSlug, 'KIOSK', conteudo);

  return (
    <div className="bo-pagina">
      <CabecalhoDePagina sobrancelha={kiosk.nome} titulo={s.menu} tela="KIOSK-002" />

      {!servida || servida.carta.categorias.length === 0 ? (
        <p data-teste="carta-vazia">{s.carrinhoVazio}</p>
      ) : (
        servida.carta.categorias.map((c) => (
          <section key={c.id} aria-labelledby={`cat-${c.id}`}>
            <h2 id={`cat-${c.id}`}>{c.nome}</h2>
            <ul className="bo-publico__lista" data-teste="produtos">
              {c.produtos.map((p) => (
                <li key={p.id} className="bo-publico__produto" data-teste="produto">
                  <a
                    className="bo-lista__ligacao"
                    data-seccao="KIOSK-003"
                    href={`/${idioma}/kiosk/${deviceId}/menu/${p.id}`}
                  >
                    <span className="bo-publico__nome">{p.nome}</span>
                    {/* `null` é «sem preço», e mostra-se como tal. Nunca zero:
                        um produto a 0,00 € lê-se como grátis. */}
                    <span className="bo-publico__preco">
                      {p.preco ? formatarDinheiro(p.preco, idioma) : '—'}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <a
        className="bo-lista__ligacao"
        data-seccao="KIOSK-004"
        href={`/${idioma}/kiosk/${deviceId}/carrinho`}
      >
        {s.carrinho}
      </a>
    </div>
  );
}
