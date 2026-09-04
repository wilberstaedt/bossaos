import { mensagensDe, type Idioma } from '@bossaos/i18n';

export type TextosDoVisitante = ReturnType<typeof mensagensDe>['visitanteE17'];

export function textosDoVisitante(idioma: Idioma): TextosDoVisitante {
  return mensagensDe(idioma).visitanteE17;
}

/** Uma mensagem escolhida por um valor do modelo. `null` se não a conhece. */
export function porChaveDoVisitante(s: TextosDoVisitante, chave: string): string | null {
  const valor = (s as unknown as Record<string, unknown>)[chave];
  return typeof valor === 'string' ? valor : null;
}

/**
 * O cabeçalho de uma tela do visitante.
 *
 * `data-tela` quer dizer **esta página identifica-se a si própria** — a correcção
 * que o E15 pagou caro e que a régua do E16 mandou não desfazer. As ligações
 * levam `data-seccao`; uma ligação para uma página não é a página.
 */
export function CabecalhoDaVisita({
  sobrancelha, titulo, tela,
}: {
  sobrancelha: string; titulo: string; tela: string;
}) {
  return (
    <div className="bo-estado__cabecalho">
      <div>
        <p className="bo-estado__sobrancelha">{sobrancelha}</p>
        <h1 data-tela={tela}>{titulo}</h1>
      </div>
    </div>
  );
}

/**
 * A navegação da visita, numa tabela só.
 *
 * Sete secções, todas alcançáveis a partir de qualquer uma. Quem está sentado
 * não tem paciência para procurar — e uma tela sem caminho de navegação está tão
 * morta como uma que não existe.
 */
export const SECCOES_DA_VISITA = [
  { rota: '', chave: 'estaVisita', id: 'MENU-011' },
  { rota: '/pedido', chave: 'oTeuPedido', id: 'MENU-007' },
  { rota: '/andamento', chave: 'assimVai', id: 'MENU-010' },
  { rota: '/ajuda', chave: 'comoAjudamos', id: 'MENU-012' },
  { rota: '/conta', chave: 'trazemosAConta', id: 'MENU-013' },
] as const;

export function NavegacaoDaVisita({
  idioma, base, actual,
}: {
  idioma: Idioma; base: string; actual: string;
}) {
  const s = textosDoVisitante(idioma) as unknown as Record<string, string | undefined>;
  return (
    <nav className="bo-publico__seccoes" aria-label={s.estaVisita} data-teste="navegacao">
      {SECCOES_DA_VISITA.map((x) => (
        <a key={x.rota} href={`${base}/mesa${x.rota}`} data-seccao={x.id}
           aria-current={actual === x.rota ? 'page' : undefined}>
          {s[x.chave] ?? x.id}
        </a>
      ))}
      <a href={`${base}/menu`} data-seccao="MENU-001">{s.acrescentar}</a>
    </nav>
  );
}
