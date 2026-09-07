'use client';

import { usePathname } from 'next/navigation';
import { EstruturaAdmin, type EstruturaAdminProps } from '@bossaos/ui';

/**
 * O `EstruturaAdmin` a saber em que rota está.
 *
 * ── Porque é que isto é um ficheiro e não uma linha ───────────────────────
 *
 * O item activo da barra tem de sair da ROTA. Quem sabe a rota, no Next, é o
 * `usePathname` — e o `packages/ui` **não conhece o Next de propósito**: é um
 * pacote de interface, e a primeira versão desta correcção importou-lhe o
 * `next/navigation`. O typecheck recusou, e tinha razão.
 *
 * Então a dependência fica do lado da aplicação, que é onde o Next já vive, e o
 * componente de interface recebe um `caminhoActual` que sabe comparar. Uma
 * camada continua a não conhecer a outra.
 */
export function EstruturaAdminDaRota(props: EstruturaAdminProps) {
  return <EstruturaAdmin {...props} caminhoActual={usePathname()} />;
}
