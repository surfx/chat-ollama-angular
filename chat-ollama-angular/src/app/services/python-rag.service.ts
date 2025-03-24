import { HttpClient, HttpEventType, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { interval, Observable, of, EMPTY } from 'rxjs';
import { catchError, filter, map, switchMap, takeWhile, tap } from 'rxjs/operators';
import { ConfiguracoesRAG, StatusIndexacao } from '../model/modelos';

@Injectable({
  providedIn: 'root'
})
export class PythonRagService {

  private apiUrl: string = 'http://127.0.0.1:5000/'; // rag_python.py
  private readonly pollingInterval = 2000; // Intervalo de polling em milissegundos (ex: 1 segundo)

  public setHost(host: string) {
    if (!host || host.trim().length <= 0) { return; }
    this.apiUrl = host;
  }
  constructor(private http: HttpClient) { }

  public indexarFaissdb(data: string): Observable<any> {
    const url = `${this.apiUrl}indexarFaissdb`;
    const headers = new HttpHeaders({ 'Content-Type': 'text/plain' });

    return this.http.post(url, data, { headers });
  }

  public doQuestion(prompt: string): Observable<any> {
    const url = `${this.apiUrl}doQuestion?prompt=${encodeURIComponent(prompt)}`;
    return this.http.get(url);
  }

  public deleteFaiss(): Observable<any> {
    const url = `${this.apiUrl}deleteFaiss`;
    return this.http.delete(url);
  }

  public resetChroma(): Observable<any> {
    const url = `${this.apiUrl}resetChroma`;
    return this.http.get(url);
  }

  public statusService(): Observable<any> {
    const url = `${this.apiUrl}status`;
    return this.http.get(url);
  }

  public statusIndexacao(): Observable<StatusIndexacao> {
    const url = `${this.apiUrl}statusIndexacao`;
    return this.http.get<StatusIndexacao>(url);
  }

  //#region polling
  public getStatusIndexacaoWithPolling(): Observable<StatusIndexacao> {
    return interval(this.pollingInterval).pipe(
      switchMap(() => this.statusIndexacao()),
      takeWhile(status => !(status.terminado === true || status.porcentagem >= 100), true),
      tap(status => console.log('Status da Indexação:', status))
    );
  }
  //#endregion

  //#region upload files RAG
  public uploadFilesRag(files: File[]): Observable<{ response: any, porcentagem: number }> {
    if (!files || files.length <= 0) return EMPTY; // of(0)
    const url = `${this.apiUrl}upload`;

    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file); // 'files' deve corresponder à chave esperada no Flask (request.files.getlist('files'))
    }

    return this.http.post<any>(url, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      filter(event => event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response),
      map(event => {
        if (event.type === HttpEventType.UploadProgress) {
          if (event.total) {
            const porcentagem = Math.round((100 * event.loaded) / event.total);
            return { response: event, porcentagem: porcentagem };
          }
        } else if (event.type === HttpEventType.Response) {
          return { response: event, porcentagem: 100 };
        }
        return { response: event, porcentagem: 0 };
      }),
      catchError(error => {
        console.error('Erro no upload:', error);
        return of({ response: undefined, porcentagem: 0 });
      })
    );
  }
  //#endregion

  public atualizarConfiguracoesRAG(configuracoes: ConfiguracoesRAG): Observable<any> | undefined {
    if (!configuracoes) { return undefined; }
    const url = `${this.apiUrl}configuracoes`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    // Converter o objeto ConfiguracoesRAG para snake_case antes de enviar
    const configuracoesSnakeCase = this.camelToSnakeCase(configuracoes);
    return this.http.post(url, configuracoesSnakeCase, { headers });
  }


  private camelToSnakeCase(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(this.camelToSnakeCase);
    }

    const newObj: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        newObj[snakeKey] = this.camelToSnakeCase(obj[key]);
      }
    }
    return newObj;
  }

}

/*
curls
 curl -X POST -H "Content-Type: text/plain" -d "D:\meus_documentos\workspace\ia\rag\rag002\data" http://127.0.0.1:5000/indexarChromaDB?collection_name=local-rag
 curl "http://127.0.0.1:5000/doQuestion?prompt=Como+jogar+monopoly+%3F"
 curl -X DELETE "http://127.0.0.1:5000/deleteCollection?collection_name=local-rag"
 curl "http://127.0.0.1:5000/resetChroma"
*/