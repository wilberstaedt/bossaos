# Versões verificadas — E00

> Verificado a 2026-09-03 **contra o registo npm**, não contra resumos de pesquisa.
> Comando: `curl -s https://registry.npmjs.org/<pacote>` e leitura de `dist-tags` e `time`.
> Datas de fornecedor não são constantes do produto (CT-19): reverificar antes do scaffold
> se passarem semanas.

| Pacote | `latest` | Publicado | Idade | Licença |
| --- | --- | --- | --- | --- |
| next | **16.3.4** | 2026-08-31 | 3 dias | MIT |
| better-auth | **1.7.2** | 2026-08-26 | 8 dias | MIT |
| drizzle-orm | 0.45.2 | 2026-03-27 | **159 dias** | Apache-2.0 |
| drizzle-kit | 0.31.10 | 2026-03-17 | **170 dias** | MIT |

## O achado que muda uma decisão

**A linha estável do Drizzle está parada há mais de cinco meses e a 1.0 não existe
em versão estável.** Verificado: não há nenhuma versão `1.x` sem sufixo no registo; o
que existe é `1.0.0-beta.22`, publicada há 139 dias e sem sucessora. As duas coisas ao
mesmo tempo — estável envelhecida e beta parada — são o sinal desconfortável.

Isto não invalida o Drizzle, mas contradiz a premissa de D04, que o propôs como default
técnico sem esta informação. As opções reais são três:

1. **0.45.2 agora.** Funciona hoje; assume-se uma migração para a 1.0 mais tarde, em data
   que não controlamos, num produto que já terá esquema e dados.
2. **1.0.0-beta.22.** Evita a migração futura, aceita beta parada há 4,5 meses na camada
   que fala com o dinheiro e com o isolamento entre inquilinos.
3. **Prisma.** Não estava no pacote, mas o Matheus tem GlowArt, Samba CRM e Norte em
   produção com Prisma, incluindo padrões já resolvidos por ele (migrations, `TZ=UTC`,
   `db push` aditivo, gatilhos *append-only* escritos à mão em SQL no Norte). Trocar
   de ORM num projecto de 36 etapas custa mais do que a familiaridade vale — mas
   descartar essa familiaridade sem a nomear também é uma decisão, e não estava tomada.

**Não escolhi.** CT-03 e D04 dizem que a mudança exige ADR com motivo, e esta é
fundacional o suficiente para ser do Matheus. Fica em `adr/0001-foundation.md` quando
houver decisão.

## Notas laterais verificadas

- **Next.js 16 é o LTS activo**; a 15 está em manutenção e o suporte de segurança dela
  termina a 2026-10-21. Começar na 16.3.4 é o caminho sem dívida imediata.
- **Better Auth teve uma actualização de segurança em Junho de 2026.** A 1.7.2 é de há
  8 dias e o ritmo de lançamento é alto. Fixar no lockfile e acompanhar avisos, como
  CT-19 manda.
