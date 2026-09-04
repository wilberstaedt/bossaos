import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';
import { Etiqueta } from '@bossaos/ui';
import { NavegacaoDoStaff } from './NavegacaoDoStaff.tsx';

/**
 * As peças que se repetem nas 23 telas do Staff.
 *
 * Estão aqui e não copiadas em dezanove ficheiros pela mesma razão da navegação:
 * a linha do pedido carrega a decisão de dinheiro do E14, e uma decisão de
 * dinheiro copiada dezanove vezes fica certa em dezoito sítios.
 */

export type Textos = ReturnType<typeof mensagensDe>['staffE15'];

export function textosDoStaff(idioma: Idioma): Textos {
  return mensagensDe(idioma).staffE15;
}

/**
 * Uma mensagem escolhida por um valor do modelo — `sessao${estado}`, `linha${x}`.
 *
 * ── Devolve `null` quando não conhece a chave ────────────────────────────
 *
 * Não devolve a chave crua nem uma cadeia vazia. Um `sessaoABERTA` a aparecer no
 * ecrã de quem está na sala é ruído, e uma cadeia vazia é pior — desaparece sem
 * ninguém notar que uma tradução falta. `null` obriga quem chama a decidir, e
 * faz um valor novo do enum aparecer como buraco visível em vez de escorregar.
 */
export function porChave(s: Textos, chave: string): string | null {
  const valor = (s as unknown as Record<string, unknown>)[chave];
  return typeof valor === 'string' ? valor : null;
}

/**
 * O motivo de uma recusa, dito por palavras.
 *
 * ── E devolve `null` quando não conhece o motivo ─────────────────────────
 *
 * Não devolve o motivo cru nem uma frase genérica. Um código de recusa a
 * aparecer no ecrã de quem está na sala é ruído, e «algo correu mal» faz tentar
 * outra vez a mesma coisa. `null` deixa quem chama decidir — e obriga a que um
 * motivo novo seja **traduzido** em vez de escorregar para o ecrã em bruto.
 */
export function motivoDaRecusa(idioma: Idioma, motivo: unknown): string | null {
  if (typeof motivo !== 'string') return null;
  const erros = mensagensDe(idioma).staffE15.erros as unknown as Record<string, string>;
  return erros[motivo] ?? null;
}

/** O cabeçalho de todas as telas: onde estás, o que é esta tela, e por onde se sai. */
export function CabecalhoDoStaff({
  idioma, locationId, unidade, titulo, tela, actual,
}: {
  idioma: Idioma; locationId: string; unidade: string;
  titulo: string; tela: string; actual: string;
}) {
  return (
    <>
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade}</p>
          {/* O ID do atlas no DOM. A inspecção afirma-o em cada visita: sem ele,
              uma rota que desviasse mediria outra tela e dizia verde cinco
              vezes — é a lição do arnês do E10. */}
          <h1 data-tela={tela}>{titulo}</h1>
        </div>
      </div>
      <NavegacaoDoStaff idioma={idioma} locationId={locationId} actual={actual} />
    </>
  );
}

export interface LinhaServida {
  id: string;
  nome: string;
  quantidade: number;
  precoMenor: number | null;
  moeda: string | null;
  precoPropostoMenor?: number | null;
  estado: string;
  motivoRejeicao?: string | null;
}

/**
 * Uma linha de pedido — e o sítio onde o E14 **aterra no ecrã do empregado**.
 *
 * ── A divergência de preço vê-se, lado a lado ────────────────────────────
 *
 * A régua do E15 é literal: *«se a divergência só aparecer num log, o E14 foi
 * bem implementado e mal entregue»*. Um rascunho escrito offline traz o preço de
 * quando foi escrito; o servidor confere contra a carta no momento em que aceita;
 * e quando os dois não batem a linha é **rejeitada com o motivo**, não
 * reprecificada em silêncio.
 *
 * Por isso a linha rejeitada por preço mostra os DOIS números — o que o aparelho
 * propôs e o que a carta diz — e não um só com uma etiqueta a dizer que algo
 * correu mal. Com um número só, quem está na mesa não consegue decidir nada, e
 * decidir é exactamente o que se lhe está a pedir.
 */
export function LinhaDoPedido({
  linha, idioma, s,
}: {
  linha: LinhaServida; idioma: Idioma; s: Textos;
}) {
  const divergiu = linha.motivoRejeicao === 'PRECO_DIVERGENTE';
  const oficial = linha.precoMenor !== null && linha.moeda
    ? formatarDinheiro({ montanteMenor: linha.precoMenor, moeda: linha.moeda }, idioma)
    : null;
  const proposto = linha.precoPropostoMenor !== null && linha.precoPropostoMenor !== undefined
      && linha.moeda
    ? formatarDinheiro({ montanteMenor: linha.precoPropostoMenor, moeda: linha.moeda }, idioma)
    : null;

  return (
    <li className="bo-publico__produto" data-teste="linha" data-estado={linha.estado}
        data-motivo={linha.motivoRejeicao ?? ''}>
      <span className="bo-publico__nome">{linha.quantidade}× {linha.nome}</span>
      <span className="bo-publico__preco">
        <Etiqueta tom={linha.estado === 'ACEITE' ? 'sucesso'
          : linha.estado === 'REJEITADA' ? 'perigo' : 'neutro'}>
          {porChave(s, `linha${linha.estado}`) ?? linha.estado}
        </Etiqueta>
      </span>
      {linha.motivoRejeicao ? (
        <p className="bo-publico__descricao" data-teste="motivo">
          {porChave(s, `motivo${linha.motivoRejeicao}`) ?? linha.motivoRejeicao}
        </p>
      ) : null}

      {divergiu ? (
        // Os dois preços LADO A LADO, e não um com um aviso. Quem está na mesa
        // tem de poder decidir, e não dá para decidir com metade dos números.
        <dl className="bo-staff__divergencia" data-teste="divergencia">
          <div>
            <dt>{s.precoProposto}</dt>
            {/* Ausência é ausência: sem número não se escreve zero. */}
            <dd data-teste="preco-proposto">{proposto ?? s.semPrecoNaCarta}</dd>
          </div>
          <div>
            <dt>{s.precoOficial}</dt>
            <dd data-teste="preco-oficial">{oficial ?? s.semPrecoNaCarta}</dd>
          </div>
          <p className="bo-campo__ajuda" data-teste="divergiu">{s.divergiu}</p>
        </dl>
      ) : (
        oficial ? <p className="bo-publico__descricao">{oficial}</p> : null
      )}
    </li>
  );
}

/** O total de um pedido. `null` diz que não há conta, e não que a conta é zero. */
export function TotalDoPedido({
  total, idioma, s,
}: {
  total: { montanteMenor: number; moeda: string } | null; idioma: Idioma; s: Textos;
}) {
  return total === null ? (
    <p className="bo-campo__ajuda" data-teste="sem-total">{s.semTotal}</p>
  ) : (
    <p className="bo-staff__total" data-teste="total">
      <strong>{s.total}</strong>: {formatarDinheiro(total, idioma)}
    </p>
  );
}
