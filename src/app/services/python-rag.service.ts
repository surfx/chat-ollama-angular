import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PythonRagService {

  private apiUrl: string = 'http://127.0.0.1:5000/'; // rag_python.py

  public setHost(host: string) {
    if (!host || host.trim().length <= 0) { return; }
    this.apiUrl = host;
  }
  constructor(private http: HttpClient) { }

  public indexarChromaDB(data: string, collectionName: string): Observable<any> {
    const url = `${this.apiUrl}indexarChromaDB?collection_name=${collectionName}`;
    const headers = new HttpHeaders({ 'Content-Type': 'text/plain' });

    return this.http.post(url, data, { headers });
  }

  public doQuestion(prompt: string): Observable<any> {
    const url = `${this.apiUrl}doQuestion?prompt=${encodeURIComponent(prompt)}`;
    return this.http.get(url);
  }

  public deleteCollection(collectionName: string): Observable<any> {
    const url = `${this.apiUrl}deleteCollection?collection_name=${collectionName}`;
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

}

/*
curls
 curl -X POST -H "Content-Type: text/plain" -d "D:\meus_documentos\workspace\ia\rag\rag002\data" http://127.0.0.1:5000/indexarChromaDB?collection_name=local-rag
 curl "http://127.0.0.1:5000/doQuestion?prompt=Como+jogar+monopoly+%3F"
 curl -X DELETE "http://127.0.0.1:5000/deleteCollection?collection_name=local-rag"
 curl "http://127.0.0.1:5000/resetChroma"
*/