# Precificação e modelo comercial

> **Fonte:** `BossaOS_Precificacao_e_Modelo_Comercial_v1.pdf` (02/09/2026), ao lado
> deste ficheiro. Os números vivem em `PRECIFICACAO.json`, em **cêntimos inteiros**.
>
> **Porque este ficheiro existe:** o PDF manda usar `PRECIFICACAO.md` e
> `PRECIFICACAO.json` em `docs/bossaos`, e **nenhum dos dois foi entregue no
> pacote**. Por isso o E10 construiu a página de planos **sem preços** — o
> executor recusou-se a inventá-los, e fez bem: um preço inventado numa página
> comercial é dado falso na pior superfície possível. Escritos a 04/09.

## A tabela, em euros e por estabelecimento

| Plano | Mensal | Anual | Equivalente/mês | Implantação |
| --- | --- | --- | --- | --- |
| Starter | €19 | €190 | €15,83 | €0 sozinho · €99 assistida |
| Restaurant | €79 | €790 | €65,83 | €299 |
| Pro | €149 | €1.490 | €124,17 | €499 |

**Todos acrescidos de IVA.** A implantação é pagamento único por unidade.

**O ano custa dez mensalidades** — cerca de 16,7% abaixo de doze. O equivalente
mensal é **apresentação**: a cobrança anual usa o valor integral do ano, nunca o
equivalente arredondado multiplicado. Confundir os dois é um erro de dinheiro e a
`validar-dinheiro.sh` não o apanha, porque os dois são inteiros.

## O que isto obriga no código, por etapa

| Etapa | Aplicação |
| --- | --- |
| **E05** | Planos por unidade e direitos **no servidor**. Preço, permissão de utilizador e bandeira de lançamento continuam **separados**. |
| **E10** | A LP usa **esta** fonte: mensal e anual, IVA, implantação e o **estado real** de cada capacidade. |
| **E12** | Cores públicas: **Starter fixas, Restaurant e Pro personalizáveis**. E a mudança de plano preserva dados e mostra **data, valor e impacto antes** de mudar. |
| **E32** | Preços do fornecedor, impostos, termos e eventos. A cobrança da assinatura é **outra coisa** do pagamento da refeição. |

## Regras de cobrança que são regras de código

- **Unidade de cobrança é o estabelecimento físico.** Salão, terraço e bar da mesma
  unidade **não** são três assinaturas. Criar uma unidade na base **não** é
  contratar: a habilitação exige concessão explícita.
- **Uma organização pode reunir unidades com planos diferentes.** A gestão
  consolidada é capacidade **Pro**.
- **Comissão de 0%** em pedidos e reservas directos. Tarifas de processador,
  mensagens e serviços externos ficam **separadas** e não entram na mensalidade.
- **Mensal sem permanência**; cancelar impede a renovação seguinte. **Anual pago
  adiantado**, com acesso até ao fim do período pago.
- **Sem mensalidade adicional por empregado ou por mesa** do estabelecimento
  contratado.

## A regra que vale mais do que a tabela

> **Um campo sem valor não vira gratuito, ilimitado nem integração activa.**

É a mesma regra que o vault já tinha para os alergénios e para o DNS: **ausência
não é política**. Um adicional sem preço fechado significa **«a orçar»**, e um
módulo sem valor significa **por definir** — nunca «incluído».

## O que continua por definir, e está declarado

IDs do fornecedor, quotas, preços dos adicionais, regras de rateio e horários de
suporte. **Kiosk e conectores de marketplaces não têm preço fechado nesta versão.**
E a La Societat terá acordo de piloto **separado**, com prazo e condições próprios
— esta versão não fixa gratuitidade nem desconto permanente.
