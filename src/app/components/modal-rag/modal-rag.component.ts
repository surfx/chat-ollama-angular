import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { Configuracoes, StatusIndexacao, TipoMensagem } from '../../model/modelos';
import { ConfiguracoesService } from '../../services/configuracoes.service';
import { PythonRagService } from '../../services/python-rag.service';
import { MensagensComponent } from '../mensagens/mensagens/mensagens.component';

@Component({
  selector: 'app-modal-rag',
  imports: [
    CommonModule,
    FormsModule,
    MensagensComponent
  ],
  templateUrl: './modal-rag.component.html',
  styleUrl: './modal-rag.component.scss'
})
export class ModalRagComponent implements OnDestroy {

  private unsubscribe$ = new Subject<void>();
  private pollingSubscription: Subscription | undefined;
  protected visivel = signal<boolean>(false);

  @Input() configuracoes: Partial<Configuracoes> | undefined;
  @Output() configuracoesSalvas = new EventEmitter<void>();
  @Output() pollingStatus = new EventEmitter<StatusIndexacao>();

  @ViewChild('mensagemComponente') mensagemComponente: MensagensComponent | undefined;

  constructor(
    private configuracoesService: ConfiguracoesService,
    private pythonRagService: PythonRagService
  ) { }


  ngOnDestroy(): void {
    this.endSubscription();
  }

  public show(): void {
    this.visivel.set(true);

    setTimeout(() => {
      let txtUrlServico = document.getElementById('txtUrlServico') as HTMLInputElement;
      if (txtUrlServico) txtUrlServico.focus();
    }, 100);
  }

  public clickHide(event?: MouseEvent): void {
    if (event) this.hide();
  }

  public hide(): void {
    this.visivel.set(false);
  }

  protected salvar(): void {
    if (this.configuracoes) {
      this.configuracoesService.updateConfiguracao(1, this.configuracoes).subscribe({
        next: (res) => {
          this.configuracoesSalvas.emit();
          this.mensagemComponente?.show('Configurações Salvas', TipoMensagem.SUCESSO, 700);
          setTimeout(() => { this.hide(); }, 300);
        },
        error: (err) => this.mensagemComponente?.show('Erro ao salvar as configurações', TipoMensagem.ERRO, 1000),
        complete: () => { }
      });
    }
  }

  protected indexar(): void {

    let txtUrlServico = document.getElementById('txtUrlServico') as HTMLInputElement;
    let txtCollectionName = document.getElementById('txtCollectionName') as HTMLInputElement;
    let txtPathDocumentos = document.getElementById('txtPathDocumentos') as HTMLInputElement;

    if (!this.pythonRagService) {
      this.mensagemComponente?.show('Erro ao recuperar o serviço', TipoMensagem.ERRO, 700);
      return;
    }

    if (!this.configuracoes || !this.configuracoes.configuracoesRAG) {
      this.mensagemComponente?.show('Informe as configurações', TipoMensagem.ERRO, 700);
      return;
    }
    if (!this.configuracoes.configuracoesRAG.urlServico) {
      this.mensagemComponente?.show('Informe a url do serviço', TipoMensagem.ALERTA, 700);
      txtUrlServico && txtUrlServico.focus();
      return;
    }
    if (!this.configuracoes.configuracoesRAG.urlServico) {
      this.mensagemComponente?.show('Informe o nome da collection', TipoMensagem.ALERTA, 700);
      !!txtCollectionName && txtCollectionName.focus();
      return;
    }
    if (!this.configuracoes.configuracoesRAG.pathDocumentos) {
      this.mensagemComponente?.show('Informe a pasta dos documentos', TipoMensagem.ALERTA, 700);
      !!txtPathDocumentos && txtPathDocumentos.focus();
      return;
    }

    this.pythonRagService.setHost(this.configuracoes.configuracoesRAG.urlServico);
    this.pythonRagService.indexarChromaDB(
      this.configuracoes.configuracoesRAG.pathDocumentos,
      this.configuracoes.configuracoesRAG.collectionName
    ).subscribe({
      next: (res) => {
        this.mensagemComponente?.show('A indexação será feita em segundo plano', TipoMensagem.INFO, 1000);
        this.doPolling();
        setTimeout(() => { this.hide(); }, 1000);
      },
      error: (err) => {
        console.error(err);
        this.mensagemComponente?.show('Erro ao iniciar a indexação', TipoMensagem.ERRO, 1000);
      },
      complete: () => { }
    });

  }

  //#region polling
  private doPolling(): void {
    this.pollingSubscription = this.pythonRagService.getStatusIndexacaoWithPolling()
      .pipe(takeUntil(this.unsubscribe$)) // Para evitar vazamentos de memória ao destruir o componente
      .subscribe({
        next: (status) => {
          !!this.pollingStatus && this.pollingStatus.emit(status);
          if (status.terminado === true || status.porcentagem >= 100) {
            console.log('Indexação Concluída:', status);
            this.mensagemComponente?.show('Indexação concluída', TipoMensagem.SUCESSO, 1000);
            this.endSubscription();
          }
        },
        error: (err) => {
          console.error('Erro no polling do status:', err);
          this.endSubscription();
        }
      });
  }

  private endSubscription(): void {
    this.pollingSubscription?.unsubscribe();
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
  //#endregion

  // public onFileSelected(event: any): void {
  //   const files: FileList = event.target.files;
  //   if (!files || files.length <= 0) { return; }
  //   const file = files[0];
  //   console.log(file);
  // }

}

// Referência html e css: https://uiverse.io/vinodjangid07/silent-wasp-13