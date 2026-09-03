import { Seletor } from '@bossaos/ui';

/**
 * Um selector cuja primeira opção é **não ter escolhido**.
 *
 * Existe para não haver forma de escrever um selector sem ela. A alternativa —
 * lembrar-se de pôr `<option value="">` em cada um dos onze do E06 — é a mesma
 * família do portão da flag do E05: uma regra que depende de quem passa se
 * lembrar não é uma regra.
 */
export function CampoPorEscolher({
  rotulo, name, opcoes, valor, rotuloVazio, obrigatorio = false, ajuda,
}: {
  rotulo: string;
  name: string;
  opcoes: readonly string[];
  valor: string | null | undefined;
  rotuloVazio: string;
  obrigatorio?: boolean;
  ajuda?: string;
}) {
  return (
    <Seletor
      rotulo={rotulo}
      name={name}
      defaultValue={valor ?? ''}
      required={obrigatorio}
      {...(ajuda ? { ajuda } : {})}
    >
      {/* Sempre primeira, sempre vazia. Sem ela o browser escolhe a de cima. */}
      <option value="">{rotuloVazio}</option>
      {opcoes.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </Seletor>
  );
}
