'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EntradaDaFila, Particao } from '@bossaos/fila';
import { podeOffline } from '@bossaos/fila';
import { compor, lerFila, sincronizarAgora } from './fila-do-navegador.ts';

/**
 * O painel da fila local — e o sítio onde esta etapa se ganha ou se perde.
 *
 * ── Os quatro estados distinguem-se SEM som e SEM toast ──────────────────
 *
 * A régua é explícita: *«se a única diferença entre dois deles for uma
 * notificação que já passou, não são quatro estados: são dois e uma esperança»*.
 * Aqui cada entrada tem o estado escrito por palavras, num elemento que sobrevive
 * à recarga porque vem do `localStorage` — não de um `useState` que a recarga
 * apaga.
 *
 * ── E nunca diz «enviado» sobre o que só está gravado aqui ───────────────
 *
 * *Respeite 1.* «Não enviado» é literal: está neste telemóvel e não saiu. O
 * ecrã só passa a «confirmado» depois de o servidor responder — e entre os dois há
 * «à espera de confirmação», que é o estado honesto de quem enviou e não sabe.
 */

const TEXTOS: Record<string, string> = {
  NAO_ENVIADO: 'naoEnviado',
  PENDENTE_DE_CONFIRMACAO: 'aguardando',
  CONFIRMADO: 'confirmado',
  CONFLITO: 'conflito',
};

export interface Mensagens {
  naoEnviado: string; aguardando: string; confirmado: string; conflito: string;
  naoEnviadoAjuda: string; aguardandoAjuda: string; conflitoAjuda: string;
  semLigacao: string; semLigacaoAjuda: string; comLigacao: string;
  porEnviar: string; suspensos: string; suspensosAjuda: string;
  comandos: string; semComandos: string;
  accaoSincronizar: string; accaoCompor: string;
  semRede: string; semRedeTitulo: string; pagamentoNoServidor: string;
}

