import { CommonModule } from '@angular/common';
import { Component, signal, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModelResponse } from 'ollama';
import { delay } from 'rxjs';
import getDefaultPartialConfig, { Configuracoes, ModosValidos, StatusIndexacao, TipoMensagem, UnifiedChatResponse } from '../../model/modelos';
import { ConfiguracoesService } from '../../services/configuracoes.service';
import { OllamaChatService } from '../../services/ollama-chat.service';
import { PythonRagService } from '../../services/python-rag.service';
import { ChatDisplayComponent } from '../auxiliar/chat-display/chat-display.component';
import { ModalConfiguracaoComponent } from '../auxiliar/modais/modal-configuracao/modal-configuracao.component';
import { ModalRagComponent } from '../auxiliar/modais/modal-rag/modal-rag.component';
import { TagSelectionComponent } from '../auxiliar/tag-selection/tag-selection.component';
import { MensagensOverlayComponent } from '../mensagens/mensagens-overlay/mensagens-overlay.component';
import { MensagensComponent } from '../mensagens/mensagens/mensagens.component';
import { Util } from '../../util/util';

@Component({
  selector: 'app-chat-ollama-page',
  imports: [
    CommonModule,
    FormsModule,
    MensagensComponent,
    MensagensOverlayComponent,
    ChatDisplayComponent,
    TagSelectionComponent,
    ModalRagComponent,
    ModalConfiguracaoComponent
  ],
  templateUrl: './chat-ollama-page.component.html',
  styleUrl: './chat-ollama-page.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ChatOllamaPageComponent {

  @ViewChild('mensagemComponente') mensagemComponente: MensagensComponent | undefined;
  @ViewChild('mensagensOverlayComponent') mensagensOverlayComponent: MensagensOverlayComponent | undefined;
  @ViewChild('appchatdisplay') appchatdisplay: ChatDisplayComponent | undefined;
  @ViewChild('tagSelection') tagSelection: TagSelectionComponent | undefined;
  @ViewChild('modalRagComponent') modalRagComponent: ModalRagComponent | undefined;
  @ViewChild('modalConfiguracaoComponent') modalConfiguracaoComponent: ModalConfiguracaoComponent | undefined;

  public configuracoes: Partial<Configuracoes> = getDefaultPartialConfig();
  private readonly defaultId = 1;
  protected userPrompt: string = '';
  protected modelos: ModelResponse[] | undefined;
  protected isServerOnline = signal(false);
  protected valoresSelecionados: typeof ModosValidos = ModosValidos;
  private images: string[] = [];

  constructor(
    private configuracoesService: ConfiguracoesService,
    private ollamaChatService: OllamaChatService,
    private pythonRagService: PythonRagService
  ) {
    this.configuracoesService.getConfiguracao(this.defaultId).subscribe({
      next: (res) => {
        this.configuracoes = Util.mergeConfiguracoesRecursivo(this.configuracoes as Configuracoes, res);
        if (this.configuracoes.ollama_api) this.ollamaChatService.setHost(this.configuracoes.ollama_api);
        this.atualizarConfiguracoesRAG();
      },
      error: (err) => console.error(err),
      complete: () => { }
    });

    this.ollamaChatService.listaModelos().pipe(delay(500)).subscribe({
      next: (res) => {
        this.modelos = res;
        if (!this.configuracoes!.configuracoesRAG!.localModel) {
          this.configuracoes!.configuracoesRAG!.localModel = (!!res && res.length > 0) ? res[0].name : '';
        }
        this.isServerOnline.set(true);
      },
      error: (err) => { console.error(err); this.isServerOnline.set(false); },
      complete: () => { }
    });

    // Teste
    //this.userPrompt = 'Crie uma classe em Java para tratar caracteres da String valorTeste que não estejam no range entre A e Z, use regex';
    //this.userPrompt = 'Descreva a imagem';
  }

  //#region btns
  // btnSalvarConfiguracoes(showMessage = true) {
  //   if (!this.configuracoes || !this.configuracoes.ollama_api) { return; }
  //   this.ollamaChatService.setHost(this.configuracoes.ollama_api);

  //   this.configuracoesService.updateConfiguracao(this.defaultId, this.configuracoes).subscribe({
  //     next: (res) => {
  //       if (!showMessage) { return; }
  //       this.mensagensOverlayComponent?.show('Configurações Salvas', TipoMensagem.SUCESSO, 700);
  //     },
  //     error: (err) => {
  //       if (!showMessage) { return; }
  //       this.mensagensOverlayComponent?.show('Erro ao salvar as configurações', TipoMensagem.ERRO, 1000);
  //     },
  //     complete: () => { }
  //   });
  // }

  btnShowConfiguracoes() {
    if (!this.modalConfiguracaoComponent) return;
    this.modalConfiguracaoComponent.configuracoes = this.configuracoes as Configuracoes;

    this.modalConfiguracaoComponent.show();
  }

  btnLimparMensagem() {
    this.userPrompt = '';
    let txtUserPrompt = document.getElementById('txtUserPrompt') as HTMLInputElement;
    !!txtUserPrompt && txtUserPrompt.focus();
    this.appchatdisplay?.limparMensagens();
  }

  btnAbortarMensagem() {
    this.ollamaChatService.abortar();
    this.updateChatTxt('Análise abortada', true);
    this.loadingChat(false);
    this.toggleForm(false);
  }

  public btnEnviarMensagem(): void {
    if (!this.userPrompt || this.userPrompt.trim().length <= 0) { this.mensagemComponente?.show('Informe a mensagem', TipoMensagem.ALERTA, 700); this.scrollMsgAppMensagem(); return; }
    if (!this.configuracoes!.configuracoesRAG!.localModel || this.configuracoes!.configuracoesRAG!.localModel.trim().length <= 0) {
      this.mensagemComponente?.show('Selecione o modelo', TipoMensagem.ALERTA, 700); this.scrollMsgAppMensagem(); return;
    }

    let temperatura = this.configuracoes?.configuracoes!.temperatura || 0.7;
    if (!temperatura || temperatura < 0) { temperatura = 0.7; this.configuracoes!.configuracoes!.temperatura = temperatura; }

    this.toggleForm(true);
    this.updateChatTxt(this.userPrompt);
    this.loadingChat();


    let completeMethod = () => {
      this.mensagensOverlayComponent?.hide();
      this.appchatdisplay?.scrollToLastMessage();
      this.loadingChat(false);
      this.toggleForm(false);
    };

    let msgErr = (message: string) => {
      message = message || 'Erro ao consultar o serviço RAG';
      this.updateChatTxt(message, true);
      this.mensagensOverlayComponent?.show(message, TipoMensagem.ERRO, 700);
      this.scrollMsgAppMensagem();
      this.btnAbortarMensagem();
    };

    if (this.configuracoes?.configuracoes?.modo === 'rag') {
      this.pythonRagService.statusService().subscribe({
        next: (res) => {
          if (!res || !res.success) {
            msgErr(res.message || 'Erro ao realizar a consulta no RAG, serviço offline');
            return;
          }

          this.pythonRagService.doQuestion(this.userPrompt).subscribe({
            next: (res) => {
              if (!res || !res.success) {
                msgErr(res.message || 'Erro ao realizar a consulta no RAG');
                return;
              }

              this.updateChatTxt(res.message, true);
              this.loadingChat(false);
              this.toggleForm(false);
            },
            error: (err) => { msgErr(err); },
            complete: () => { completeMethod(); }
          });
        },
        error: (err) => { msgErr(err); }
      });
      return;
    }

    let index = -1;
    this.ollamaChatService.consultaOllama(
      this.configuracoes?.configuracoes?.modo,
      this.userPrompt, this.configuracoes!.configuracoesRAG!.localModel, temperatura,
      this.appchatdisplay?.getHistorico() ?? [],
      this.images
    ).subscribe({
      next: (res) => {
        if (index < 0) {
          index = this.updateChat(res);
        } else {
          this.updateChatMessage(index, res);
        }
      },
      error: (err) => { msgErr(err); },
      complete: () => { completeMethod(); }
    });
  }
  //#endregion

  private updateChatTxt(response: string, is_ollama: boolean = false): number {
    let add: Partial<UnifiedChatResponse> = {
      done: true,
      message: {
        role: is_ollama ? 'assistant' : 'user',
        content: response
      }
    };
    return this.updateChat(add);
  }

  private updateChat(response: Partial<UnifiedChatResponse>): number {
    let index = this.appchatdisplay?.adicionarMensagem(response);
    if (response.message?.role === 'user') {
      let txtUserPrompt = document.getElementById('txtUserPrompt') as HTMLInputElement;
      !!txtUserPrompt && txtUserPrompt.focus();
    } else {
      this.userPrompt = '';
    }
    return index ?? -1;
  }

  public updateChatMessage(index: number, response: UnifiedChatResponse): void {
    this.appchatdisplay?.updateMessage(index, response);
  }

  //#region rag
  protected btnRag(): void {
    if (!this.modalRagComponent) return;
    this.modalRagComponent.configuracoes = this.configuracoes;

    this.modalRagComponent.show();
  }

  protected evtConfiguracoesSalvas(configuracoes: Configuracoes | undefined): void {
    if (!configuracoes) { return; }
    this.configuracoes = configuracoes;
    this.atualizarConfiguracoesRAG();
    this.mensagensOverlayComponent?.show('Configurações Salvas', TipoMensagem.SUCESSO, 700);
  }
  protected evtPollingStatus(status: StatusIndexacao): void {
    if (status.terminado === true) {
      this.mensagensOverlayComponent?.show('Indexação Terminada', TipoMensagem.SUCESSO, 700);
    }
    //console.log('[evtPollingStatus]', status);
  }

  protected evtValorSelecionadoChange(_: string): void {
    this.salvarConfiguracoes();
  }

  protected salvarConfiguracoes(showMessage = false): void {
    if (!this.configuracoes || !this.configuracoes.ollama_api) { return; }
    this.ollamaChatService.setHost(this.configuracoes.ollama_api);

    this.configuracoesService.updateConfiguracao(this.defaultId, this.configuracoes).subscribe({
      next: (res) => {
        this.atualizarConfiguracoesRAG();
        if (!showMessage) { return; }
        this.mensagensOverlayComponent?.show('Configurações Salvas', TipoMensagem.SUCESSO, 700);
      },
      error: (err) => {
        if (!showMessage) { return; }
        this.mensagensOverlayComponent?.show('Erro ao salvar as configurações', TipoMensagem.ERRO, 1000);
      },
      complete: () => { }
    });
  }

  // protected onchangeChkRag(): void {
  //   let showMessage = false;
  //   if (!this.configuracoes || !this.configuracoes.ollama_api) { return; }
  //   this.ollamaChatService.setHost(this.configuracoes.ollama_api);

  //   this.configuracoesService.updateConfiguracao(this.defaultId, this.configuracoes).subscribe({
  //     next: (res) => {
  //       if (!showMessage) { return; }
  //       this.mensagensOverlayComponent?.show('Configurações Salvas', TipoMensagem.SUCESSO, 700);
  //     },
  //     error: (err) => {
  //       if (!showMessage) { return; }
  //       this.mensagensOverlayComponent?.show('Erro ao salvar as configurações', TipoMensagem.ERRO, 1000);
  //     },
  //     complete: () => { }
  //   });
  // }

  //#endregion

  //#region image upload
  public onFileSelected(event: any): void {
    this.images = [];

    this.mensagemComponente?.show('Obs: nem todos os modelos suportam análise de imagem (llava:7b possui).', TipoMensagem.INFO, 1000);
    this.scrollMsgAppMensagem();

    const files: FileList = event.target.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = (e: any) => {
        const arrayBuffer = e.target.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        const base64String = this.arrayBufferToBase64(uint8Array);

        // Adiciona Base64 string ao array de imagens
        this.images.push(base64String);
      };

      reader.readAsArrayBuffer(file);
    }

    let fileInputImage = document.getElementById('fileInputImage') as HTMLInputElement;
    if (!!fileInputImage) fileInputImage.value = '';

    //console.log(this.images);
  }

  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
  //#endregion

  private toggleForm(desabilitar: boolean = true) {
    let txtUserPrompt = document.getElementById('txtUserPrompt') as HTMLInputElement;
    let selModelos = document.getElementById('selModelos') as HTMLSelectElement;
    let btnLimpar = document.getElementById('btnLimpar') as HTMLButtonElement;
    let btnEnviar = document.getElementById('btnEnviar') as HTMLButtonElement;
    let temperature = document.getElementById('temperature') as HTMLInputElement;
    let fileInputImage = document.getElementById('fileInputImage') as HTMLInputElement;
    let btnEnviarImagem = document.getElementById('btnEnviarImagem') as HTMLInputElement;

    if (!!txtUserPrompt) {
      txtUserPrompt.focus();
      txtUserPrompt.disabled = desabilitar;
    }
    if (!!selModelos) { selModelos.disabled = desabilitar; }
    if (!!btnLimpar) { btnLimpar.disabled = desabilitar; }
    if (!!btnEnviar) { btnEnviar.disabled = desabilitar; }
    if (!!temperature) { temperature.disabled = desabilitar; }
    if (!!fileInputImage) { fileInputImage.disabled = desabilitar; }
    if (!!btnEnviarImagem) { btnEnviarImagem.disabled = desabilitar; }
  }

  private scrollMsgAppMensagem(timeout = 35) {
    let scroolto = () => { window.document.getElementById('msg_app_mensagem')?.scrollIntoView({ behavior: 'smooth' }); };
    if (timeout <= 0) { scroolto(); return; }
    setTimeout(() => scroolto(), timeout);
  }

  private loadingChat(isLoading: boolean = true) {
    !!isLoading ? this.appchatdisplay?.loadingMessage() : this.appchatdisplay?.removeLoadingMessage();

    let btnEnviar = document.getElementById('btnEnviar') as HTMLButtonElement;
    if (!btnEnviar) { return; }
    btnEnviar.innerHTML = isLoading ? '<img src="/imagens/loading/infinity2.svg" class="loading_img_chat" alt="">' : 'Enviar';
  }

  private atualizarConfiguracoesRAG(): void {
    if (!this.configuracoes.configuracoesRAG) { return; }
    this.pythonRagService.atualizarConfiguracoesRAG(this.configuracoes.configuracoesRAG)?.subscribe({
      next: (valor) => {

      }
    });
  }

}