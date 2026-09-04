import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Etiqueta } from '@bossaos/ui';
import { minutosDecorridos } from '@bossaos/domain';

/** As mensagens do E16, tipadas. Nunca `Record<string, string>`. */
export type TextosDoKds = ReturnType<typeof mensagensDe>['kdsE16'];

export function textosDoKds(idioma: Idioma): TextosDoKds {
  return mensagensDe(idioma).kdsE16;
}

/**
 * Uma mensagem escolhida por um valor do modelo — `tarefa${estado}`.
 *
 * Devolve `null` quando não conhece a chave, para um valor novo do enum aparecer
 * como buraco visível em vez de escorregar para o ecrã em bruto. É a mesma
 * decisão do `porChave` do Staff, e está aqui outra vez porque as duas famílias
 * não partilham ficheiro.
 */
export function porChaveDoKds(s: TextosDoKds, chave: string): string | null {
  const valor = (s as unknown as Record<string, unknown>)[chave];
  return typeof valor === 'string' ? valor : null;
}

/**
 * O cabeçalho de uma tela do KDS.
 *
 * ── `data-tela` quer dizer «esta página identifica-se a si própria» ───────
 *
 * É a correcção que o E15 trouxe, e que a régua do E16 manda **não desfazer**.
 * Lá, a navegação escrevia o id de cada secção em todas as páginas, e o marcador
 * ficava satisfeito em qualquer tela — a asserção que afirma «cheguei aqui» não
 * conseguia falhar. Ligações levam `data-seccao`; só o cabeçalho leva
 * `data-tela`.
 */
export function CabecalhoDoKds({
  sobrancelha, titulo, tela,
}: {
  sobrancelha: string; titulo: string; tela: string;
}) {
  return (
    <div className="bo-estado__cabecalho">
      <div>
        <p className="bo-estado__sobrancelha">{sobrancelha}</p>
        <h1 data-tela={tela}>{titulo}</h1>
      </div>
    </div>
  );
}

/**
 * O tempo de um bilhete. **Do carimbo do servidor, e os dois do servidor.**
 *
 * ── Porque é que o «agora» vem de fora ────────────────────────────────────
 *
 * *«Os temporizadores contam a partir do carimbo do servidor, nunca do relógio
 * do tablet.»* O tablet da cozinha é exactamente o aparelho que ninguém acerta —
 * e com o relógio dele um bilhete velho parecia novo, que é a única coisa que
 * este ecrã existe para dizer.
 *
 * Este componente rende no **servidor** e recebe os dois instantes já medidos
 * lá. Não há aqui um `Date.now()`, e não pode haver: um `Date.now()` num
 * componente de cliente passava despercebido para sempre.
 */
export function TempoDoBilhete({
  criadaEmMs, agoraNoServidorMs, s,
}: {
  criadaEmMs: number; agoraNoServidorMs: number; s: TextosDoKds;
}) {
  const minutos = minutosDecorridos(criadaEmMs, agoraNoServidorMs);
  return (
    <span data-teste="tempo" data-minutos={minutos ?? ''}>
      {/* `null` diz «por medir» e não zero: zero é uma afirmação — «acabou de
          chegar» — e um zero que ninguém mediu é pior do que a frase. */}
      {minutos === null ? s.tempoDesconhecido : `${s.ha} ${minutos} ${s.minutos}`}
    </span>
  );
}

export interface TarefaNoEcra {
  id: string;
  estado: string;
  criadaEm: Date;
  prioridade: number;
  motivoPrioridade: string | null;
  linha: { nome: string; quantidade: number };
  pedido: { numero: string };
  estacao: { nome: string } | null;
}

/** Um bilhete. O estado é dito **por palavras**, e sobrevive a uma recarga. */
export function Bilhete({
  tarefa, agoraNoServidorMs, s, children,
}: {
  tarefa: TarefaNoEcra; agoraNoServidorMs: number; s: TextosDoKds;
  children?: React.ReactNode;
}) {
  return (
    <li className="bo-publico__produto" data-teste="bilhete"
        data-estado={tarefa.estado} data-tarefa={tarefa.id}>
      <span className="bo-publico__nome">
        {tarefa.linha.quantidade}× {tarefa.linha.nome}
      </span>
      <span className="bo-publico__preco">
        {/* Sem som e sem piscar: o estado está escrito, e a recarga volta a
            mostrá-lo. «Um alerta que só existe como apito não é estado.» */}
        <Etiqueta tom={tarefa.estado === 'PRONTA' ? 'sucesso'
          : tarefa.estado === 'EM_PREPARO' ? 'aviso' : 'neutro'}>
          {porChaveDoKds(s, `tarefa${tarefa.estado}`) ?? tarefa.estado}
        </Etiqueta>
      </span>
      <p className="bo-publico__descricao">
        {tarefa.pedido.numero}
        {' · '}
        <TempoDoBilhete criadaEmMs={tarefa.criadaEm.getTime()}
                        agoraNoServidorMs={agoraNoServidorMs} s={s} />
        {tarefa.estacao ? ` · ${tarefa.estacao.nome}` : ''}
        {tarefa.prioridade > 0 && tarefa.motivoPrioridade
          ? ` · ${s.priorizar}: ${tarefa.motivoPrioridade}` : ''}
      </p>
      {children}
    </li>
  );
}
