'use client';

import { useEffect, useState } from 'react';
import type { EntradaDaFila, Particao } from '@bossaos/fila';
import { lerFila } from './fila-do-navegador.ts';

/**
 * STAFF-008 · o que está neste aparelho e ainda não saiu.
 *
 * ── Conta ANTES de afirmar ───────────────────────────────────────────────
 *
 * «Verde sobre fila vazia» é o primeiro item do que a régua reprova à cabeça. A
 * tela escreve **quantos** comandos existem antes de dizer o que quer que seja
 * sobre eles — e quando não existe nenhum, di-lo por palavras em vez de mostrar
 * uma lista vazia que se confunde com «não carregou».
 */
const TEXTOS: Record<string, string> = {
  NAO_ENVIADO: 'naoEnviado',
  PENDENTE_DE_CONFIRMACAO: 'aguardando',
  CONFIRMADO: 'confirmado',
  CONFLITO: 'conflito',
};

export function RevisaoDaFila({
  particao, m,
}: {
  particao: Particao;
  m: {
    naoEnviado: string; aguardando: string; confirmado: string; conflito: string;
    nadaPorRever: string; comandos: string; suspensos: string; suspensosAjuda: string;
  };
}) {
  const [entradas, setEntradas] = useState<EntradaDaFila[]>([]);
  const [suspensas, setSuspensas] = useState(0);
  const [lido, setLido] = useState(false);

  useEffect(() => {
    void (async () => {
      const fila = await lerFila(particao);
      setEntradas(fila.entradas);
      setSuspensas(fila.suspensasNoAparelho);
      setLido(true);
    })();
  }, [particao]);

  const porRever = entradas.filter(
    (e) => e.estado === 'NAO_ENVIADO' || e.estado === 'PENDENTE_DE_CONFIRMACAO');

  return (
    <section aria-labelledby="revisao">
      <h2 id="revisao">{m.comandos}</h2>
      <p data-teste="por-rever">{porRever.length}</p>
      {lido && porRever.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="nada-por-rever">{m.nadaPorRever}</p>
      ) : (
        <ul className="bo-lista" data-teste="revisao">
          {porRever.map((e) => (
            <li key={e.commandId} data-teste="entrada" data-estado={e.estado}>
              <strong>{m[TEXTOS[e.estado] as keyof typeof m]}</strong>
              {' · '}<code>{e.commandId.slice(0, 8)}</code>
            </li>
          ))}
        </ul>
      )}
      {suspensas > 0 ? (
        <p data-teste="suspensas">{m.suspensos}: {suspensas} — {m.suspensosAjuda}</p>
      ) : null}
    </section>
  );
}
