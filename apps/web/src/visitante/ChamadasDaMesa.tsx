import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarHora, type Idioma } from '@bossaos/i18n';
import { porChaveDoVisitante, type TextosDoVisitante } from './PecasDoVisitante.tsx';

/**
 * O que esta mesa pediu à sala, e se alguém já viu.
 *
 * ── É esta peça que faz alguém PARAR de carregar ──────────────────────────
 *
 * «Sem a confirmação, quem chamou não sabe se alguém vem, e volta a carregar» —
 * e depois de duas voltas deixa de acreditar no botão e levanta a mão, que é
 * precisamente o que este produto existe para não ser preciso.
 *
 * As três respostas são **diferentes** de propósito: «avisámos agora», «já
 * tínhamos avisado» e «alguém já foi». Colapsá-las numa só — «pedido enviado» —
 * dava a mesma frase a quem carregou pela primeira vez e a quem carregou pela
 * quinta, e nenhuma delas dizia se havia alguém a caminho.
 */
/**
 * O que esta peça precisa de saber de uma chamada — e mais nada.
 *
 * ── Declarado aqui, e não importado do pacote da base ─────────────────────
 *
 * Era um `import type`, que não toca em nada em tempo de execução. Mas a guarda
 * `rotas-com-porta.test.ts` lê o **texto** do ficheiro, e apanhou-o — e ao ir ver
 * percebi que ela tinha razão pelo motivo certo: uma peça de apresentação não
 * deve depender do pacote da base, nem para tipos. A dependência estava ao
 * contrário.
 *
 * (E o nome do pacote não se escreve aqui de propósito: a guarda leria a menção
 * como um uso. Uma guarda que lê texto apanha quem fala do problema — é o preço
 * de ela conseguir ler qualquer forma de import, e é um preço barato.)
 *
 * O que ela desenha é esta forma. Quem lhe passar outra coisa com estes campos
 * funciona igual, que é como uma peça de apresentação deve ser.
 */
export interface ChamadaNoEcra {
  callId: string;
  tipo: string;
  pedidaEm: Date;
  atendidaEm: Date | null;
}

export function RespostaDaChamada({
  avisado, s,
}: {
  avisado: string | null; s: TextosDoVisitante;
}) {
  if (avisado === null) return null;
  const frase = avisado === 'atendida' ? s.jaFoiAtendida
    : avisado === 'ja' ? s.jaTinhamosAvisado
    : s.avisamosAgora;
  return (
    <div data-teste="resposta-da-chamada" data-resposta={avisado}>
      <Aviso tom={avisado === 'atendida' ? 'sucesso' : 'info'} titulo={s.pedidoFeito}>
        {frase}
      </Aviso>
    </div>
  );
}

/** O histórico das chamadas desta mesa, com o estado de cada uma. */
export function ChamadasDaMesa({
  chamadas, idioma, s,
}: {
  chamadas: readonly ChamadaNoEcra[]; idioma: Idioma; s: TextosDoVisitante;
}) {
  return (
    <section aria-labelledby="chamadas">
      <h2 id="chamadas">{s.chamadasDaMesa}</h2>
      {/* Contado antes de afirmar. */}
      <p data-teste="quantas-chamadas">{chamadas.length}</p>
      {chamadas.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-chamadas">{s.semChamadas}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="chamadas">
          {chamadas.map((c) => (
            <li key={c.callId} className="bo-publico__produto" data-teste="chamada"
                data-tipo={c.tipo} data-atendida={c.atendidaEm ? '1' : '0'}>
              <span className="bo-publico__nome">
                {porChaveDoVisitante(s, `tipo${c.tipo}`) ?? c.tipo}
              </span>
              <span className="bo-publico__preco">
                {/* «Ainda ninguém viu» não é uma falha: é o estado honesto, e é
                    diferente de não haver chamada nenhuma. */}
                <Etiqueta tom={c.atendidaEm ? 'sucesso' : 'aviso'}>
                  {c.atendidaEm ? s.chamadaAtendida : s.chamadaPorAtender}
                </Etiqueta>
              </span>
              <p className="bo-publico__descricao">
                {s.chamadaPedidaEm}: {formatarHora(c.pedidaEm, idioma)}
                {c.atendidaEm ? ` · ${formatarHora(c.atendidaEm, idioma)}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
