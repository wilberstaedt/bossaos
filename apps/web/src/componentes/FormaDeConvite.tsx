'use client';

import { useState } from 'react';
import { Aviso, Botao, Campo } from '@bossaos/ui';

/**
 * Aceitar um convite (AUTH-006).
 *
 * O atlas desenha Organização, Função e Unidade como campos, e é tentador
 * transformá-los em `<select>`. **Não são campos: são o convite a mostrar-se.**
 * Aqui vão como `readOnly`, sem `name`, e por isso não entram no `FormData` nem
 * no corpo do pedido.
 *
 * E isso ainda não chegaria. Um campo `readOnly` muda-se nas ferramentas do
 * navegador em três segundos. A garantia está no servidor: `aceitarConvite` não
 * tem por onde receber um papel — a prova envia `papel`, `role`, `Papel` e
 * `roleAssignment.papel` no corpo, todos a dizer OWNER, e o que fica gravado é o
 * WAITER do convite.
 *
 * O que este ficheiro faz é não mentir a quem está à frente do ecrã: mostra o
 * que a pessoa está a aceitar, e deixa claro que não o escolhe.
 */
export function FormaDeConvite({
  token,
  convite,
  textos,
}: {
  token: string;
  convite: { organizacao: string; papel: string; unidade: string | null; email: string };
  textos: {
    titulo: string; organizacao: string; funcao: string; unidade: string;
    teuNome: string; senha: string; accao: string; notaPapel: string;
    expirado: string; revogado: string; jaUsado: string;
    emailDiferente: string; naoEncontrado: string;
  };
}) {
  const [estado, setEstado] = useState<'parado' | 'a-enviar' | 'erro'>('parado');
  const [erro, setErro] = useState('');

  const MENSAGEM: Record<string, string> = {
    expirado: textos.expirado,
    revogado: textos.revogado,
    ja_usado: textos.jaUsado,
    email_diferente: textos.emailDiferente,
    nao_encontrado: textos.naoEncontrado,
  };

  async function submeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado('a-enviar');
    setErro('');

    // **Só o token.** Nem papel, nem unidade, nem organização.
    const r = await fetch('/api/convites/aceitar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (r.ok) { window.location.assign('../organizations'); return; }
    const corpo = (await r.json().catch(() => ({}))) as { erro?: string };
    setErro(MENSAGEM[corpo.erro ?? ''] ?? textos.naoEncontrado);
    setEstado('erro');
  }

  return (
    <form onSubmit={submeter} style={{ display: 'grid', gap: 24 }}>
      <h1>{textos.titulo.replace('{organizacao}', convite.organizacao)}</h1>
      {erro ? <Aviso tom="perigo" urgente titulo={erro} /> : null}

      {/* Sem `name`: o que se mostra não é o que se envia. */}
      <Campo rotulo={textos.organizacao} defaultValue={convite.organizacao} readOnly />
      <Campo rotulo={textos.funcao} defaultValue={convite.papel} readOnly />
      <Campo rotulo={textos.unidade} defaultValue={convite.unidade ?? '—'} readOnly />

      <Campo rotulo={textos.teuNome} name="nome" defaultValue="" autoComplete="name" />
      <Botao type="submit" aCarregar={estado === 'a-enviar'} largo>{textos.accao}</Botao>
      <p className="bo-campo__ajuda">{textos.notaPapel}</p>
    </form>
  );
}
