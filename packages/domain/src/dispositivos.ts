/**
 * Os números que governam dispositivos e PIN (E13).
 *
 * ── Porque é que vivem no domínio e não na camada de dados ────────────────
 *
 * São **política**, não persistência: quantas tentativas antes de bloquear,
 * quanto tempo dura um código de pareamento. Estavam em `packages/db`, e a
 * guarda `rotas-com-porta` apanhou a consequência — o ecrã que só queria mostrar
 * «este código expira em 15 minutos» passava a importar de `@bossaos/db`, e uma
 * página que importa a camada de dados sem resolver a sessão é exactamente o que
 * essa guarda existe para impedir.
 *
 * A guarda estava certa e o arranjo não é dela: é mover o número para onde ele
 * pertence. Uma página pode ler política; não pode alcançar a base.
 */

/** Quantas tentativas de PIN antes de bloquear. */
export const TENTATIVAS_ATE_BLOQUEAR = 5;

/** Quanto tempo o bloqueio dura, em minutos. */
export const MINUTOS_DE_BLOQUEIO = 15;

/**
 * Quanto tempo um código de pareamento vale.
 *
 * Curto de propósito: é lido em voz alta ou copiado de um ecrã para outro, ali
 * ao lado. Um código válido durante horas é um código que fica escrito num papel
 * em cima do balcão.
 */
export const MINUTOS_DE_PAREAMENTO = 15;
