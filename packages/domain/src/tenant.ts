/**
 * Contexto de inquilino, resolvido no servidor.
 *
 * A regra que este ficheiro existe para tornar impossível de esquecer (CT-04):
 *
 * > **A URL selecciona o contexto; não o autentica.**
 *
 * `/la-societat/catalogo` diz qual organização o pedido quer. Não diz que quem
 * pede tem direito a ela. Quem decide é a filiação, resolvida no servidor. Um
 * sistema que confie no segmento do endereço deixa qualquer pessoa trocar uma
 * palavra e entrar na casa do vizinho.
 */

export interface Filiacao {
  organizationId: string;
  organizationSlug: string;
  estado: 'ACTIVO' | 'SUSPENSO' | 'REVOGADO';
}

export interface Alvo {
  /** O que veio do endereço. Dado, não credencial. */
  organizationSlug: string;
  brandId?: string;
  locationId?: string;
}

export interface ContextoDeInquilino {
  organizationId: string;
  organizationSlug: string;
  actorId: string;
  brandId?: string;
  locationId?: string;
}

export type RecusaDeContexto =
  /** Não há filiação nenhuma para este alvo. Ausência, não "proibido". */
  | { tipo: 'sem_filiacao' }
  /** Há filiação, mas está suspensa ou revogada. */
  | { tipo: 'filiacao_inactiva'; estado: Filiacao['estado'] };

export type ResolucaoDeContexto =
  | { ok: true; contexto: ContextoDeInquilino }
  | { ok: false; recusa: RecusaDeContexto };

/**
 * Resolve o contexto a partir do alvo pedido e das filiações do actor.
 *
 * Devolve `sem_filiacao` — e não "proibido" — quando não há relação nenhuma.
 * CT-04: para recurso privado de outro inquilino, **ausência sem revelar
 * existência**. Dizer "não tens permissão nesta organização" confirmaria que ela
 * existe, e isso já é informação.
 */
export function resolverContexto(
  alvo: Alvo,
  actorId: string,
  filiacoes: readonly Filiacao[],
): ResolucaoDeContexto {
  const filiacao = filiacoes.find((f) => f.organizationSlug === alvo.organizationSlug);
  if (!filiacao) return { ok: false, recusa: { tipo: 'sem_filiacao' } };
  if (filiacao.estado !== 'ACTIVO') {
    return { ok: false, recusa: { tipo: 'filiacao_inactiva', estado: filiacao.estado } };
  }

  return {
    ok: true,
    contexto: {
      organizationId: filiacao.organizationId,
      organizationSlug: filiacao.organizationSlug,
      actorId,
      // Marca e unidade entram no contexto como ALVO, não como autorização:
      // pertencerem à organização é a política que garante; poderem ser tocadas
      // por este actor é a porta de autorização, no E04.
      ...(alvo.brandId ? { brandId: alvo.brandId } : {}),
      ...(alvo.locationId ? { locationId: alvo.locationId } : {}),
    },
  };
}
