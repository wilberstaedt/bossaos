import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MAXIMO_DA_MENSAGEM, chaveDeLead, validarLead } from './leads.ts';

const bom = {
  nome: 'Ana Ruiz',
  email: 'ana@exemplo.example',
  mensagem: 'Quería reservar para ocho personas el sábado.',
  origem: 'site' as const,
};

describe('validar um lead', () => {
  it('aceita o que é válido', () => {
    assert.deepEqual(validarLead(bom), []);
  });

  it('recusa nome e mensagem só com espaços', () => {
    const r = validarLead({ ...bom, nome: '   ', mensagem: '\n\t ' });
    assert.deepEqual(
      r.sort((a, b) => a.campo.localeCompare(b.campo)),
      [{ campo: 'mensagem', motivo: 'vazio' }, { campo: 'nome', motivo: 'vazio' }],
    );
  });

  it('recusa um email sem forma de email', () => {
    assert.deepEqual(validarLead({ ...bom, email: 'ana' }), [{ campo: 'email', motivo: 'forma' }]);
    assert.deepEqual(validarLead({ ...bom, email: 'a@b' }), [{ campo: 'email', motivo: 'forma' }]);
  });

  it('mas ACEITA endereços estranhos que são válidos', () => {
    // O erro caro é ao contrário do que parece: um padrão apertado recusa
    // endereços verdadeiros, e um endereço verdadeiro recusado é um cliente
    // perdido no formulário. Quem decide mesmo é o servidor de correio.
    for (const email of [
      'ana+reservas@exemplo.example',
      "o'brien@exemplo.example",
      'ana.maria-ruiz@sub.exemplo.example',
      'ANA@EXEMPLO.EXAMPLE',
    ]) {
      assert.deepEqual(validarLead({ ...bom, email }), [], `recusou ${email}`);
    }
  });

  it('recusa uma mensagem maior do que o limite', () => {
    const r = validarLead({ ...bom, mensagem: 'a'.repeat(MAXIMO_DA_MENSAGEM + 1) });
    assert.deepEqual(r, [{ campo: 'mensagem', motivo: 'longa_demais' }]);
  });

  it('recusa uma origem fora da lista', () => {
    const r = validarLead({ ...bom, origem: 'referer-inteiro' as never });
    assert.deepEqual(r, [{ campo: 'origem', motivo: 'desconhecida' }]);
  });

  it('NÃO corrige o que recebe', () => {
    // Um formulário que "arranja" o email do cliente em silêncio grava um
    // endereço para onde ninguém responde, e ninguém fica a saber.
    const entrada = { ...bom, email: '  ana@exemplo.example  ' };
    const copia = { ...entrada };
    validarLead(entrada);
    assert.deepEqual(entrada, copia, 'a validação mexeu na entrada');
  });
});

describe('a chave de idempotência', () => {
  const dia = new Date('2026-09-04T10:00:00Z');
  const base = { locationId: 'unid-1', email: 'ana@x.example', mensagem: 'olá', dia };

  it('o mesmo lead no mesmo dia dá a MESMA chave — é o duplo clique', () => {
    assert.equal(chaveDeLead(base), chaveDeLead({ ...base }));
  });

  it('e continua igual com o email noutra caixa ou com espaços à volta', () => {
    // `Ana@X.example` e `ana@x.example` são a mesma pessoa a carregar duas vezes.
    assert.equal(chaveDeLead(base), chaveDeLead({ ...base, email: '  Ana@X.example ' }));
    assert.equal(chaveDeLead(base), chaveDeLead({ ...base, mensagem: '  olá  ' }));
  });

  it('o PAR: um contacto genuíno noutro dia NÃO é engolido', () => {
    // É o defeito ao contrário, e é mais caro do que o duplicado: perde um
    // pedido verdadeiro. Uma chave só de conteúdo, sem dia, fazia isto.
    const outroDia = new Date('2026-09-18T10:00:00Z');
    assert.notEqual(chaveDeLead(base), chaveDeLead({ ...base, dia: outroDia }));
  });

  it('e uma mensagem diferente no mesmo dia é outro lead', () => {
    assert.notEqual(chaveDeLead(base), chaveDeLead({ ...base, mensagem: 'outra coisa' }));
  });

  it('duas unidades não partilham chave', () => {
    // Sem a unidade na chave, o mesmo cliente a escrever a duas casas da mesma
    // cadeia no mesmo dia chegava só a uma delas.
    assert.notEqual(chaveDeLead(base), chaveDeLead({ ...base, locationId: 'unid-2' }));
  });

  it('a hora do dia não muda a chave', () => {
    // Duas submissões separadas por horas continuam a ser o mesmo pedido: quem
    // recarrega a página ao almoço e volta a enviar à noite não quer dois.
    const noite = new Date('2026-09-04T23:59:00Z');
    assert.equal(chaveDeLead(base), chaveDeLead({ ...base, dia: noite }));
  });
});
