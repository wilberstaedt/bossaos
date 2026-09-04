/**
 * O pedido de contacto vindo do site público.
 *
 * ── O aceite 2, e porque é o mais caro dos três ────────────────────────────
 *
 * > *«Lead válido guarda-se uma vez; falha real não mostra sucesso.»*
 *
 * O sénior escreveu na régua que este é o defeito mais caro **porque perde
 * dinheiro sem fazer barulho**. Ninguém abre um bilhete a dizer "o formulário
 * disse obrigado e o lead não chegou": o cliente pensa que enviou, o restaurante
 * nunca soube, e não há erro em lado nenhum para alguém encontrar.
 *
 * Duas coisas separadas, e as duas vivem fora deste ficheiro tanto quanto dentro:
 *
 * 1. **guardar uma vez** — a decisão é da restrição única da base, nunca de um
 *    `if`. Duas submissões simultâneas lêem as duas "não existe" e gravam as
 *    duas. Aqui só se fabrica a chave;
 * 2. **falha não mostra sucesso** — é a rota que tem de deixar o erro subir. Um
 *    `catch` que engole e devolve "obrigado" é exactamente o defeito.
 */

import { createHash } from 'node:crypto';

export const ORIGENS = ['site', 'carta', 'qr', 'demo'] as const;
export type OrigemDeLead = (typeof ORIGENS)[number];

export interface LeadSubmetido {
  nome: string;
  email: string;
  telefone?: string | null;
  mensagem: string;
  origem: OrigemDeLead;
}

export type RecusaDeLead =
  | { campo: 'nome'; motivo: 'vazio' }
  | { campo: 'mensagem'; motivo: 'vazio' | 'longa_demais' }
  | { campo: 'email'; motivo: 'vazio' | 'forma' }
  | { campo: 'origem'; motivo: 'desconhecida' };

/** O limite existe para o campo não virar um canal de carregamento. */
export const MAXIMO_DA_MENSAGEM = 4000;

/**
 * Valida sem inventar. **Não corrige** o que recebe: um formulário que "arranja"
 * o email do cliente em silêncio grava um endereço para onde ninguém responde.
 */
export function validarLead(entrada: LeadSubmetido): RecusaDeLead[] {
  const recusas: RecusaDeLead[] = [];
  if (entrada.nome.trim() === '') recusas.push({ campo: 'nome', motivo: 'vazio' });
  if (entrada.mensagem.trim() === '') recusas.push({ campo: 'mensagem', motivo: 'vazio' });
  if (entrada.mensagem.length > MAXIMO_DA_MENSAGEM) {
    recusas.push({ campo: 'mensagem', motivo: 'longa_demais' });
  }

  const email = entrada.email.trim();
  if (email === '') {
    recusas.push({ campo: 'email', motivo: 'vazio' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    // Deliberadamente frouxa. Um padrão apertado recusa endereços válidos, e um
    // endereço válido recusado é um cliente perdido — o erro caro é ao contrário
    // do que parece. Quem decide mesmo se o endereço existe é o servidor de
    // correio, e isso não se sabe aqui.
    recusas.push({ campo: 'email', motivo: 'forma' });
  }

  if (!(ORIGENS as readonly string[]).includes(entrada.origem)) {
    recusas.push({ campo: 'origem', motivo: 'desconhecida' });
  }
  return recusas;
}

/**
 * A chave que faz "guarda-se uma vez" ser da base.
 *
 * ── Porque é do CONTEÚDO e do DIA, e não de um número aleatório ───────────
 *
 * Um número gerado pelo formulário resolve o duplo clique e mais nada: quem
 * recarrega a página recebe um número novo e grava um segundo lead com o mesmo
 * texto. E o duplo clique **é** o caso que a régua nomeia, mas não é o único que
 * acontece a sério.
 *
 * Do conteúdo e do dia: o duplo clique e o recarregar colapsam na mesma linha, e
 * um cliente que volta a escrever daqui a duas semanas **não** é engolido — que
 * seria o defeito ao contrário, e mais caro, porque perde um pedido verdadeiro.
 *
 * O email entra em minúsculas porque `Ana@x.com` e `ana@x.com` são a mesma
 * pessoa a carregar duas vezes no botão.
 */
export function chaveDeLead(entrada: {
  locationId: string;
  email: string;
  mensagem: string;
  dia: Date;
}): string {
  const dia = entrada.dia.toISOString().slice(0, 10);
  const material = [
    entrada.locationId,
    entrada.email.trim().toLowerCase(),
    entrada.mensagem.trim(),
    dia,
  ].join(' ');
  return createHash('sha256').update(material).digest('hex');
}
