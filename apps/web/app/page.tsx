import { cores, espaco } from '@bossaos/ui';

export const dynamic = 'force-static';

/**
 * Página única da base executável.
 *
 * Não há menu, nem módulos, nem rotas de telas que ainda não existem — o E01
 * proíbe-o em voz alta, e com razão: 396 rotas vazias dão a sensação de produto
 * feito e escondem que nenhuma delas serve nada.
 */
export default function Pagina() {
  return (
    <main style={{ padding: espaco.xl, maxWidth: 640 }}>
      <h1 style={{ margin: 0, fontSize: 28, letterSpacing: -0.5 }}>BossaOS</h1>
      <p style={{ color: cores.textoSuave, lineHeight: 1.6 }}>
        Base executável. As telas do produto entram nas etapas que as desenham.
      </p>
      <ul style={{ color: cores.textoSuave, lineHeight: 1.8, paddingLeft: espaco.md }}>
        <li>
          <code>/api/health</code> — o processo responde
        </li>
        <li>
          <code>/api/ready</code> — a base responde e o schema chegou
        </li>
      </ul>
    </main>
  );
}
