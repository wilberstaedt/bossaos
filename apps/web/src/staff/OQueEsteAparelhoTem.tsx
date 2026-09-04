'use client';

import { useEffect, useState } from 'react';
import { porEnviarNoAparelho } from '@bossaos/fila';

/**
 * Quantos comandos este aparelho tem por enviar — somando TODAS as partições.
 *
 * ── Um número, e nunca o conteúdo ────────────────────────────────────────
 *
 * A casca de «sem rede» é servida a quem quer que tenha o tablet na mão, e pode
 * não ser o dono dos rascunhos. Regra 3 do contrato: o seguinte não lê nome de
 * cliente, linhas nem totais. Um **número** não é conteúdo, e é o que permite ao
 * dono saber que o trabalho dele não se perdeu.
 *
 * É a mesma linha que o DEV-004 traçou no ecrã de revogar, e é a mesma função
 * que a desenha lá — `porEnviarNoAparelho`, num sítio só.
 *
 * `null` enquanto não se leu, e `null` se o armazém não existir: um zero que
 * ninguém mediu é pior do que a ausência, porque tranquiliza.
 */
export function OQueEsteAparelhoTem({
  m,
}: {
  m: { porEnviarNoAparelho: string; ligacaoAjuda: string };
}) {
  const [quantos, setQuantos] = useState<number | null>(null);

  useEffect(() => {
    try { setQuantos(porEnviarNoAparelho(window.localStorage)); } catch { setQuantos(null); }
  }, []);

  return (
    <section aria-labelledby="aparelho">
      <h2 id="aparelho">{m.porEnviarNoAparelho}</h2>
      <p data-teste="por-enviar-no-aparelho">{quantos === null ? '—' : quantos}</p>
      <p className="bo-campo__ajuda">{m.ligacaoAjuda}</p>
    </section>
  );
}
