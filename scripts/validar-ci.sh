#!/usr/bin/env bash
# O ficheiro da CI tem de ser um WORKFLOW valido, nao apenas YAML valido.
#
# Existe por causa de um erro meu, o senior, a 2026-09-03 as 22h00. Dividi a CI em
# tres trabalhos, validei com `ruby -ryaml` e ele disse que estava bem - E ESTAVA.
# Era YAML perfeitamente valido. O que nao era valido era o ESQUEMA: nenhum dos
# tres trabalhos tinha `runs-on`, porque o meu split descartou a linha que estava
# nessa posicao. O GitHub respondeu "this run likely failed because of a workflow
# file issue" e eu perdi uma corrida a descobrir porque.
#
# Verifiquei SINTAXE quando o requisito era ESQUEMA - o instrumento errado apontado
# a coisa certa, que e a armadilha numero 1 da minha lista. Isto e o instrumento
# certo.
#
# NAO e o esquema completo do Actions e nao finge ser. E o minimo que distingue
# "YAML valido" de "workflow que corre", e teria apanhado aquilo.
set -uo pipefail
cd "$(dirname "$0")/.."

F=".github/workflows/ci.yml"
falhas=0
erro() { echo "  FALHA $1"; falhas=$((falhas+1)); }
ok()   { echo "  ok    $1"; }

[ -f "$F" ] || { erro "nao encontrei $F"; echo; echo "  1 FALHA(S)."; exit 1; }
command -v ruby >/dev/null || { erro "sem ruby - nao consigo ler o YAML"; echo; exit 1; }

ruby -ryaml -e '
  f = ".github/workflows/ci.yml"
  begin
    d = YAML.load_file(f)
  rescue => e
    puts "  FALHA o YAML nao le: #{e.message[0, 90]}"; exit 1
  end
  falhas = 0

  # Controlo negativo do proprio leitor: sem trabalhos, tudo "bate".
  jobs = d["jobs"] || {}
  if jobs.size < 1
    puts "  FALHA nenhum trabalho encontrado - o leitor esta cego"; exit 1
  end
  puts "  ok    #{jobs.size} trabalho(s)"

  unless d["on"] || d[true]
    puts "  FALHA sem gatilho `on`"; falhas += 1
  end

  jobs.each do |nome, j|
    # runs-on: foi exactamente isto que faltou, e YAML nenhum o apanha.
    if j["runs-on"].nil?
      puts "  FALHA #{nome}: sem `runs-on` - YAML valido, workflow invalido"; falhas += 1
    end
    passos = j["steps"]
    if passos.nil? || passos.empty?
      puts "  FALHA #{nome}: sem `steps`"; falhas += 1
      next
    end
    passos.each_with_index do |s, i|
      if s["run"].nil? && s["uses"].nil?
        puts "  FALHA #{nome} passo #{i} (#{s["name"] || "sem nome"}): sem `run` nem `uses`"
        falhas += 1
      end
    end
    puts "  ok    #{nome}: runs-on=#{j["runs-on"]}, #{passos.size} passos" if falhas.zero?
  end

  exit(falhas.zero? ? 0 : 1)
' || falhas=$((falhas+1))

echo
[ "$falhas" -eq 0 ] && echo "  Workflow valido: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"
