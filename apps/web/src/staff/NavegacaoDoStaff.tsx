import { mensagensDe, type Idioma } from '@bossaos/i18n';

/**
 * A navegação do Staff PWA, num sítio só — e a lista completa das telas.
 *
 * Mesma decisão das outras famílias: com a navegação copiada em dezanove
 * ficheiros, o vigésimo ecrã nasce inalcançável e ninguém repara, porque a rota
 * responde na mesma.
 *
 * ── Uma tabela, duas leituras ────────────────────────────────────────────
 *
 * A barra do topo mostra as `principais`. **Isto não é um filtro de conveniência
 * — é a razão de a tabela ser uma só.** Dezassete separadores a 360 px empurram o
 * conteúdo para fora do primeiro ecrã, e a resposta preguiçosa a isso é escolher
 * sete para a barra e deixar as outras dez sem entrada em lado nenhum. Aqui elas
 * estão todas na tabela, o STAFF-022 rende-a inteira, e a prova de navegador
 * caminha por ela: uma tela sem caminho de navegação REPROVA, em vez de ficar a
 * responder a quem souber o endereço de cor.
 */
export interface SeccaoDoStaff {
  rota: string;
  chave: string;
  /** O ID do atlas. Está aqui para a prova poder nomeá-lo, e não para decorar. */
  id: string;
  /** Aparece na barra do topo. As outras vivem no STAFF-022. */
  principal?: true;
}

export const SECCOES_DO_STAFF: readonly SeccaoDoStaff[] = [
  { rota: '', chave: 'turno', id: 'STAFF-001', principal: true },
  { rota: '/zonas', chave: 'zonas', id: 'STAFF-002', principal: true },
  { rota: '/mesas', chave: 'mesas', id: 'STAFF-003', principal: true },
  { rota: '/mesas/nova', chave: 'novaMesa', id: 'STAFF-004' },
  { rota: '/catalogo', chave: 'catalogo', id: 'STAFF-006', principal: true },
  { rota: '/revisao', chave: 'revisao', id: 'STAFF-008' },
  { rota: '/estacoes', chave: 'estacoes', id: 'STAFF-009' },
  { rota: '/andamento', chave: 'andamento', id: 'STAFF-010' },
  { rota: '/cursos', chave: 'cursos', id: 'STAFF-011' },
  { rota: '/entregar', chave: 'entregar', id: 'STAFF-012' },
  { rota: '/avisos', chave: 'avisos', id: 'STAFF-013', principal: true },
  { rota: '/mover', chave: 'moverMesa', id: 'STAFF-014' },
  { rota: '/cancelar', chave: 'cancelarArtigo', id: 'STAFF-017' },
  { rota: '/conta', chave: 'conta', id: 'STAFF-018' },
  { rota: '/procurar', chave: 'procurar', id: 'STAFF-022', principal: true },
  { rota: '/perfil', chave: 'perfil', id: 'STAFF-023', principal: true },
  { rota: '/ligacao', chave: 'ligacao', id: 'STAFF-024', principal: true },
] as const;

/** As duas telas com identificador. Não têm entrada fixa: chegam-se de dentro. */
export const TELAS_COM_IDENTIFICADOR = [
  { rota: '/mesas/[sessionId]', chave: 'mesa', id: 'STAFF-005' },
  { rota: '/catalogo/[produtoId]', chave: 'detalhe', id: 'STAFF-007' },
] as const;

export function NavegacaoDoStaff({
  idioma, locationId, actual,
}: {
  idioma: Idioma; locationId: string; actual: string;
}) {
  const s = mensagensDe(idioma).staffE15 as unknown as Record<string, string | undefined>;
  const base = `/${idioma}/staff/${locationId}`;
  return (
    <nav className="bo-publico__seccoes" aria-label={s.turno} data-teste="navegacao">
      {SECCOES_DO_STAFF.filter((x) => x.principal).map((x) => (
        <a key={x.rota} href={`${base}${x.rota}`} data-tela={x.id}
           aria-current={actual === x.rota ? 'page' : undefined}>
          {s[x.chave] ?? x.id}
        </a>
      ))}
    </nav>
  );
}
