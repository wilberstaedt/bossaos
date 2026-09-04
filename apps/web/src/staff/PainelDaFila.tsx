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
  semRede: string; semRedeTitulo: string;
}

export function PainelDaFila({
  particao, orgSlug, locationSlug, idioma, m, produtoDeTeste,
}: {
  particao: Particao;
  orgSlug: string;
  locationSlug: string;
  idioma: string;
  m: Mensagens;
  /** Um produto para compor, quando o ecrã oferece isso. */
  produtoDeTeste?: { id: string; nome: string } | null;
}) {
  const [entradas, setEntradas] = useState<EntradaDaFila[]>([]);
  const [suspensas, setSuspensas] = useState<EntradaDaFila[]>([]);
  const [online, setOnline] = useState(true);
  const [recusa, setRecusa] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    const fila = await lerFila(particao);
    setEntradas(fila.entradas);
    setSuspensas(fila.suspensas);
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
      linhas: [{ productId: produtoDeTeste.id, quantidade: 1 }],
    });
    // Gravou. **Só depois** se tenta enviar — e o ecrã reflecte o que está
    // gravado, não o que se esperava que acontecesse.
    await recarregar();
    await sincronizar();
  };

  const tentarAccaoFinanceira = () => {
    const r = podeOffline('pagamento');
    // Offline não faz pagamento **por desenho**. A recusa é dita, e não
    // enfileirada: enfileirar prometia que ia acontecer.
    setRecusa(r.pode ? null : m.semRede);
  };

  const sincronizar = async () => {
    const fila = await sincronizarAgora(particao, orgSlug);
    setEntradas(fila.entradas);
    setSuspensas(fila.suspensas);
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

      {suspensas.length > 0 ? (
        <p className="bo-fila__suspensas" data-teste="suspensas">
          {/* Contadas, nunca apagadas. Uma fila que suspende em silêncio parece
              vazia — e o dono conclui que perdeu o trabalho. */}
          {m.suspensos}: {suspensas.length} — {m.suspensosAjuda}
        </p>
      ) : null}

      {recusa ? (
        <p className="bo-aviso bo-aviso--perigo" role="alert" data-teste="recusa-offline">
          <strong>{m.semRedeTitulo}</strong> — {recusa}
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
