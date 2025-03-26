import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Configuracoes, StatusIndexacao, TipoMensagem } from '../../../../model/modelos';
import { PythonRagService } from '../../../../services/python-rag.service';
import { MensagensComponent } from '../../../mensagens/mensagens/mensagens.component';
import { UploadFilesRagComponent } from '../../upload-files-rag/upload-files-rag.component';

@Component({
  selector: 'app-modal-rag',
  imports: [
    CommonModule,
    FormsModule,
    MensagensComponent,
    UploadFilesRagComponent
  ],
  templateUrl: './modal-rag.component.html',
  styleUrl: './modal-rag.component.scss'
})
export class ModalRagComponent {

  protected visivel = signal<boolean>(false);

  @Input() configuracoes: Partial<Configuracoes> | undefined;
  @Output() pollingStatus = new EventEmitter<StatusIndexacao>();

  @ViewChild('mensagemComponente') mensagemComponente: MensagensComponent | undefined;

  constructor(private pythonRagService: PythonRagService) { }

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

  // protected indexar(): void {

  //   let txtUrlServico = document.getElementById('txtUrlServico') as HTMLInputElement;
  //   let txtPathDocumentos = document.getElementById('txtPathDocumentos') as HTMLInputElement;

  //   if (!this.pythonRagService) {
  //     this.mensagemComponente?.show('Erro ao recuperar o serviço', TipoMensagem.ERRO, 700);
  //     return;
  //   }

  //   if (!this.configuracoes || !this.configuracoes.configuracoesRAG) {
  //     this.mensagemComponente?.show('Informe as configurações', TipoMensagem.ERRO, 700);
  //     return;
  //   }
  //   if (!this.configuracoes.configuracoesRAG.urlServico) {
  //     this.mensagemComponente?.show('Informe a url do serviço', TipoMensagem.ALERTA, 700);
  //     txtUrlServico && txtUrlServico.focus();
  //     return;
  //   }
  //   if (!this.configuracoes.configuracoesRAG.pathDocumentos) {
  //     this.mensagemComponente?.show('Informe a pasta dos documentos', TipoMensagem.ALERTA, 700);
  //     !!txtPathDocumentos && txtPathDocumentos.focus();
  //     return;
  //   }

  //   let btnIndexar = document.getElementById('btnIndexar') as HTMLButtonElement;
  //   if (!!btnIndexar) btnIndexar.disabled = true;

  //   this.mensagemComponente?.show('Início da indexação. Aguarde', TipoMensagem.INFO, 1000);
  //   this.progressbarVisivel.set(true);

  //   this.pythonRagService.setHost(this.configuracoes.configuracoesRAG.urlServico);
  //   this.pythonRagService.indexarFaissdb(
  //     this.configuracoes.configuracoesRAG.pathDocumentos
  //   ).subscribe({
  //     next: (res) => {
  //       this.mensagemComponente?.show('A indexação será feita em segundo plano', TipoMensagem.INFO, 1000);
  //       this.doPolling();
  //       //setTimeout(() => { this.hide(); }, 1000);
  //     },
  //     error: (err) => {
  //       console.error(err);
  //       this.mensagemComponente?.show('Erro ao iniciar a indexação', TipoMensagem.ERRO, 1000);
  //       if (!!btnIndexar) btnIndexar.disabled = false;
  //     },
  //     complete: () => { }
  //   });

  // }



  protected deletarDB(): void {
    // TODO: criar modal y/n
    if (!confirm('Deseja deletar toda a base de dados RAG ?')) { return; }

    this.pythonRagService.deleteDb().subscribe({
      next: (res) => {
        this.mensagemComponente?.show('Db excluído', TipoMensagem.INFO, 1000);
      },
      error: (err) => {
        this.mensagemComponente?.show('Erro ao excluir o db', TipoMensagem.ERRO, 1000);
      }
    });
  }

  // public onFileSelected(event: any): void {
  //   const files: FileList = event.target.files;
  //   if (!files || files.length <= 0) { return; }
  //   const file = files[0];
  //   console.log(file);
  // }

  //#region polling status
  protected evtPollingStatus(status: StatusIndexacao): void {
    !!status && !!this.pollingStatus && this.pollingStatus.emit(status);
  }
  //#endregion

  protected evtShowMessage(event: { mensagem: string, tipo: TipoMensagem, timeout?: number }): void {
    const { mensagem, tipo, timeout } = event;
    this.mensagemComponente?.show(mensagem, tipo, timeout);
  }

}

// Referência html e css: https://uiverse.io/vinodjangid07/silent-wasp-13