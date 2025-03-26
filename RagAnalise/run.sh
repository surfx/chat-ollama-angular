#!/bin/bash

# flask
portas=(5000)

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

cd /tmp/uv_environments; source my_env_3129/bin/activate
uv run /home/emerson/projetos/chat-ollama-angular/RagAnalise/python/RagAnalise/RagAnalise.py &
FLASK_PID=$!

# Função para matar ambos os processos ao pressionar CTRL+C
function cleanup {
  echo "Encerrando os processos..."
  kill -9 $FLASK_PID 2>/dev/null
  fnKillPID "${portas[@]}"
  exit 0
}

# Captura o sinal de interrupção (CTRL+C) e chama a função de limpeza
trap cleanup SIGINT

while true; do
  sleep 1 # Pausa para reduzir o uso de CPU
done