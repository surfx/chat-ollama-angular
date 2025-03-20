import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { interval, Observable } from 'rxjs';
import { switchMap, takeWhile, tap } from 'rxjs/operators';
import { StatusIndexacao } from '../model/modelos';

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

}

/*
curls
 curl -X POST -H "Content-Type: text/plain" -d "D:\meus_documentos\workspace\ia\rag\rag002\data" http://127.0.0.1:5000/indexarChromaDB?collection_name=local-rag
 curl "http://127.0.0.1:5000/doQuestion?prompt=Como+jogar+monopoly+%3F"
 curl -X DELETE "http://127.0.0.1:5000/deleteCollection?collection_name=local-rag"
 curl "http://127.0.0.1:5000/resetChroma"
*/