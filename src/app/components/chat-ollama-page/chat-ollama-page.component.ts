import { CommonModule } from '@angular/common';
import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModelResponse } from 'ollama';
import { delay } from 'rxjs';
import { Configuracoes, TipoMensagem } from '../../model/modelos';
import { ConfiguracoesService } from '../../services/configuracoes.service';
import { OllamaChatService } from '../../services/ollama-chat.service';
import { MensagensOverlayComponent } from '../mensagens/mensagens-overlay/mensagens-overlay.component';
import { MensagensComponent } from '../mensagens/mensagens/mensagens.component';

@Component({
  selector: 'app-chat-ollama-page',
  imports: [CommonModule, FormsModule, MensagensComponent, MensagensOverlayComponent],
  templateUrl: './chat-ollama-page.component.html',
  styleUrl: './chat-ollama-page.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ChatOllamaPageComponent {

  @ViewChild('mensagemComponente') mensagemComponente: MensagensComponent | undefined;
  @ViewChild('mensagensOverlayComponent') mensagensOverlayComponent: MensagensOverlayComponent | undefined;

  private readonly loadingImg = '<img src="/imagens/loading.svg" alt="" style="width: 40px;" width="40" />';

  public configuracoes: Partial<Configuracoes> = {
    configuracoes: {
      temperatura: 0.7
    }
  };
  private readonly defaultId = 1;
  protected selectedModel: string = '';
  protected userPrompt: string = '';
  protected modelos: ModelResponse[] | undefined;


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
      },
      error: (err) => console.error(err),
      complete: () => { }
    });

    // Teste
    this.userPrompt = 'Crie uma classe Java que trate uma String de forma a remover todos os caracteres que não sejam A-B';
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
  }

  btnEnviarMensagem() {
    const test = false;

    if (!test) {
      let txtUserPrompt = document.getElementById('txtUserPrompt') as HTMLInputElement;
      let selModelos = document.getElementById('selModelos') as HTMLSelectElement;
      let btnEnviar = document.getElementById('btnEnviar') as HTMLButtonElement;
      let temperature = document.getElementById('temperature') as HTMLInputElement;

      if (!this.userPrompt || this.userPrompt.trim().length <= 0) { this.mensagemComponente?.show('Informe a mensagem', TipoMensagem.ALERTA, 700); return; }
      if (!this.selectedModel || this.selectedModel.trim().length <= 0) { this.mensagemComponente?.show('Selecione o modelo', TipoMensagem.ALERTA, 700); return; }

      let temperatura = this.configuracoes.configuracoes!.temperatura;
      if (!temperatura || temperatura < 0) { temperatura = 0.7; this.configuracoes.configuracoes!.temperatura = temperatura; }

      this.updateResponse('');

      if (!!txtUserPrompt) {
        txtUserPrompt.focus();
        txtUserPrompt.disabled = true;
      }
      if (!!selModelos) { selModelos.disabled = true; }
      if (!!btnEnviar) { btnEnviar.disabled = true; }
      if (!!temperature) { temperature.disabled = true; }

      this.mensagensOverlayComponent?.show(`Aguarde: consultando a api Ollama ${this.loadingImg}`, TipoMensagem.NEUTRO, -1);
      this.ollamaChatService.chatOllama(
        this.userPrompt, this.selectedModel, temperatura).subscribe({
          next: (res) => {
            this.addBtnCopiarCodigo(res);
          },
          error: (err) => {
            this.updateResponse(err);
            this.mensagemComponente?.show('Erro na comunicação com o Ollama', TipoMensagem.ERRO, 700);
          },
          complete: () => {
            this.mensagensOverlayComponent?.hide();
            if (!!txtUserPrompt) {
              txtUserPrompt.disabled = false;
              txtUserPrompt.focus();
              //this.userPrompt = '';
            }
            if (!!selModelos) { selModelos.disabled = false; }
            if (!!btnEnviar) { btnEnviar.disabled = false; }
            if (!!temperature) { temperature.disabled = false; }
          }
        });
    } else {

      this.mensagensOverlayComponent?.show(`Aguarde: consultando a api Ollama ${this.loadingImg}`, TipoMensagem.NEUTRO, -1);
      this.testeResposta();
      this.mensagensOverlayComponent?.hide();
    }

  }
  //#endregion

  private updateResponse(response: string) {
    document.getElementById('response')!.innerHTML = response;
  }


  private testeResposta() {
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

    this.addBtnCopiarCodigo(resposta);
  }

  private addBtnCopiarCodigo(resposta: string): void {
    if (!resposta) return;
    const { mensagem, idCounter } = this.addBtnCopiarCodigoRegex(resposta);
    if (idCounter <= 0) { this.updateResponse(mensagem); return; }
    this.updateResponse(mensagem);
    for (let i = 0; i < idCounter; i++) {
      const button = document.getElementById(`btnCopiar-${i}`) as HTMLButtonElement;
      const contexto = this;
      !!button && button.addEventListener('click', () => this.copyToClipboard(`llama-code-${i}`, contexto));
    }
  }

  private addBtnCopiarCodigoRegex(mensagem: string): { mensagem: string, idCounter: number } {
    let idCounter = 0;
    const preCodeRegex = /<pre><code class="([\w-]+) language-([\w-]+)">/g;
    let match;

    while ((match = preCodeRegex.exec(mensagem)) !== null) {
      const startIndex = match.index;
      const endIndex = mensagem.indexOf('</code>', startIndex);
      if (endIndex !== -1) {
        mensagem = mensagem.slice(0, startIndex) + `<br /><pre><code class="${match[1]} language-${match[2]}" id="llama-code-${idCounter}">    ` + mensagem.slice(startIndex + match[0].length, endIndex) + `</code><button class="copy-button" id="btnCopiar-${idCounter}">Copiar</button></pre><br />` + mensagem.slice(endIndex + 7);
        idCounter++;
      }
    }
    return { mensagem, idCounter };
  }

  public copyToClipboard(codeId: string, contexto: any) {
    const codeElement = document.getElementById(codeId) as HTMLElement;
    const text = codeElement!.textContent;
    if (!text) { return; }
    navigator.clipboard.writeText(text).then(function () {
      contexto.mensagensOverlayComponent?.show('Código copiado', TipoMensagem.SUCESSO, 500);
    }, function (err) {
      contexto.mensagensOverlayComponent?.show('Erro ao copiar código', TipoMensagem.ERRO, 700);
      console.error('Erro ao copiar código: ', err);
    });
  }


}
