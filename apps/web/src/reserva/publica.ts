import { notFound } from 'next/navigation';
import { unidadePublica, type UnidadePublica } from '@bossaos/db';
import { obterBase } from '../servidor.ts';

/**
 * O que todas as telas do fluxo público carregam, e carregam igual.
 *
 * ── Uma unidade não publicada dá AUSÊNCIA ─────────────────────────────────
 *
 * Não «proibido»: `notFound()`. A diferença entre 404 e «existe mas não podes» é
 * um oráculo de existência, e do lado da rua isso é um catálogo de restaurantes
 * que ainda não abriram.
 */
export async function unidadeDoEndereco(slug: string): Promise<UnidadePublica> {
  const unidade = await unidadePublica(obterBase(), slug);
  if (!unidade) notFound();
  return unidade;
}

/** Os passos levam o estado no endereço: sem JavaScript, e sem sessão. */
export interface PassoDaReserva {
  pessoas: number;
  dia: string;
  hora?: string;
  nome?: string;
  contacto?: string;
  notas?: string;
  marketing?: string;
}

export function lerPasso(busca: Record<string, string | string[] | undefined>): PassoDaReserva {
  const um = (k: string) => {
    const v = busca[k];
    return typeof v === 'string' && v !== '' ? v : undefined;
  };
  const pessoas = Number(um('pessoas') ?? '2');
  return {
    pessoas: Number.isFinite(pessoas) && pessoas > 0 ? Math.min(Math.round(pessoas), 99) : 2,
    dia: um('dia') ?? new Date().toISOString().slice(0, 10),
    ...(um('hora') ? { hora: um('hora')! } : {}),
    ...(um('nome') ? { nome: um('nome')! } : {}),
    ...(um('contacto') ? { contacto: um('contacto')! } : {}),
    ...(um('notas') ? { notas: um('notas')! } : {}),
    ...(um('marketing') ? { marketing: um('marketing')! } : {}),
  };
}

export function comPasso(
  base: string, passo: PassoDaReserva, extra: Record<string, string> = {},
): string {
  const p = new URLSearchParams();
  p.set('pessoas', String(passo.pessoas));
  p.set('dia', passo.dia);
  for (const [k, v] of Object.entries({
    hora: passo.hora, nome: passo.nome, contacto: passo.contacto,
    notas: passo.notas, marketing: passo.marketing, ...extra,
  })) if (v) p.set(k, v);
  return `${base}?${p.toString()}`;
}

/** `AAAA-MM-DD` + `HH:MM` locais → o instante que a porta recebe. */
export function instanteDe(dia: string, hora: string): Date {
  return new Date(`${dia}T${hora}:00Z`);
}
