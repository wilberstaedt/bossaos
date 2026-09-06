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
- [`plataforma-e-suporte.md`](./plataforma-e-suporte.md) — Plataforma e suporte: a etapa em que protegemos o restaurante de NÓS. O suporte não vira dono em silêncio, o rasto guarda a pessoa e não o papel, e segurança, privacidade e exportação nunca ficam atrás do plano.
| **E05** planos | [planos-e-limites](./planos-e-limites.md) | quota por configurar = **negado**, não ilimitado |
| **E06** onboarding | [domain-model](./domain-model.md) · [permissions](./permissions.md) | de quem é cada dado |
| **E07–E08** catálogo | [catalogo-e-publicacao](./catalogo-e-publicacao.md) | alérgeno vazio é **desconhecido**; publicar é versão |
| **E09–E10** público | [dados-e-accoes-sensiveis](./dados-e-accoes-sensiveis.md) | SVG, proxy por URL, dados pessoais em URLs |
| **transversal** identidade | [identidade-dentro-do-inquilino](./identidade-dentro-do-inquilino.md) | uma pessoa vê-se a si; os nomes dos colegas vêm por função estreita |
| **E10** domínios | [dominios-e-enderecos](./dominios-e-enderecos.md) | prova de controlo, reverificação, e o nome que não volta ao mundo |
| **E12** temas | [adr/0001-foundation](./adr/0001-foundation.md) | os tokens temáveis e os fixos |
| **E13–E15** sala e PWA | [offline-e-fila-local](./offline-e-fila-local.md) | o tablet é **partilhado**: fila por org+unidade+utilizador |
| **E14** pedidos | [state-machines](./state-machines.md) · [api-contracts](./api-contracts.md) | idempotência e outbox |
- [`kiosk-e-impressao.md`](./kiosk-e-impressao.md) — Kiosk e impressão: entregue à ponte não é impresso, e não saber é um estado; dois clientes seguidos não partilham nada porque os dados nunca foram juntos; e sem aparelho real não se declara homologação.
- [`integracoes-e-cobranca-do-saas.md`](./integracoes-e-cobranca-do-saas.md) — Integrações, API e cobrança: a chave mostra-se uma vez, o âmbito verifica-se por operação, a assinatura é sobre o corpo cru — e um webhook NUNCA muda concessões pelo `organization_id` que vem no corpo.
| **E16** KDS | [kds-e-tempo-real](./kds-e-tempo-real.md) | nunca descartar por falta de espaço; tempo do servidor |
| **E18–E19** reservas | [capacidade-e-reservas](./capacidade-e-reservas.md) | intervalo semiaberto; os **dois** lados do limite |
| **E22–E24** dinheiro | [dinheiro](./dinheiro.md) | quatro entidades; indeterminado **não** é falhado |
| **E25–E30** gestão | [modulos-de-gestao](./modulos-de-gestao.md) | custo desconhecido dá margem **indisponível** |
- [`implantacao-e-piloto.md`](./implantacao-e-piloto.md) — Implantação e piloto: um backup que nunca foi restaurado é uma esperança; preparar não é publicar; a versão que responde tem de ser a que foi construída; e um passo feito à mão esconde a dependência que o script tem.
- [`E34-o-acesso-do-suporte-le.md`](./E34-o-acesso-do-suporte-le.md) — Como é que o suporte LÊ o que lhe foi concedido: política `FOR SELECT` com predicado próprio, e não porta estreita nem organização no contexto. A organização vem da LINHA e nunca do chamador; a rota mantém a verificação explícita, porque é ela que dá o 403 honesto — sem ela «sem concessão» vira «sem linhas» e lê-se como 404.
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

## Acrescentados ao índice a 05/09

> Estavam escritos e fora do índice. Um contrato que ninguém encontra pelo
> índice é um contrato que não existe — o mesmo defeito de alcance que reprovou
> o E19 e o marco do Restaurant, aplicado à documentação.
> A guarda `scripts/validar-indice-de-contratos.sh` impede que volte a acontecer.

- [`lista-de-espera.md`](./lista-de-espera.md) — A lista de espera: o que é um lugar nela
- [`pedidos-para-mais-tarde.md`](./pedidos-para-mais-tarde.md) — Um pedido para as 20h não é trabalho para agora
- [`portas-e-navegacao.md`](./portas-e-navegacao.md) — Portas: como se chega a um módulo
- [`preco-de-um-pedido-escrito-offline.md`](./preco-de-um-pedido-escrito-offline.md) — Que preço paga um pedido escrito offline
- [`qr-da-mesa-e-o-visitante.md`](./qr-da-mesa-e-o-visitante.md) — O QR da mesa é um token ao portador, colado num sítio público
- [`relatorios-e-agregacao.md`](./relatorios-e-agregacao.md) — Relatórios e agregação: ausência não é zero; o denominador viaja com o numerador; o período resolve-se por unidade antes de somar; e pertencer a duas organizações dá direito a ver as duas, não a somá-las.
- [`quantidades-e-unidades.md`](./quantidades-e-unidades.md) — Quantidades e unidades
- [`stock-e-fichas.md`](./stock-e-fichas.md) — Stock e fichas técnicas
- [`compras-e-fornecedores.md`](./compras-e-fornecedores.md) — Compras e fornecedores: encomendado, recebido e facturado são três números; só a recepção mexe no stock; a unidade de compra não é a de uso
- [`conciliacao-e-fecho.md`](./conciliacao-e-fecho.md) — Conciliação e fecho: a identidade de uma linha de extracto é derivada e única na base; divergência é estado, não erro; três datas que não são intermutáveis; e depois do fecho o passado acrescenta-se, não se reescreve.
- [`consentimento-e-campanhas.md`](./consentimento-e-campanhas.md) — Consentimento por finalidade e por canal, derivado de acontecimentos; a retirada vale antes do próximo envio porque é um gatilho que a faz valer; audiência por regra, nunca por lista colada; pontos com saldo derivado
- [`ponto-e-escalas.md`](./ponto-e-escalas.md) — A marcação é um facto que a base não deixa reescrever; quem corrige fica registado; previsto e real são dois números; minutos inteiros; e a REGRA DE FRONTEIRA do dia de serviço, que não é o dia civil
- [`tarefas-de-producao-e-estacoes.md`](./tarefas-de-producao-e-estacoes.md) — Uma linha de pedido não é uma tarefa de estação
