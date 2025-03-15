import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Configuracoes, TipoMensagem } from '../../model/modelos';
import { ConfiguracoesService } from '../../services/configuracoes.service';
import { MensagensComponent } from '../mensagens/mensagens/mensagens.component';
import { PythonRagService } from '../../services/python-rag.service';

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
export class ModalRagComponent {

  protected visivel = signal<boolean>(false);
  @Input() configuracoes: Partial<Configuracoes> | undefined;
  @Output() configuracoesSalvas = new EventEmitter<void>();

  @ViewChild('mensagemComponente') mensagemComponente: MensagensComponent | undefined;

  constructor(
    private configuracoesService: ConfiguracoesService,
    private pythonRagService: PythonRagService
  ) { }

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

    console.log(this.pythonRagService)

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
        setTimeout(() => { this.hide(); }, 1000);
      },
      error: (err) => {
        console.error(err);
        this.mensagemComponente?.show('Erro ao iniciar a indexação', TipoMensagem.ERRO, 1000);
      },
      complete: () => { }
    });

  }

  // public onFileSelected(event: any): void {
  //   const files: FileList = event.target.files;
  //   if (!files || files.length <= 0) { return; }
  //   const file = files[0];
  //   console.log(file);
  // }

}

// Referência html e css: https://uiverse.io/vinodjangid07/silent-wasp-13