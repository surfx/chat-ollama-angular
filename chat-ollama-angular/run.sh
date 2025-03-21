#!/bin/bash

# jsonserver, angular
portas=(3000 4200)

fnKillPID() {
  local portas_array=("$@")
  for porta in "${portas_array[@]}"; do
    PID=$(sudo ss -tulnp | grep ":$porta" | awk -F"pid=" '{print $2}' | awk -F"," '{print $1}')

    if [ -n "$PID" ]; then
      sudo kill -9 "$PID"
    fi
  done
}

fnKillPID "${portas[@]}"

# Inicia o npm start
cd /home/emerson/projetos/chat-ollama-angular/chat-ollama-angular
npm i
npm start &
NPM_PID=$!

# Inicia o json-server
json-server --watch src/db/db.json &
JSON_SERVER_PID=$!

# Função para matar ambos os processos ao pressionar CTRL+C
function cleanup {
  echo "Encerrando os processos..."
  kill -9 $NPM_PID 2>/dev/null
  kill -9 $JSON_SERVER_PID 2>/dev/null
  fnKillPID "${portas[@]}"
  exit
}

# Captura o sinal de interrupção (CTRL+C) e chama a função de limpeza
trap cleanup SIGINT

while true; do
  sleep 1 # Pausa para reduzir o uso de CPU
done
