import { Injectable } from '@angular/core';
import { Ollama, ModelResponse } from 'ollama';
import { Observable } from 'rxjs';
import * as Showdown from 'showdown';

@Injectable({
  providedIn: 'root'
})
export class OllamaChatService {

  //private const api = 'http://localhost:11434/'; http://192.168.0.2:11434
  // ex: http://192.168.0.2:11434/api/tags

  //private showdown  = require('showdown');
  private converter = new Showdown.Converter();
  private ollama = new Ollama({ host: 'http://192.168.0.2:11434' });

  public setHost(host: string) {
    if (!host || host.trim().length <= 0) { return; }
    this.ollama = new Ollama({ host: host });
  }

  public chatOllama(
    userPrompt: string,
    modelo = 'deepseek-v2:16b',
    temperatura: number = 0.7,
    history: { role: 'user' | 'assistant', content: string }[],
    converterMarkdown: boolean = true
  ): Observable<string> {
    return new Observable<string>((observer) => {

      const streamResponse = this.ollama.chat({
        model: modelo,
        messages: [...history, { role: 'user', content: userPrompt }],
        stream: true,
        options: {
          temperature: temperatura
        }
      });

      (async () => {
        try {
          let fullResponse = '';
          for await (const chunk of await streamResponse) {
            if (chunk.message && chunk.message.content) {
              fullResponse += chunk.message.content;
            }
          }
          const rt = !converterMarkdown ? fullResponse : this.converter.makeHtml(fullResponse);
          observer.next(rt);
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      })();
    });
  }

  public listaModelos(): Observable<ModelResponse[]> {
    return new Observable<ModelResponse[]>((observer) => {
      this.ollama.list()
        .then((response) => {
          observer.next(response.models);
          observer.complete();
        })
        .catch((error) => {
          observer.error(error);
        });
    });
  }

}

/*
curl http://192.168.0.36:11434/api/generate -d '{
  "model": "deepseek-r1:7b",
  "prompt": "What color is the sky at different times of the day? Respond using JSON",
  "format": "json",
  "stream": false
}'
*/