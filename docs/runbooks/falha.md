# Runbook — falha em serviço

> Para quem está com a casa cheia e o sistema a portar-se mal. **Primeiro o
> serviço continua, depois descobre-se porquê.** A ordem inversa já custou
> serviços inteiros.

## Regra zero — a casa não pára

O produto foi desenhado para isto: a comanda em papel e a caixa registadora
existem, e o pessoal treinou com elas ([`../releases/formacao.md`](../releases/formacao.md),
guião «quando o sistema cai»). Quem está em serviço **não depura**. Passa para
papel e chama quem depura.

## O que medir, por esta ordem

**1. Responde?**

```bash
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' https://bossaos.mwdeveloper.tech/
ssh -i ~/.deploys/ilora/ilora_vps_ed25519 root@31.220.111.39 \
  docker exec bossaos_web curl -sf http://localhost:8140/api/health
```

A segunda linha entra por dentro e a primeira por fora: se a de dentro responde
e a de fora não, o problema é do Caddy e não do produto — e são duas reparações
diferentes.

Um 200 lento e um 502 mandam fazer coisas diferentes. Um 200 **não** quer dizer
entregue: mede que a porta abriu.

**2. É a versão certa?**

```bash
ssh -i ~/.deploys/ilora/ilora_vps_ed25519 root@31.220.111.39 \
  docker inspect --format '{{ index .Config.Labels "bossaos.versao" }}' bossaos_web
```

Se não coincidir com o que se publicou, o build não pegou e está a servir o
bundle antigo com ar de sucesso. Se a etiqueta não se lê, é **NÃO MEDI** — não é
«está errado».

**3. A base aceita ligações?**

```bash
psql "$DATABASE_URL" -c 'select 1' >/dev/null && echo base-ok || echo base-nao-responde
```

**4. O que dizem os registos, com hora?**

```bash
ssh -i ~/.deploys/ilora/ilora_vps_ed25519 root@31.220.111.39 \
  docker logs --since 15m --timestamps bossaos_web 2>&1 | tail -100
```

**5. Antes de matar ou reiniciar seja o que for, a idade:**

```bash
ps -o pid,etime,command -p <pid>
docker ps --format '{{.Names}}\t{{.Status}}\t{{.Image}}'
```

Um número a mais, e é este. Um processo de três dias não é lixo da tentativa
desta noite, por muito que a explicação encaixe.

## O que NÃO fazer

- **Não apagar dados para «limpar».** O rasto de auditoria é append-only e
  recusa — de propósito. Se alguma coisa recusar um `DELETE`, é a garantia a
  funcionar, não um obstáculo.
- **Não correr migrações a quente** para tentar consertar. Uma migração no meio
  de um serviço com pedidos abertos é como se perde a noite inteira em vez de
  quinze minutos.
- **Não republicar por reflexo.** Se a versão no ar for a certa, republicar não
  muda nada e apaga o estado que ainda dava para ler.

## Escalar

Se ao fim de **15 minutos** a casa continua em papel, é [`reverter.md`](reverter.md).
Voltar atrás não é derrota: é o plano de saída a ser usado para o que existe.

## Depois

Toda a falha em serviço fica escrita em [`../releases/pilot.md`](../releases/pilot.md),
com hora, duração e o que se mediu — inclusive quando a causa não se descobriu.
**«Não sei porquê» é um estado**; deixar a linha em branco lê-se como aprovada.
