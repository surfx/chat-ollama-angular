import { Injectable } from '@angular/core';
import { Ollama, ModelResponse, Message, ChatResponse, GenerateResponse } from 'ollama';
import { map, Observable } from 'rxjs';
import { UnifiedChatResponse } from '../model/modelos';
//import * as Showdown from 'showdown';

@Injectable({
  providedIn: 'root'
})
export class OllamaChatService {

  //private const api = 'http://localhost:11434/'; http://192.168.0.2:11434
  // ex: http://192.168.0.2:11434/api/tags

  //private showdown  = require('showdown');
  //private converter = new Showdown.Converter();
  private ollama = new Ollama({ host: 'http://192.168.0.2:11434' });

  public setHost(host: string) {
    if (!host || host.trim().length <= 0) { return; }
    this.ollama = new Ollama({ host: host });
  }

  //#region constulas ollama - chat / generate
  public consultaOllama(
    modo: 'chat' | 'generate' = 'chat',
    userPrompt: string,
    modelo = 'deepseek-v2:16b',
    temperatura: number = 0.7,
    history: Message[] = [],
    images: Uint8Array[] | string[] = []
  ): Observable<UnifiedChatResponse> {
    if (modo === 'chat') {
      return this.chatOllama(userPrompt, modelo, temperatura, history).pipe(map(this.toUnifiedChatResponseFromChat));
    }
    return this.generateOllama(userPrompt, modelo, temperatura, history, images).pipe(map(this.toUnifiedChatResponseFromGenerateResponse));
  }

  public chatOllama(
    userPrompt: string,
    modelo = 'deepseek-v2:16b',
    temperatura: number = 0.7,
    history: Message[] = []
  ): Observable<ChatResponse> {
    return new Observable<ChatResponse>((observer) => {

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
          for await (const chunk of await streamResponse) {
            if (chunk) {
              observer.next(chunk);
            }
          }
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      })();
    });
  }


  public generateOllama(
    userPrompt: string,
    modelo = 'deepseek-v2:16b',
    temperatura: number = 0.7,
    history: Message[] = [],
    images: Uint8Array[] | string[] = []
  ): Observable<GenerateResponse> {
    return new Observable<GenerateResponse>((observer) => {

      let prompt = '';
      history.map(h => h.content).forEach(h => prompt += h + ' ');
      prompt += userPrompt;

      const streamResponse = this.ollama.generate({
        model: modelo,
        prompt: prompt,
        stream: true,
        options: {
          temperature: temperatura
        },
        images: images
      });

      (async () => {
        try {
          for await (const chunk of await streamResponse) {
            if (chunk) {
              observer.next(chunk);
            }
          }
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      })();
    });
  }
  //#endregion

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

  public abortar(): void {
    this.ollama.abort();
  }

  //#region conversor
  private toUnifiedChatResponseFromGenerateResponse(generateResponse: Partial<GenerateResponse>): UnifiedChatResponse {
    return {
      model: generateResponse.model || '',
      created_at: generateResponse.created_at || new Date(),
      message: {
        role: 'assistant',
        content: generateResponse.response || '',
      },
      done: generateResponse.done || false,
      done_reason: generateResponse.done_reason || '',
      total_duration: generateResponse.total_duration || 0,
      load_duration: generateResponse.load_duration || 0,
      prompt_eval_count: generateResponse.prompt_eval_count || 0,
      prompt_eval_duration: generateResponse.prompt_eval_duration || 0,
      eval_count: generateResponse.eval_count || 0,
      eval_duration: generateResponse.eval_duration || 0
    };
  }

  private toUnifiedChatResponseFromChat(chatResponse: Partial<ChatResponse>): UnifiedChatResponse {
    return {
      model: chatResponse.model || '',
      created_at: chatResponse.created_at || new Date(),
      message: chatResponse.message || { role: 'assistant', content: '' },
      done: chatResponse.done || false,
      done_reason: chatResponse.done_reason || '',
      total_duration: chatResponse.total_duration || 0,
      load_duration: chatResponse.load_duration || 0,
      prompt_eval_count: chatResponse.prompt_eval_count || 0,
      prompt_eval_duration: chatResponse.prompt_eval_duration || 0,
      eval_count: chatResponse.eval_count || 0,
      eval_duration: chatResponse.eval_duration || 0
    };
  }
  //#endregion

}

// this.converter.makeHtml(fullResponse)

/*
curl http://192.168.0.36:11434/api/generate -d '{
  "model": "deepseek-r1:7b",
  "prompt": "What color is the sky at different times of the day? Respond using JSON",
  "format": "json",
  "stream": false
}'
*/