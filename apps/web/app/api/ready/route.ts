import { NextResponse } from 'next/server';
import { obterBase, obterLogger, verificarBase } from '../../../src/servidor.ts';
import { CABECALHO_REQUEST_ID } from '../../../proxy.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Prontidão: esta instância consegue servir tráfego a sério?
 *
 * Responde 503 em qualquer estado que não seja "pronto", e distingue três
 * situações que costumam ser achatadas numa só (CT-03: "uma falha de
 * infraestrutura deve retornar indisponibilidade real; não simular banco
 * saudável"):
 *
 *   pronto            base responde e o schema chegou
 *   schema_por_migrar base viva, migração não corrida — um deploy incompleto
 *   base_indisponivel não há base
 *
 * A terceira inclui a configuração em falta: se `DATABASE_URL` não existe,
 * `obterEnv()` atira, e isso é indisponibilidade real e não um arranque alegre.
 */
export async function GET(pedido: Request) {
  const requestId = pedido.headers.get(CABECALHO_REQUEST_ID) ?? undefined;

  let log;
  try {
    log = obterLogger();
    if (requestId) log = log.comRequestId(requestId);
  } catch {
    // Nem o logger se consegue construir: configuração inválida.
    return NextResponse.json(
      { estado: 'base_indisponivel', motivo: 'configuracao_invalida' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }

  let estado;
  try {
    estado = await verificarBase(obterBase());
  } catch (e) {
    log.error('prontidao: falha ao consultar a base', {
      erro: e instanceof Error ? e.name : 'desconhecido',
    });
    return NextResponse.json(
      { estado: 'base_indisponivel', ...(requestId ? { request_id: requestId } : {}) },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }

  if (!estado.ok) {
    log.warn('prontidao: base indisponivel', { erro: estado.erro });
    return NextResponse.json(
      { estado: 'base_indisponivel', ...(requestId ? { request_id: requestId } : {}) },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }

  if (!estado.migrado) {
    log.warn('prontidao: schema por migrar');
    return NextResponse.json(
      { estado: 'schema_por_migrar', ...(requestId ? { request_id: requestId } : {}) },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }

  return NextResponse.json(
    {
      estado: 'pronto',
      schema_version: estado.schemaVersion,
      ...(requestId ? { request_id: requestId } : {}),
    },
    { status: 200, headers: { 'cache-control': 'no-store' } },
  );
}
