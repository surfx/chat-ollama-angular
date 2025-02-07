# Init

```bash
npm i ollama
```

# Start o projeto

`npm start`

- [http://localhost:4200/](http://localhost:4200/)

## Ollama

```bash
curl http://192.168.0.36:11434/api/generate -d '{
  "model": "deepseek-r1:7b",
  "prompt": "What color is the sky at different times of the day? Respond using JSON",
  "format": "json",
  "stream": false
}'
```

# Referências

- [Ollama JavaScript Library](https://github.com/ollama/ollama-js)