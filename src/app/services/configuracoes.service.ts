import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Configuracoes } from '../model/modelos';

@Injectable({
  providedIn: 'root'
})
export class ConfiguracoesService {

  private readonly apiUrl: string = 'http://localhost:3000/configuracao';

  constructor(private http: HttpClient) { }

  public listarConfiguracoes(): Observable<Configuracoes[]> {
    return this.http.get<Configuracoes[]>(this.apiUrl);
  }

  public getConfiguracao(id: number): Observable<Configuracoes> {
    return this.http.get<Configuracoes>(`${this.apiUrl}/${id}`);
  }

  public updateConfiguracao(id: number, configuracao: Partial<Configuracoes>): Observable<Configuracoes> {
    return this.http.put<Configuracoes>(`${this.apiUrl}/${id}`, configuracao);
  }

  public deleteConfiguracao(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

}