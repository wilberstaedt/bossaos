'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Particao } from '@bossaos/fila';
import { aoSairDoTurno, lerFila } from './fila-do-navegador.ts';

/**
 * Fechar o turno neste aparelho.
 *
 * ── O número aparece ANTES de se carregar no botão ───────────────────────
 *
 * «Descartar é aceitável quando quem decide sabe o que está a descartar;
 * descobrir depois não é» — está escrito no contrato a propósito da revogação, e
 * vale igual aqui. Quem fecha o turno com três rascunhos por enviar vê o três
 * antes de decidir. O **número** é o que se pode mostrar; o conteúdo não, e é a
 * regra 3 que o diz.
 *
 * E fechar não apaga: opaca. O contador continua a contar o que ficou, porque
 * uma fila que suspende em silêncio parece vazia e o dono conclui que perdeu
 * tudo.
 */
export function FimDoTurno({
  particao, m,
}: {
  particao: Particao;
  m: {
    porEnviarNoAparelho: string; sairAjuda: string; accaoSair: string;
    suspensos: string; suspensosAjuda: string;
  };
}) {
  const [porEnviar, setPorEnviar] = useState<number | null>(null);
  const [suspensas, setSuspensas] = useState(0);

  const recarregar = useCallback(async () => {
    const fila = await lerFila(particao);
    setPorEnviar(fila.entradas.filter(
      (e) => e.estado === 'NAO_ENVIADO' || e.estado === 'PENDENTE_DE_CONFIRMACAO').length);
    setSuspensas(fila.suspensas.length);
  }, [particao]);

  useEffect(() => { void recarregar(); }, [recarregar]);

  return (
    <section aria-labelledby="turno">
      <h2 id="turno">{m.accaoSair}</h2>
      {/* `null` enquanto não se leu o armazém. Um zero antes da leitura era um
          número tranquilizador que ninguém mediu — e ausência não é zero. */}
      <p data-teste="por-enviar-no-aparelho">
        {m.porEnviarNoAparelho}: {porEnviar === null ? '—' : porEnviar}
      </p>
      {suspensas > 0 ? (
        <p data-teste="suspensas">{m.suspensos}: {suspensas} — {m.suspensosAjuda}</p>
      ) : null}
      <p className="bo-campo__ajuda">{m.sairAjuda}</p>
      <div className="bo-estado__accoes">
        <button className="bo-botao bo-botao--secundario" type="button" data-teste="sair"
                onClick={() => void aoSairDoTurno(particao).then(recarregar)}>
          {m.accaoSair}
        </button>
      </div>
    </section>
  );
}
