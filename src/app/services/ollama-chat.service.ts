import { Injectable } from '@angular/core';
import ollama, { ListResponse, ModelResponse } from 'ollama'
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OllamaChatService {

  //private const api = 'http://localhost:11434/';


  constructor() { }

  public async teste() {
    // const response = ollama.generate({
    //   model: 'deepseek-r1:7b',
    //   prompt: 'What color is the sky at different times of the day?',
    //   stream: false,
    //   system: 'Responda em português BR',
    // });

    // response.then(response => {
    //   console.log(response.response);
    // });

    ollama.list().then(response => {
      console.log(response);
    });

  }

  public listaModelos(): Observable<ModelResponse[]> {
    return new Observable<ModelResponse[]>((observer) => {
      ollama.list()
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