# Runbook — publicar

> Escrito depois de uma publicação com **nove paragens**. Oito foram defeito de
> instrumento e uma foi uma defesa do produto a funcionar.
>
> **Não há passos à mão aqui.** Um passo que fica de fora do guião fica de fora
> da próxima vez, e pior: **esconde a dependência que o guião tem.** Duas das
> nove paragens saíram de subir a base à mão com o ambiente já carregado na
> sessão — o que escondeu que o compose lê `.env` e não `.env.prod`.

## A caixa

| o quê | valor |
|-------|-------|
| servidor | `root@31.220.111.39` (a mesma do ilora, do Norte e do TPV antigo) |
| chave | `~/.deploys/ilora/ilora_vps_ed25519` |
| raiz | `/root/bossaos` |
| porta | **8140** — verificada livre, não deduzida |
| domínio | `bossaos.mwdeveloper.tech` |
| ambiente | `/root/bossaos/.env.prod`, `chmod 600`, **vive lá e nunca sobe daqui** |

## Preparar não é publicar

```bash
scripts/publicar.sh              # HEAD, portões locais, e PARA
scripts/publicar.sh <sha>        # outro commit
```

Sem `--autorizado-por` o guião corre os portões locais, verifica o pacote e
**para antes de tocar no servidor**. É o modo normal: prepara-se e prova-se
quantas vezes for preciso.

```bash
scripts/publicar.sh <sha> \
  --autorizado-por "Matheus, 06/09 09:12: «podes publicar o staging»"
```

As **palavras dele** vão no argumento, não um `sim`. Já houve neste vault um
runbook a dizer «nunca fazer deploy neste motor» enquanto o dono tinha
autorizado por escrito e o motor tinha publicado: ficou três horas a mentir. O
que sobrevive é o registo do que foi dito, com data.

## Os quatro portões

| # | portão | o que recusa |
|---|--------|--------------|
| 1 | assinatura | etapa por validar na matriz — e **nomeia** quais |
| 2 | commit | publica-se por `git archive`; o disco não vai |
| 3 | segredos | `.env`, `node_modules`, `.next`, `.git` dentro do pacote |
| 4 | versão | a etiqueta da imagem no ar ≠ o commit construído |

**O portão 1 tem duas leituras, e a segunda é a que aperta.** O contador do
`estado.sh` só conta «implementado aguardando validação»; uma etapa `planejado`
com código já escrito passava. `etapasPorValidar` lê a matriz e nomeia.

**E o `estado.sh` rebenta quando o projecto estiver todo validado** — não
consegue derivar «a primeira por validar» se não houver nenhuma. O guião trata
essa falha como **NÃO MEDI** e continua pela leitura directa; sem isso, morria
sem uma linha de saída no dia em que finalmente pudesse publicar.

**O portão 2 não exige árvore limpa, de propósito.** São dois agentes na mesma
árvore. A garantia não é a regra: é o `git archive`, onde **o que vai para o ar
existe em git porque não há outra maneira de lá chegar**. A árvore suja sai como
aviso, a dizer quantos ficheiros **não** vão.

**O portão 4 não atravessa o produto:**

```bash
ssh -i ~/.deploys/ilora/ilora_vps_ed25519 root@31.220.111.39 \
  docker inspect --format '{{ index .Config.Labels "bossaos.versao" }}' bossaos_web
```

A sonda antiga pedia `/versao.txt` e o encaminhamento por idioma respondeu com
`/es-ES/versao.txt`: mediu o comportamento da casa em vez do build. E **não
conseguir ler a etiqueta não é «versão errada»** — é NÃO MEDI, e manda ir ver o
Docker em vez de reconstruir durante uma hora um build que estava certo.

## O envio

O guião envia o **pacote que inspeccionou**, não outro:

```bash
ssh … "mkdir -p /root/bossaos && tar -x -C /root/bossaos" < <pacote>.tar
```

**Sem `--delete` em lado nenhum e sem tocar no `.env.prod`.** Se algum dia isto
voltar a ser `rsync`, é `rsync -az --exclude='*.env*'` **sem `--delete`** — neste
vault um `--delete` comeu o `.env` de produção e a recuperação demorou uma noite,
com rotação de JWT pelo meio.

## Depois de mexer no que é partilhado

A caixa serve quatro produtos. **Verifica-se o que NÃO se queria mudar:**

```bash
for alvo in bossaos ilora norte tpv; do
  printf '%s -> ' "$alvo"
  curl -s -o /dev/null -w '%{http_code}\n' "https://$alvo.mwdeveloper.tech"
done
```

Confirmar só o próprio dá a mesma sensação de sucesso e **nenhuma informação
sobre o estrago**. O ficheiro do Caddy serve os quatro; recarregá-lo mexe nos
quatro.

**E antes de matar seja o que for, pede-se um número a mais — a idade:**

```bash
ssh … "ps -o pid,etime,command -p <pid>"
```

Uma vez isto disse **três dias** sobre um processo que ia ser morto por parecer
resíduo das tentativas da noite. Era o `norte_web`, em produção. Sem esse número,
a explicação errada era plausível e coerente com tudo o resto.

## Se correr mal

[`falha.md`](falha.md) para diagnosticar, [`reverter.md`](reverter.md) para voltar
atrás.
