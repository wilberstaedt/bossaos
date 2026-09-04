'use client';

import { useEffect, useState } from 'react';
import type { EntradaDaFila, Particao } from '@bossaos/fila';
import { lerFila } from './fila-do-navegador.ts';

/**
 * STATE-004 · «Estamos sin conexión», como estado e não como notificação.
 *
 * ── E separa os dois estados que não se podem colapsar ───────────────────
 *
 * «Não enviado» (sei que não saiu) e «à espera de confirmação» (saiu, e não sei)
 * contam-se **em separado**. Somá-los num «a sincronizar» é o que leva alguém a
 * carregar outra vez — e a cobrar duas. É a distinção que o contrato nomeia, e
 * um ecrã de diagnóstico que a perdesse não estava a diagnosticar nada.
 */
export function DiagnosticoDaLigacao({
  particao, m,
}: {
  particao: Particao;
  m: {
    semLigacao: string; semLigacaoAjuda: string; comLigacao: string;
    porEnviarNoAparelho: string; suspensos: string; suspensosAjuda: string;
    naoEnviado: string; aguardando: string;
    naoEnviadoAjuda: string; aguardandoAjuda: string;
  };
}) {
  const [online, setOnline] = useState(true);
  const [entradas, setEntradas] = useState<EntradaDaFila[] | null>(null);
  const [suspensas, setSuspensas] = useState(0);

  useEffect(() => {
    void (async () => {
      const fila = await lerFila(particao);
      setEntradas(fila.entradas);
      setSuspensas(fila.suspensasNoAparelho);
    })();
    const ligar = () => setOnline(true);
    const desligar = () => setOnline(false);
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    window.addEventListener('online', ligar);
    window.addEventListener('offline', desligar);
    return () => {
      window.removeEventListener('online', ligar);
      window.removeEventListener('offline', desligar);
    };
  }, [particao]);

  const conta = (estado: string) =>
    entradas === null ? null : entradas.filter((e) => e.estado === estado).length;

  return (
    <section aria-labelledby="ligacao">
      <h2 id="ligacao">{online ? m.comLigacao : m.semLigacao}</h2>
      <p className={`bo-fila__ligacao bo-fila__ligacao--${online ? 'ligado' : 'desligado'}`}
         data-teste="ligacao">
        {online ? m.comLigacao : `${m.semLigacao} — ${m.semLigacaoAjuda}`}
      </p>

      <dl className="bo-publico__contacto">
        <div>
          <dt>{m.naoEnviado}</dt>
          {/* `—` enquanto não se leu. Zero antes da leitura era um número que
              ninguém mediu, e este ecrã existe exactamente para não o dar. */}
          <dd data-teste="conta-nao-enviado">{conta('NAO_ENVIADO') ?? '—'}</dd>
          <dd className="bo-campo__ajuda">{m.naoEnviadoAjuda}</dd>
        </div>
        <div>
          <dt>{m.aguardando}</dt>
          <dd data-teste="conta-aguardando">{conta('PENDENTE_DE_CONFIRMACAO') ?? '—'}</dd>
          <dd className="bo-campo__ajuda">{m.aguardandoAjuda}</dd>
        </div>
        <div>
          <dt>{m.suspensos}</dt>
          <dd data-teste="conta-suspensas">{entradas === null ? '—' : suspensas}</dd>
          <dd className="bo-campo__ajuda">{m.suspensosAjuda}</dd>
        </div>
      </dl>
    </section>
  );
}
