import { CommonModule } from '@angular/common';
import { Component, signal, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatResponse, ModelResponse } from 'ollama';
import { delay } from 'rxjs';
import { Configuracoes, TipoMensagem } from '../../model/modelos';
import { ConfiguracoesService } from '../../services/configuracoes.service';
import { OllamaChatService } from '../../services/ollama-chat.service';
import { ChatDisplayComponent } from '../auxiliar/chat-display/chat-display.component';
import { MensagensOverlayComponent } from '../mensagens/mensagens-overlay/mensagens-overlay.component';
import { MensagensComponent } from '../mensagens/mensagens/mensagens.component';

@Component({
  selector: 'app-chat-ollama-page',
  imports: [
    CommonModule,
    FormsModule,
    MensagensComponent,
    MensagensOverlayComponent,
    ChatDisplayComponent
  ],
  templateUrl: './chat-ollama-page.component.html',
  styleUrl: './chat-ollama-page.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ChatOllamaPageComponent {

  @ViewChild('mensagemComponente') mensagemComponente: MensagensComponent | undefined;
  @ViewChild('mensagensOverlayComponent') mensagensOverlayComponent: MensagensOverlayComponent | undefined;
  @ViewChild('appchatdisplay') appchatdisplay: ChatDisplayComponent | undefined;

  public configuracoes: Partial<Configuracoes> = {
    configuracoes: {
      temperatura: 0.7
    }
  };
  private readonly defaultId = 1;
  protected selectedModel: string = '';
  protected userPrompt: string = '';
  protected modelos: ModelResponse[] | undefined;
  protected isServerOnline = signal(false);


  constructor(private configuracoesService: ConfiguracoesService, private ollamaChatService: OllamaChatService) {
    this.configuracoesService.getConfiguracao(this.defaultId).subscribe({
      next: (res) => this.configuracoes = res,
      error: (err) => console.error(err),
      complete: () => { }
    });
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
    this.userPrompt = 'Crie uma classe em Java para tratar caracteres da String valorTeste que não estejam no range entre A e Z, use regex';
  }

  //#region btns
  btnSalvarConfiguracoes() {
    if (!this.configuracoes || !this.configuracoes.ollama_api) { return; }
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

  btnEnviarMensagem() {
    const test = false;

    if (!test) {
      if (!this.userPrompt || this.userPrompt.trim().length <= 0) { this.mensagemComponente?.show('Informe a mensagem', TipoMensagem.ALERTA, 700); this.scrollMsgAppMensagem(); return; }
      if (!this.selectedModel || this.selectedModel.trim().length <= 0) { this.mensagemComponente?.show('Selecione o modelo', TipoMensagem.ALERTA, 700); this.scrollMsgAppMensagem(); return; }

      let temperatura = this.configuracoes.configuracoes!.temperatura;
      if (!temperatura || temperatura < 0) { temperatura = 0.7; this.configuracoes.configuracoes!.temperatura = temperatura; }

      this.toggleForm(true);
      this.updateChatTxt(this.userPrompt);
      this.loadingChat();

      let index = -1;

      this.ollamaChatService.chatOllama(
        this.userPrompt, this.selectedModel, temperatura, this.appchatdisplay?.getHistorico() ?? []
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
    } else {
      this.loadingChat();
      setTimeout(() => {
        this.testeResposta();
        this.loadingChat(false);
      }, 1200);
    }

  }
  //#endregion

  private updateChatTxt(response: string, is_ollama: boolean = false): number {
    let add: Partial<ChatResponse> = {
      done: true,
      message: {
        role: is_ollama ? 'assistant' : 'user',
        content: response
      }
    };
    return this.updateChat(add);
  }

  private updateChat(response: Partial<ChatResponse>): number {
    let index = this.appchatdisplay?.adicionarMensagemCH(response);
    if (response.message?.role === 'user') {
      let txtUserPrompt = document.getElementById('txtUserPrompt') as HTMLInputElement;
      !!txtUserPrompt && txtUserPrompt.focus();
    } else {
      this.userPrompt = '';
    }
    return index ?? -1;
  }

  public updateChatMessage(index: number, response: ChatResponse): void {
    this.appchatdisplay?.updateMessage(index, response);
  }

  private testeResposta() {
    this.updateChatTxt('Testando');

    const resposta = `
    <p>Aqui está um exemplo simples em Java para criar uma classe que remove todos os caracteres que não são 'A' ou 'B':</p>
    <pre><code class="java language-java">public class RemoveNonAB {
        // Método para remover caracteres não desejados e retornar String com apenas 'A's ou 'B's
        public static String cleanString(String input) {
            if (input == null || input.isEmpty()) {
                return "";
            } else {
                StringBuilder output = new StringBuilder();
                for (char c : input.toCharArray()) {
                    // Verifica se o caractere é 'A' ou 'B', e adiciona ao novo StringBuilder
                    if (c == 'A' || c == 'B') {
                        output.append(c);
                    }
                }
                return output.toString();
            }
        }

        // Método principal para testar a classe RemoveNonAB
        public static void main(String[] args) {
            String input = "AABBCCDDBBAA";
            System.out.println("Original string: " + input);

            // Chama o método cleanString e exibe resultado
            String cleanedString = cleanString(input);
            System.out.println("Cleaned string: " + cleanedString);
        }
    }
    </code>
    </pre>
    <pre><code class="css language-css">body {
        font-family: Arial, sans-serif;
        background-color: #f0f0f0;
    }

    h1 {
        color: #333;
    }

    p {
        line-height: 1.6;
    }
    </code></pre>
    <p>Neste código, a classe <code>RemoveNonAB</code> possui um único método estático chamado <code>cleanString</code>. O método recebe uma String como entrada e retorna uma nova String que contém apenas caracteres 'A' ou 'B'. Ele itera sobre cada caractere na string original, verificando se ele é válido (ou seja, um 'A' ou um 'B'). Se o caractere for válido, ele será adicionado ao <code>StringBuilder</code> que armazena a saída.</p>
    <p>O método principal chama este método e exibe tanto a string original quanto a string limpa resultante.</p>
    `;

    this.updateChatTxt(resposta, true);
  }

  private toggleForm(desabilitar: boolean = true) {
    let txtUserPrompt = document.getElementById('txtUserPrompt') as HTMLInputElement;
    let selModelos = document.getElementById('selModelos') as HTMLSelectElement;
    let btnLimpar = document.getElementById('btnLimpar') as HTMLButtonElement;
    let btnEnviar = document.getElementById('btnEnviar') as HTMLButtonElement;
    let temperature = document.getElementById('temperature') as HTMLInputElement;

    if (!!txtUserPrompt) {
      txtUserPrompt.focus();
      txtUserPrompt.disabled = desabilitar;
    }
    if (!!selModelos) { selModelos.disabled = desabilitar; }
    if (!!btnLimpar) { btnLimpar.disabled = desabilitar; }
    if (!!btnEnviar) { btnEnviar.disabled = desabilitar; }
    if (!!temperature) { temperature.disabled = desabilitar; }

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
    btnEnviar.innerHTML = isLoading ? '<img src="/imagens/loading/infinity2.svg" alt="" width="100">' : 'Enviar';
  }

}