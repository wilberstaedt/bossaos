import { notFound, redirect } from 'next/navigation';
import { Aviso, Botao, Campo, Cartao, Etiqueta, Seletor } from '@bossaos/ui';
import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';
import { deMenorParaTexto } from '@bossaos/domain';
import { CANAIS, listarUnidades, obterProduto, precosDoProduto } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * CAT-010 · "Precios del producto" (atlas p. 62)
 *
 * ── O ecrã inteiro existe para uma frase do contrato ───────────────────────
 *
 * *"Precedência: base da marca → override por unidade → override por canal →
 * override por período. Empate no mesmo nível é conflito, não é sorteio."*
 *
 * Duas decisões daqui:
 *
 * 1. **Nada é resolvido no ecrã.** Cada célula chama `precosDoProduto`, que
 *    chama o motor. Se a página tivesse a sua própria noção de precedência,
 *    haveria duas — e uma delas estaria errada num sítio onde ninguém olha.
 *
 * 2. **O conflito aparece como conflito.** Quando duas regras do mesmo nível se
 *    aplicam, a célula não mostra um preço: mostra a recusa, e mostra os
 *    identificadores das regras em causa. Escolher a primeira que a base
 *    devolvesse seria dar um preço ao cliente por ordem de `INSERT`.
 *
 * O atlas rotula "Heredado" e "Local". É a mesma coisa que o `herdado` do motor,
 * e vem de lá, não de uma comparação feita aqui.
 */
export default async function PrecosDoProduto({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; productId: string }>;
  searchParams: Promise<{ guardado?: string; erro?: string }>;
}) {
  const { idioma, orgSlug, productId } = await params;
  const { guardado, erro } = await searchParams;
  const m = mensagensDe(idioma);
  const c = m.catalogoE07;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const produto = await obterProduto(db, productId);
    if (!produto) return null;
    const unidades = await listarUnidades(db);
    const porUnidade = await Promise.all(
      unidades.map(async (u) => [u, await precosDoProduto(db, productId, u.id)] as const),
    );
    const regras = await db.priceRule.findMany({
      where: { productId },
      select: {
        id: true, montanteMenor: true, moeda: true, locationId: true, canal: true,
        deQuando: true, ateQuando: true,
      },
      orderBy: { montanteMenor: 'asc' },
    });
    return { produto, unidades, porUnidade, regras };
  });
  if (!dados) notFound();

  const { produto, unidades, porUnidade, regras } = dados;
  const base = regras.find((r) => !r.locationId && !r.canal && !r.deQuando);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{c.sobrancelhaPrecos}</p>
          <h1>{produto.nome}</h1>
        </div>
      </div>

      {guardado ? <Aviso tom="sucesso" titulo={c.guardado} /> : null}
      {erro === 'moeda_incompativel' ? <Aviso tom="perigo" titulo={c.moedaIncompativel} urgente /> : null}

      <Cartao>
        <h2 className="bo-planos__nome">{c.precoBase}</h2>
        <form method="post" action={`/api/org/${orgSlug}/produtos/${productId}/precos`} className="bo-forma">
          <input type="hidden" name="idioma" value={idioma} />
          <div className="bo-forma__grelha">
            {/*
              `type="text"` com `inputMode="decimal"`, e não `type="number"`.
              Medido no E02: a validação nativa do `step` rejeita valores antes de
              o JavaScript os ver, e a rejeição é silenciosa. O parser está no
              domínio (`deTextoParaMenor`), que trabalha em dígitos e recusa
              separador de milhares por ser ambíguo — nunca `parseFloat`.
            */}
            {/* `deMenorParaTexto` e não o formatador: o formatado traz
                separador de milhares, e o parser recusa-o por ambíguo — o campo
                voltava vazio para qualquer preço acima de mil. */}
            <Campo
              rotulo={c.precoBase} name="montante" type="text" inputMode="decimal"
              defaultValue={base ? deMenorParaTexto(base.montanteMenor, base.moeda) : ''}
            />
            <Campo rotulo="ISO 4217" name="moeda" defaultValue={base?.moeda ?? ''} maxLength={3} />
            <Seletor rotulo={c.unidade} name="locationId" defaultValue="">
              <option value="">{c.herdado}</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </Seletor>
            <Seletor rotulo={c.canais} name="canal" defaultValue="">
              <option value="">{c.herdado}</option>
              {CANAIS.map((k) => (
                <option key={k} value={k}>
                  {(c as unknown as Record<string, string>)[`canal${k}`] ?? k}
                </option>
              ))}
            </Seletor>
          </div>
          <Botao type="submit">{c.accaoGuardarPrecos}</Botao>
        </form>
        <p className="bo-planos__nota">{c.impostoPorValidar}</p>
      </Cartao>

      {porUnidade.map(([unidade, mapa]) => (
        <Cartao key={unidade.id}>
          <h2 className="bo-planos__nome">{unidade.nome}</h2>
          {/* A mesma marcação da componente Tabela: sem `--adaptavel` e sem o
              envolvente, em telemóvel isto ficava uma tabela espremida em vez de
              cartões — o CT-13 chama-lhe reduzir a tela por escala. */}
          <div className="bo-tabela__envolvente">
          <table className="bo-tabela bo-tabela--adaptavel">
            <caption className="bo-so-leitor">{`${c.tituloPrecos} · ${unidade.nome}`}</caption>
            <thead>
              <tr>
                <th scope="col">{c.colunaCanais}</th>
                <th scope="col">{c.colunaPreco}</th>
                <th scope="col">{c.origem}</th>
              </tr>
            </thead>
            <tbody>
              {CANAIS.map((canal) => {
                const r = mapa.get(canal);
                return (
                  <tr key={canal}>
                    <td data-rotulo={c.colunaCanais}>
                      {(c as unknown as Record<string, string>)[`canal${canal}`] ?? canal}
                    </td>
                    <td data-rotulo={c.colunaPreco}>
                      {r?.ok
                        ? formatarDinheiro(r.preco, idioma)
                        : r?.erro === 'conflito'
                          // Os identificadores em causa vão no ecrã. Sem eles, a
                          // mensagem diz "resolve tu" e não diz o quê.
                          ? `${c.conflitoPreco} (${r.regras.join(', ')})`
                          : r?.erro === 'moeda_incompativel' ? c.moedaIncompativel
                          : r?.erro === 'unidade_sem_moeda' ? c.unidadeSemMoeda
                          : c.semPreco}
                    </td>
                    <td data-rotulo={c.origem}>
                      {r?.ok
                        ? <Etiqueta tom={r.herdado ? 'neutro' : 'info'}>
                            {r.herdado ? c.herdado : c.local}
                          </Etiqueta>
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </Cartao>
      ))}
    </div>
  );
}
