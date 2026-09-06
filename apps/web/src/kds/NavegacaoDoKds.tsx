import { mensagensDe, type Idioma } from '@bossaos/i18n';

/**
 * A navegação do KDS, numa tabela só — e as ligações levam `data-seccao`.
 *
 * ── Isto não é arrumação: é a correcção que o E15 pagou caro ──────────────
 *
 * No Staff, esta barra escrevia `data-tela` com o id de cada secção. Como
 * aparece em todas as páginas, o marcador de qualquer tela existia em todas
 * elas, e a asserção que afirma «cheguei a esta tela» **não conseguia falhar**.
 * Ao corrigir apareceu que uma das telas nunca tinha tido marcador nenhum.
 *
 * `data-tela` é da página. Uma ligação para uma página não é a página.
 */
export interface SeccaoDoKds {
  rota: string;
  chave: string;
  id: string;
  principal?: true;
}

export const SECCOES_DO_KDS: readonly SeccaoDoKds[] = [
  { rota: '', chave: 'bilhetes', id: 'KDS-002', principal: true },
  { rota: '/comecar', chave: 'comecar', id: 'KDS-004', principal: true },
  { rota: '/prontos', chave: 'tudoPronto', id: 'KDS-005' },
  { rota: '/cursos', chave: 'cursos', id: 'KDS-006' },
  { rota: '/recuperar', chave: 'recuperar', id: 'KDS-007' },
  { rota: '/priorizar', chave: 'priorizar', id: 'KDS-008' },
  { rota: '/tudo', chave: 'tudoAPreparar', id: 'KDS-009', principal: true },
  { rota: '/espera', chave: 'emEspera', id: 'KDS-010', principal: true },
  { rota: '/historico', chave: 'historico', id: 'KDS-011' },
  { rota: '/passe', chave: 'passe', id: 'KDS-012', principal: true },
  { rota: '/saida', chave: 'confirmarSaida', id: 'KDS-013' },
  { rota: '/ajustes', chave: 'ajustarEstacao', id: 'KDS-014', principal: true },
  // KDS-016: quando a impressora não responde, a cozinha lê o talão aqui. Fora
  // desta tabela era uma tela construída e inalcançável — a porta morta ao
  // contrário, e mais cara: existe e ninguém a encontra a meio de um serviço.
  { rota: '/impressao', chave: 'fallbackImpressao', id: 'KDS-016', principal: true },
  { rota: '/ligacao', chave: 'semLigacao', id: 'STATE-012' },
] as const;

/** As telas do KDS que vivem fora de `/[stationId]`. */
export const TELAS_FORA_DA_ESTACAO = [
  { rota: '', chave: 'estacao', id: 'KDS-001' },
  { rota: '/ecras', chave: 'ecras', id: 'KDS-015' },
] as const;

export function NavegacaoDoKds({
  idioma, locationId, stationId, actual,
}: {
  idioma: Idioma; locationId: string; stationId: string; actual: string;
}) {
  const s = mensagensDe(idioma).kdsE16 as unknown as Record<string, string | undefined>;
  const base = `/${idioma}/kds/${locationId}/${stationId}`;
  return (
    <nav className="bo-publico__seccoes" aria-label={s.estacao} data-teste="navegacao">
      {SECCOES_DO_KDS.filter((x) => x.principal).map((x) => (
        <a key={x.rota} href={`${base}${x.rota}`} data-seccao={x.id}
           aria-current={actual === x.rota ? 'page' : undefined}>
          {s[x.chave] ?? x.id}
        </a>
      ))}
      <a href={`/${idioma}/kds/${locationId}`} data-seccao="KDS-001">{s.estacao}</a>
    </nav>
  );
}
