#!/bin/bash

export TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata

# flask, jsonserver, angular, ollama
portas=(5000 3000 4200 11434)

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

# -----------------------
# OLLAMA
# -----------------------
ollama serve &
OLLAMA_PID=$!

# -----------------------
# Angular
# -----------------------
cd /home/emerson/projetos/chat-ollama-angular/chat-ollama-angular
./run.sh &
ANGULAR_PID=$!

# -----------------------
# flask
# -----------------------
cd /home/emerson/projetos/chat-ollama-angular/rag-analise-yt
./run.sh &
FLASK_PID=$!

# Função para matar ambos os processos ao pressionar CTRL+C
function cleanup {
  echo "Encerrando os processos..."
  kill -9 $ANGULAR_PID 2>/dev/null
  kill -9 $FLASK_PID 2>/dev/null
  kill -9 $OLLAMA_PID 2>/dev/null
  fnKillPID "${portas[@]}"
  exit 0
}

# Captura o sinal de interrupção (CTRL+C) e chama a função de limpeza
trap cleanup SIGINT

# Aguarda até que os processos sejam finalizados
# wait $ANGULAR_PID
# wait $FLASK_PID
# wait $OLLAMA_PID

while true; do
  sleep 1 # Pausa para reduzir o uso de CPU
done