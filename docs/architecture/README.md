# Contratos de arquitectura — índice

> O E00 produziu 17 documentos. Este índice existe porque sem ele eles não se encontram:
> quem começa uma etapa numa sessão nova tem de saber **qual contrato lhe serve**, sem
> depender de alguém se lembrar de lho dizer.
>
> Regra que vale para todos: **o contrato escreve-se antes da etapa que o implementa.** Um
> contrato escrito depois é uma descrição do que se fez, não uma régua.

## Qual ler antes de cada etapa

| Antes de | Ler | Porque decide o desenho |
| --- | --- | --- |
| **E03** isolamento | [prova-de-isolamento](./prova-de-isolamento.md) | os 4 casos, e o 3.º é o que dá sentido ao 2.º |
| **E04** autenticação | [autenticacao-e-convites](./autenticacao-e-convites.md) | ausência × falta de permissão; papel vem do convite |
| **E05** planos | [planos-e-limites](./planos-e-limites.md) | quota por configurar = **negado**, não ilimitado |
| **E06** onboarding | [domain-model](./domain-model.md) · [permissions](./permissions.md) | de quem é cada dado |
| **E07–E08** catálogo | [catalogo-e-publicacao](./catalogo-e-publicacao.md) | alérgeno vazio é **desconhecido**; publicar é versão |
| **E09–E10** público | [dados-e-accoes-sensiveis](./dados-e-accoes-sensiveis.md) | SVG, proxy por URL, dados pessoais em URLs |
| **E10** domínios | [dominios-e-enderecos](./dominios-e-enderecos.md) | prova de controlo, reverificação, e o nome que não volta ao mundo |
| **E12** temas | [adr/0001-foundation](./adr/0001-foundation.md) | os tokens temáveis e os fixos |
| **E13–E15** sala e PWA | [offline-e-fila-local](./offline-e-fila-local.md) | o tablet é **partilhado**: fila por org+unidade+utilizador |
| **E14** pedidos | [state-machines](./state-machines.md) · [api-contracts](./api-contracts.md) | idempotência e outbox |
| **E16** KDS | [kds-e-tempo-real](./kds-e-tempo-real.md) | nunca descartar por falta de espaço; tempo do servidor |
| **E18–E19** reservas | [capacidade-e-reservas](./capacidade-e-reservas.md) | intervalo semiaberto; os **dois** lados do limite |
| **E22–E24** dinheiro | [dinheiro](./dinheiro.md) | quatro entidades; indeterminado **não** é falhado |
| **E25–E30** gestão | [modulos-de-gestao](./modulos-de-gestao.md) | custo desconhecido dá margem **indisponível** |
| **E32–E33** plataforma | [operacao-e-recuperacao](./operacao-e-recuperacao.md) | cópia nunca restaurada não é cópia |
| qualquer uma | [overview](./overview.md) · [versions](./versions.md) | o mapa e as versões verificadas |

## Cobertura dos contratos do pacote

Os 20 CT de `docs/bossaos/CONTRATO_TECNICO.md` estão cobertos:

CT-01/02 planos · CT-03 overview + versions · CT-04 permissions + autenticação ·
CT-05 domain-model · CT-06 api-contracts · CT-07 catálogo · CT-08 state-machines + KDS ·
CT-09 offline + KDS · CT-10 capacidade · CT-11 dinheiro · CT-12 módulos de gestão ·
CT-13 ADR 0001 · CT-14 dados e acções sensíveis · CT-15 operação + `docs/reviews/COMO-REVISO.md` ·
CT-16/18 processo · CT-17 operação · CT-19 autenticação · CT-20 `scripts/validar-cobertura.sh`.

## As cinco regras que atravessam tudo

Se um documento parecer contradizer outro, é uma destas que decide — e se contradisser mesmo
uma destas, o documento é que está errado.

1. **Desconhecido é uma resposta.** Não é zero, não é vazio, não é a média. Vale para
   alérgenos, para custos, para margens e para o estado de uma integração.
2. **Indeterminado não é falhado.** Reconciliar antes de repetir. Vale para pagamentos,
   para comandos offline e para impressão.
3. **Ausência não prova política.** Uma consulta que devolve vazio pode ter sido negada ou
   estar mal escrita: a prova é o **par**, o mesmo pedido com o contexto certo a devolver a
   coisa.
4. **A verificação acontece no servidor.** Um botão escondido não é autorização, um filtro
   no ecrã não é escopo, e uma exportação nunca é mais generosa do que a vista.
5. **O instrumento também é entrega.** Uma prova que não consegue falhar não prova nada, e
   uma que não consegue medir tem de dizê-lo alto em vez de contar zero.
