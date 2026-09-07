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

/**
 * ── `data-seccao`, e NÃO `data-tela` ─────────────────────────────────────
 *
 * As ligações desta barra escreviam `data-tela` com o id da secção. Como a barra
 * aparece em **todas** as páginas do Staff, o marcador de qualquer tela existia
 * em todas elas — e a prova que afirma «cheguei a esta tela» era satisfeita pela
 * navegação, em qualquer tela. Degradar o cabeçalho de uma página deixava-a
 * verde.
 *
 * Encontrou-o o sénior, degradando o marcador em duas telas e vendo a prova
 * aguentar. A ironia está no comentário por cima do próprio `h1`: *«sem ele, uma
 * rota que desviasse mediria outra tela e dizia verde cinco vezes»* — e era esta
 * barra que tornava essa protecção inerte.
 *
 * A correcção é no **nome** e não no selector da prova: `data-tela` passa a
 * querer dizer *esta página identifica-se a si própria*, e uma ligação para uma
 * página não é a página. Corrigir o selector deixava o atributo a significar
 * duas coisas — e a próxima prova a escrevê-lo caía no mesmo buraco.
 */
export function NavegacaoDoStaff({
  idioma, locationId, actual,
}: {
  idioma: Idioma; locationId: string; actual: string;
}) {
  const s = mensagensDe(idioma).staffE15 as unknown as Record<string, string | undefined>;
  const base = `/${idioma}/staff/${locationId}`;
  return (
    <nav className="bo-seccoes" aria-label={s.seccoes ?? s.turno} data-teste="navegacao">
      {/* ── A secção actual sai da barra ────────────────────────────────────
          Uma entrada que navega para onde já se está não é navegação. E o custo
          de a manter não era teórico: o título da página e a primeira pastilha
          usavam a MESMA cadeia (`staffE15.turno`), e o ecrã dizia «Tu turno, a
          la vista» duas vezes — foi a primeira queixa do dono do produto.

          Podia ter dado um rótulo curto próprio ao item do turno, e resolvia
          esta instância. Isto resolve a CLASSE: a tela principal seguinte que
          alguém acrescentar não repete o defeito, porque a barra deixa de poder
          mostrar aquilo onde já se está.

          O `aria-current` sai com ela, e é coerente: ele existia para dizer «a
          página é esta», e quem o diz agora é o `h1`. */}
      {SECCOES_DO_STAFF.filter((x) => x.principal && x.rota !== actual).map((x) => (
        <a key={x.rota} href={`${base}${x.rota}`} data-seccao={x.id}>
          {s[x.chave] ?? x.id}
        </a>
      ))}
    </nav>
  );
}
