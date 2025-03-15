import { CommonModule } from '@angular/common';
import { Component, signal, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModelResponse } from 'ollama';
import { delay } from 'rxjs';
import { Configuracoes, TipoMensagem, UnifiedChatResponse } from '../../model/modelos';
import { ConfiguracoesService } from '../../services/configuracoes.service';
import { OllamaChatService } from '../../services/ollama-chat.service';
import { ChatDisplayComponent } from '../auxiliar/chat-display/chat-display.component';
import { MensagensOverlayComponent } from '../mensagens/mensagens-overlay/mensagens-overlay.component';
import { MensagensComponent } from '../mensagens/mensagens/mensagens.component';
import { TagSelectionComponent } from '../auxiliar/tag-selection/tag-selection.component';
import { ModalRagComponent } from '../modal-rag/modal-rag.component';

@Component({
  selector: 'app-chat-ollama-page',
  imports: [
    CommonModule,
    FormsModule,
    MensagensComponent,
    MensagensOverlayComponent,
    ChatDisplayComponent,
    TagSelectionComponent,
    ModalRagComponent
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

  public configuracoes: Partial<Configuracoes> = {
    configuracoes: {
      modo: 'chat',
      rag: false,
      temperatura: 0.7
    }
  };
  private readonly defaultId = 1;
  protected selectedModel: string = '';
  protected userPrompt: string = '';
  protected modelos: ModelResponse[] | undefined;
  protected isServerOnline = signal(false);
  protected valoresSelecionados: string[] = ['chat', 'generate'];
  private images: string[] = [];

  constructor(private configuracoesService: ConfiguracoesService, private ollamaChatService: OllamaChatService) {
    this.configuracoesService.getConfiguracao(this.defaultId).subscribe({
      next: (res) => this.configuracoes = res,
      error: (err) => console.error(err),
      complete: () => { }
    });
    if (this.configuracoes.ollama_api) this.ollamaChatService.setHost(this.configuracoes.ollama_api);

    this.ollamaChatService.listaModelos().pipe(delay(500)).subscribe({
      next: (res) => {
        this.modelos = res;
        this.selectedModel = (!!res && res.length > 0) ? res[0].name : '';
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
  btnSalvarConfiguracoes() {
    if (!this.configuracoes || !this.configuracoes.ollama_api) { return; }
    this.ollamaChatService.setHost(this.configuracoes.ollama_api);

    this.configuracoesService.updateConfiguracao(this.defaultId, this.configuracoes).subscribe({
      next: (res) => this.mensagensOverlayComponent?.show('Configurações Salvas', TipoMensagem.SUCESSO, 700),
      error: (err) => this.mensagensOverlayComponent?.show('Erro ao salvar as configurações', TipoMensagem.ERRO, 1000),
      complete: () => { }
    });
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
    if (!this.selectedModel || this.selectedModel.trim().length <= 0) { this.mensagemComponente?.show('Selecione o modelo', TipoMensagem.ALERTA, 700); this.scrollMsgAppMensagem(); return; }

    let temperatura = this.configuracoes.configuracoes!.temperatura;
    if (!temperatura || temperatura < 0) { temperatura = 0.7; this.configuracoes.configuracoes!.temperatura = temperatura; }

    this.toggleForm(true);
    this.updateChatTxt(this.userPrompt);
    this.loadingChat();

    let index = -1;

    this.ollamaChatService.consultaOllama(
      this.configuracoes.configuracoes?.modo,
      this.userPrompt, this.selectedModel, temperatura,
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
      error: (err) => {
        this.updateChatTxt(err, true);
        this.mensagemComponente?.show('Erro na comunicação com o Ollama', TipoMensagem.ERRO, 700);
        this.scrollMsgAppMensagem();
      },
      complete: () => {
        this.mensagensOverlayComponent?.hide();
        this.appchatdisplay?.scrollToLastMessage();
        this.loadingChat(false);
        this.toggleForm(false);
      }
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
  public btnRag(): void {
    this.modalRagComponent?.show();
  }
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

    console.log(this.images);
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

}