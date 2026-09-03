import { notFound, redirect } from 'next/navigation';
import { Aviso, Botao, Cartao, Etiqueta, Seletor } from '@bossaos/ui';
import { formatarData, mensagensDe, type Idioma } from '@bossaos/i18n';
import { fichaDeAlergeniosDoProduto, obterProduto } from '@bossaos/db';
import { PREFERENCIAS, revisaoDaFicha } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-013 · "Alérgenos del producto" (atlas p. 65)
 *
 * ── A divergência do atlas, e é a mais importante desta etapa ───────────────
 *
 * O atlas desenha cada alérgeno com um **caixote de visto**: marcado em
 * "Contiene" e "Revisar receta", desmarcado em "No declarado". Um caixote tem
 * dois estados e o modelo tem **quatro**. E o pior não é a falta de espaço: é
 * que **um caixote desmarcado lê-se como "não"**, e "no declarado" ficaria a
 * dizer "não contém" a quem passasse os olhos. É exactamente a confusão que a
 * etapa existe para impedir.
 *
 * Cada linha é um selector com os quatro estados por extenso, e "sin declarar"
 * é a **opção seleccionada** quando não há declaração — visível, e não uma
 * ausência que se confunde com um "não".
 *
 * ── E a nota que a tela existe para dizer ──────────────────────────────────
 *
 * *"BossaOS não deduz alérgenos do nome nem das fotos."* Vai em primeiro lugar
 * porque quem preenche isto tem de saber que o sistema **não** o ajuda a
 * adivinhar — e que o campo em branco não é uma resposta que ele deu.
 */
export default async function AlergenosDoProduto({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; productId: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { idioma, orgSlug, productId } = await params;
  const { guardado } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.catalogoE07;

  // O código é a chave estável na base; o nome é o que a pessoa lê. Uma ficha
  // que dissesse "frutos-de-casca" a um cliente inglês não é uma ficha.
  const nomeDoAlergenio = (codigo: string): string =>
    (m.alergenios as unknown as Record<string, string>)[codigo] ?? codigo;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const produto = await obterProduto(db, productId);
    if (!produto) return null;
    return { produto, ficha: await fichaDeAlergeniosDoProduto(db, productId) };
  });
  if (!dados) notFound();

  const { produto, ficha } = dados;
  const declaracoes = ficha
    .filter((l) => l.estado !== 'DESCONHECIDO')
    .map((l) => ({
      alergenio: l.alergenio,
      estado: l.estado as 'CONTEM' | 'PODE_CONTER' | 'NAO_CONTEM',
      ...(l.revistoPor ? { revistoPor: l.revistoPor } : {}),
      ...(l.revistoEm ? { revistoEm: l.revistoEm } : {}),
    }));
  const revisao = revisaoDaFicha(declaracoes, ficha.map((l) => l.alergenio));
  const porDeclarar = ficha.filter((l) => l.estado === 'DESCONHECIDO').length;
  const rotulo = (e: string) => (c as unknown as Record<string, string>)[`estado${e}`] ?? e;

  return (
    <div className="bo-pagina">
      <form method="post" action={`/api/org/${orgSlug}/produtos/${productId}/alergenos`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />

        <div className="bo-estado__cabecalho">
          <div>
            <p className="bo-estado__sobrancelha">{c.sobrancelhaAlergenos} · {produto.nome}</p>
            <h1>{c.tituloAlergenos}</h1>
          </div>
          <Botao type="submit">{c.accaoGuardarAlergenos}</Botao>
        </div>

        {guardado ? <Aviso tom="sucesso" titulo={c.guardado} /> : null}
        <Aviso tom="aviso" titulo={c.sobrancelhaAlergenos}>{c.avisoNaoInferimos}</Aviso>

        <p className="bo-planos__actual">
          {porDeclarar > 0 ? c.porDeclarar.replace('{n}', String(porDeclarar)) : c.fichaCompleta}
          {revisao.ultimaRevisao
            ? ` · ${c.revistoPor} ${formatarData(revisao.ultimaRevisao, idioma)}`
            : ` · ${c.semRevisao}`}
        </p>

        <div className="bo-plataforma__lista">
          {ficha.map((l) => (
            <Cartao key={l.alergenio} className="bo-alergenio">
              <div className="bo-horario__cabecalho">
                <span className="bo-tema__rotulo">{nomeDoAlergenio(l.alergenio)}</span>
                {/* Etiqueta com TEXTO, nunca só um símbolo: um visto ausente
                    lê-se como "não", e é essa leitura que se está a evitar. */}
                <Etiqueta tom={
                  l.estado === 'CONTEM' ? 'perigo'
                  : l.estado === 'PODE_CONTER' ? 'aviso'
                  : l.estado === 'NAO_CONTEM' ? 'sucesso' : 'neutro'
                }>
                  {rotulo(l.estado)}
                </Etiqueta>
              </div>
              <Seletor rotulo={nomeDoAlergenio(l.alergenio)} name={`estado_${l.alergenio}`} defaultValue={l.estado}>
                {/* "Sin declarar" é uma OPÇÃO, não a ausência de escolha. */}
                <option value="DESCONHECIDO">{c.estadoDESCONHECIDO}</option>
                <option value="CONTEM">{c.estadoCONTEM}</option>
                <option value="PODE_CONTER">{c.estadoPODE_CONTER}</option>
                <option value="NAO_CONTEM">{c.estadoNAO_CONTEM}</option>
              </Seletor>
              {l.revistoPor ? (
                <p className="bo-uso__nota">
                  {c.revistoPor} {l.revistoPor}
                  {l.revistoEm ? ` · ${formatarData(l.revistoEm, idioma)}` : ''}
                </p>
              ) : null}
            </Cartao>
          ))}
        </div>

        <p className="bo-planos__nota">{c.notaAlergenos}</p>

        <Cartao titulo={c.preferencias}>
          <div className="bo-forma__grelha">
            {PREFERENCIAS.map((p) => (
              <label key={p} className="bo-planos__item">
                <input type="checkbox" name="preferencia" value={p}
                       defaultChecked={produto.preferencias.some((x) => x.codigo === p)} />
                <span>{(m.preferenciasAlimentares as unknown as Record<string, string>)[p] ?? p}</span>
              </label>
            ))}
          </div>
          {/* A separação, dita por extenso onde as duas coisas se tocam no ecrã. */}
          <p className="bo-uso__nota">{c.notaPreferencias}</p>
        </Cartao>
      </form>
    </div>
  );
}
