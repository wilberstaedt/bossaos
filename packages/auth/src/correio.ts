import { createTransport, type Transporter } from 'nodemailer';

/**
 * Envio de email.
 *
 * Em desenvolvimento aponta ao Mailpit, que corre em `127.0.0.1:1025` e não põe
 * nada na Internet. Isso não é um atalho: é o que permite **provar** que a
 * recuperação de acesso funciona, lendo a caixa, em vez de afirmar que sim.
 *
 * O corpo nunca leva o token em texto para lado nenhum além do destinatário, e
 * nada disto entra no registo — o `logger` do E01 redige o que tem nome
 * sensível, mas a defesa aqui é não escrever de todo.
 */
export interface Correio {
  enviar(mensagem: { para: string; assunto: string; texto: string }): Promise<void>;
}

export function criarCorreio(opcoes: {
  host: string;
  porta: number;
  de: string;
}): Correio {
  let transporte: Transporter | undefined;
  return {
    async enviar({ para, assunto, texto }) {
      transporte ??= createTransport({
        host: opcoes.host,
        port: opcoes.porta,
        // Mailpit local não usa TLS. Em produção isto vem de configuração e o
        // fornecedor real ainda é dependência declarada.
        secure: false,
        ignoreTLS: true,
      });
      await transporte.sendMail({ from: opcoes.de, to: para, subject: assunto, text: texto });
    },
  };
}

/** Correio que guarda em memória. Para testes que precisam de LER o que saiu. */
export function correioDeMemoria(): Correio & {
  enviadas: Array<{ para: string; assunto: string; texto: string }>;
} {
  const enviadas: Array<{ para: string; assunto: string; texto: string }> = [];
  return {
    enviadas,
    async enviar(m) {
      enviadas.push(m);
    },
  };
}
