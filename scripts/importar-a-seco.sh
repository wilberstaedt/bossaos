#!/usr/bin/env bash
#
# IMPORTAÇÃO A SECO — lê o ficheiro da casa e NÃO escreve nada.
#
# ── O que «a seco» quer dizer aqui ────────────────────────────────────────
#
# Não é «escreve numa base de teste»: é **não abre ligação nenhuma**. Este guião
# não importa a base de dados, e essa ausência é a garantia — um modo de simular
# que partilha o código do modo real acaba a escrever no dia em que alguém troca
# uma variável.
#
# O que sai é a **lista de conferência**: o que a responsável da casa tem de
# validar antes de aceitar. Sai antes de ela aceitar, e não depois.
#
# Uso: scripts/importar-a-seco.sh <ficheiro.csv>
#   colunas: nome,preco,idioma,alergenios
set -uo pipefail
cd "$(dirname "$0")/.."

FICHEIRO="${1:-}"
if [ -z "$FICHEIRO" ] || [ ! -f "$FICHEIRO" ]; then
  echo "uso: scripts/importar-a-seco.sh <ficheiro.csv>" >&2
  exit 2
fi

echo "IMPORTAÇÃO A SECO · $FICHEIRO"
echo "Nada será escrito. Este guião não fala com a base de dados."
echo

node --experimental-strip-types -e '
import { conferirImportacao } from "./packages/domain/src/implantacao.ts";
import { readFileSync } from "node:fs";

const bruto = readFileSync(process.argv[1], "utf8");
const linhas = bruto.split("\n").map((l) => l.trim()).filter((l) => l !== "");
const cabecalho = (linhas.shift() ?? "").split(",").map((c) => c.trim());

const indice = (nome) => cabecalho.indexOf(nome);
const iNome = indice("nome"), iPreco = indice("preco");
const iIdioma = indice("idioma"), iAlerg = indice("alergenios");

if ([iNome, iPreco, iIdioma, iAlerg].some((i) => i < 0)) {
  console.error("faltam colunas. Esperadas: nome,preco,idioma,alergenios");
  console.error("recebidas: " + cabecalho.join(","));
  process.exit(2);
}

const campos = (l) => {
  // Divisão simples: um CSV com vírgulas dentro de aspas precisa de mais, e
  // fingir que este leitor as trata seria pior do que dizer que não trata.
  const partes = l.split(",");
  return partes.length === cabecalho.length ? partes.map((x) => x.trim()) : null;
};

const dados = [], malFormadas = [];
linhas.forEach((l, i) => {
  const c = campos(l);
  if (c === null) { malFormadas.push(i + 2); return; }
  dados.push({ nome: c[iNome], preco: c[iPreco], idioma: c[iIdioma], alergenios: c[iAlerg] });
});

const avisos = conferirImportacao(dados);

console.log(`linhas lidas: ${dados.length}`);
if (malFormadas.length) {
  console.log(`linhas com número de campos errado (NÃO lidas): ${malFormadas.join(", ")}`);
}
console.log("");

if (avisos.length === 0) {
  console.log("Nenhum aviso. A casa confirma os nomes e os preços e aceita.");
} else {
  console.log("O QUE A CASA TEM DE CONFERIR ANTES DE ACEITAR:");
  console.log("");
  for (const a of avisos) {
    console.log(`  linha ${a.linha} · ${a.campo}: ${a.problema}`);
  }
  console.log("");
  const semAlergenios = avisos.filter((a) => a.campo === "alergenios").length;
  if (semAlergenios > 0) {
    console.log(`  ${semAlergenios} produto(s) ficam com alérgenos DESCONHECIDO.`);
    console.log("  Isso NÃO quer dizer «não contém». Quem tem uma alergia lê a");
    console.log("  diferença, e a diferença entre as duas é alguém no hospital.");
  }
}
' "$FICHEIRO"