export function PainelDaFila({
  particao, orgSlug, locationSlug, idioma, m, produtoDeTeste,
}: {
  particao: Particao;
  orgSlug: string;
  locationSlug: string;
  idioma: string;
  m: Mensagens;
  /**
   * O produto que este ecrã oferece compor, com o preço da carta AGORA.
   *
   * O preço vai no rascunho como **proposta**, e é o que o servidor confere ao
   * aceitar. `null` é um prato sem preço na carta — que não é grátis, e por isso
   * não vira zero pelo caminho.
   */
  produtoDeTeste?: {
    id: string; nome: string; precoMenor?: number | null; moeda?: string | null;
  } | null;
}) {
  const [entradas, setEntradas] = useState<EntradaDaFila[]>([]);
  // Um NÚMERO, e não a lista: as de outra pessoa não se leem, contam-se.
  const [suspensas, setSuspensas] = useState(0);
  const [online, setOnline] = useState(true);
  const [recusa, setRecusa] = useState<string | null>(null);
  const [noServidor, setNoServidor] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    const fila = await lerFila(particao);
    setEntradas(fila.entradas);
    setSuspensas(fila.suspensasNoAparelho);
  }, [particao]);

  useEffect(() => {
    // A leitura acontece ao montar, e é do ARMAZÉM. É isto que faz o estado
    // sobreviver a um F5 — a régua reprova «estado só em memória» à cabeça.
    void recarregar();
    const ligar = () => setOnline(true);
    const desligar = () => setOnline(false);
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    window.addEventListener('online', ligar);
    window.addEventListener('offline', desligar);
    return () => {
      window.removeEventListener('online', ligar);
      window.removeEventListener('offline', desligar);
    };
  }, [recarregar]);

  const acrescentar = async () => {
    if (!produtoDeTeste) return;
    await compor(particao, 'pedido.enviar', {
      idioma, locationSlug,
      linhas: [{
        productId: produtoDeTeste.id,
        quantidade: 1,
        // O preço de QUANDO SE ESCREVEU. Guardá-lo é o que torna a divergência
        // detectável mais tarde: sem ele o servidor aceitava a qualquer preço, e
        // quem estava na mesa nunca saberia que a carta tinha mudado.
        ...(typeof produtoDeTeste.precoMenor === 'number'
          ? { precoPropostoMenor: produtoDeTeste.precoMenor } : {}),
      }],
    });
    // Gravou. **Só depois** se tenta enviar — e o ecrã reflecte o que está
    // gravado, não o que se esperava que acontecesse.
    await recarregar();
    await sincronizar();
  };

  const tentarAccaoFinanceira = () => {
    // ── Duas coisas diferentes, e é preciso cruzá-las ────────────────────
    //
    // `podeOffline` responde sobre a ACÇÃO: pagamento exige servidor, logo
    // devolve sempre «não». Mostrar essa recusa sem olhar à rede fazia o ecrã
    // dizer «não se pode fazer sem conexão» **com conexão** — e, pior, fazia o
    // caso de prova do E15 dar verde a clicar no botão com a rede ligada.
    //
    // Uma prova que passa com e sem a lógica que diz medir não está a medir
    // nada. O defeito era meu e estava na entrega e no instrumento ao mesmo
    // tempo, que é a combinação que não faz barulho nenhum a passar.
    const exige = !podeOffline('pagamento').pode;
    const semRede = typeof navigator !== 'undefined' && navigator.onLine === false;
    // Sem rede: recusa com o motivo, e **nada entra na fila** — enfileirar
    // prometia que ia acontecer. Com rede: a verdade, que é que quem cobra é o
    // servidor e este ecrã não cobra.
    setRecusa(exige && semRede ? m.semRede : null);
    setNoServidor(exige && !semRede ? m.pagamentoNoServidor : null);
  };

  const sincronizar = async () => {
    const fila = await sincronizarAgora(particao, orgSlug);
    setEntradas(fila.entradas);
    setSuspensas(fila.suspensasNoAparelho);
  };

  const porEnviar = entradas.filter(
    (e) => e.estado === 'NAO_ENVIADO' || e.estado === 'PENDENTE_DE_CONFIRMACAO');

  return (
    <section className="bo-fila" aria-labelledby="fila">
      <h2 id="fila">{m.comandos}</h2>

      {/* STATE-004 · «Estamos sem conexión». Um estado, e não um toast: fica no
          ecrã enquanto durar, e a recarga volta a mostrá-lo. */}
      <p className={`bo-fila__ligacao bo-fila__ligacao--${online ? 'ligado' : 'desligado'}`}
         data-teste="ligacao">
        {online ? m.comLigacao : m.semLigacao}
        {online ? '' : ` — ${m.semLigacaoAjuda}`}
      </p>

      <p data-teste="por-enviar">{m.porEnviar}: {porEnviar.length}</p>

      {entradas.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="fila-vazia">{m.semComandos}</p>
      ) : (
        <ul className="bo-lista" data-teste="entradas">
          {entradas.map((e) => (
            <li key={e.commandId} data-teste="entrada" data-estado={e.estado}>
              {/* O estado POR PALAVRAS. Sem som, sem toast, e sobrevive ao F5. */}
              <strong data-teste="estado">{m[TEXTOS[e.estado] as keyof Mensagens]}</strong>
              {e.estado === 'NAO_ENVIADO' ? ` — ${m.naoEnviadoAjuda}` : ''}
              {e.estado === 'PENDENTE_DE_CONFIRMACAO' ? ` — ${m.aguardandoAjuda}` : ''}
              {e.estado === 'CONFLITO' ? ` — ${m.conflitoAjuda}` : ''}
              {' · '}<code>{e.commandId.slice(0, 8)}</code>
            </li>
          ))}
        </ul>
      )}

      {suspensas > 0 ? (
        <p className="bo-fila__suspensas" data-teste="suspensas">
          {/* Contadas, nunca apagadas. Uma fila que suspende em silêncio parece
              vazia — e o dono conclui que perdeu o trabalho. */}
          {m.suspensos}: {suspensas} — {m.suspensosAjuda}
        </p>
      ) : null}

      {recusa ? (
        <p className="bo-aviso bo-aviso--perigo" role="alert" data-teste="recusa-offline">
          <strong>{m.semRedeTitulo}</strong> — {recusa}
        </p>
      ) : null}

      {noServidor ? (
        <p className="bo-aviso bo-aviso--info" role="alert" data-teste="pagamento-no-servidor">
          <strong>{m.semRedeTitulo}</strong> — {noServidor}
        </p>
      ) : null}

      <div className="bo-estado__accoes">
        {produtoDeTeste ? (
          <button className="bo-botao bo-botao--primario" type="button"
                  data-teste="compor" onClick={() => void acrescentar()}>
            {m.accaoCompor}
          </button>
        ) : null}
        <button className="bo-botao bo-botao--secundario" type="button"
                data-teste="sincronizar" onClick={() => void sincronizar()}>
          {m.accaoSincronizar}
        </button>
        <button className="bo-botao bo-botao--secundario" type="button"
                data-teste="pagar" onClick={tentarAccaoFinanceira}>
          {m.semRedeTitulo}
        </button>
      </div>
    </section>
  );
}
