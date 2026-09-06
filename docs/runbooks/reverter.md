# Runbook — reverter

> Voltar atrás é o plano de saída a ser usado. Define-se **antes** de avançar,
> não quando já há pedidos a sério na casa.

## O que se reverte, e o que não se reverte

| Camada | Reverte? | Como |
|--------|----------|------|
| Código no ar | sim | republicar o commit anterior |
| Esquema da base | **não por reflexo** | ver abaixo |
| Dados de serviço | **nunca** | pedidos e movimentos ficam |

**O código volta atrás; os dados não.** Um serviço que aconteceu aconteceu, e o
rasto é append-only. Quem reverte código e apaga dados «para ficar coerente»
apaga vendas.

## Reverter o código

```bash
scripts/publicar.sh <sha-anterior> \
  --autorizado-por "<nome>, <data e hora>: «<as palavras dele>»"
```

Os quatro portões correm outra vez. **Também para voltar atrás.** O portão 1 vai
recusar se a matriz tiver etapa por validar — e isso é correcto: o commit
anterior não deixa de ser código por ser mais velho.

Confirmar que pegou, pela etiqueta e não pelo produto:

```bash
ssh -i ~/.deploys/ilora/ilora_vps_ed25519 root@31.220.111.39 \
  docker inspect --format '{{ index .Config.Labels "bossaos.versao" }}' bossaos_web
```

## Reverter o esquema

**As migrações deste projecto são aditivas.** Uma coluna nova, uma tabela nova,
um índice novo — nada disso parte a versão anterior do código, e é por isso que
se pode voltar atrás no código sem tocar na base.

Se a migração **não** for aditiva (uma coluna que muda de tipo, uma restrição
nova sobre dados existentes), então reverter o código **não chega**, e isso
escreve-se no `pilot.md` antes de publicar, não depois. Uma migração destrutiva
sem plano de saída escrito **não sobe**.

## Restaurar a base — o último recurso

Só quando os dados estão corrompidos, não quando o código está errado.

```bash
scripts/ensaiar-restauracao.sh <base>     # ENSAIO, numa base isolada
```

O ensaio faz-se **antes**, e o número que ele dá é o tempo de restaurar uma
cópia que já existia. **Não é RPO nem RTO.** O RPO depende da frequência das
cópias; o RTO inclui perceber que há um problema, decidir, e o resto do sistema
a voltar. O guião recusa-se a emitir os dois, de propósito.

Data e tempo do último ensaio: [`../releases/pilot.md`](../releases/pilot.md).
Se essa linha disser **não medido**, não há número nenhum para dizer ao cliente.
Um backup que nunca foi restaurado é uma esperança.

## Depois de reverter

1. A casa volta do papel ao sistema — e as comandas de papel entram como pedidos
   normais, pela caixa. Não há importação especial para isso: é serviço.
2. O que aconteceu fica no `pilot.md`, com hora e duração.
3. O commit revertido **não se apaga**. Corrige-se, revê-se, e sobe outra vez
   pelos mesmos quatro portões.
