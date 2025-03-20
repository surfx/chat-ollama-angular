#!/bin/bash

# Inicia o npm start
cd /home/emerson/projetos/chat-ollama-angular/
npm i
npm start &

# Guarda o PID do npm start
NPM_PID=$!

# Inicia o json-server
json-server --watch src/db/db.json &

# Guarda o PID do json-server
JSON_SERVER_PID=$!

# Função para matar ambos os processos ao pressionar CTRL+C
function cleanup {
  echo "Encerrando os processos..."
  kill $NPM_PID
  kill $JSON_SERVER_PID
  exit
}

# Captura o sinal de interrupção (CTRL+C) e chama a função de limpeza
trap cleanup SIGINT

# Aguarda até que os processos sejam finalizados
wait $NPM_PID
wait $JSON_SERVER_PID
