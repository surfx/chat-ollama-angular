import { Component, signal, ViewChild } from '@angular/core';
import { GenerateRequest } from 'ollama';
import { delay } from 'rxjs';
import { OllamaChatService } from '../../services/ollama-chat.service';
import { ChatDisplayComponent } from '../auxiliar/chat-display/chat-display.component';
import { ProgressBarComponent, TipoProgressBar } from '../auxiliar/progress-bar/progress-bar.component';
import { TagSelectionComponent } from '../auxiliar/tag-selection/tag-selection.component';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpEventType } from '@angular/common/http';


@Component({
    selector: 'app-testes',
    imports: [
        ChatDisplayComponent, TagSelectionComponent, ProgressBarComponent,
        CommonModule
    ],
    templateUrl: './testes.component.html',
    styleUrl: './testes.component.scss'
})
export class TestesComponent {

    files: File[] = [];
    isDragging = false;
    uploadProgress = 0;

    constructor(private ollamaChatService: OllamaChatService, private http: HttpClient) {

    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = true;
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
        const droppedFiles = event.dataTransfer?.files;
        if (droppedFiles) {
            this.addFiles(Array.from(droppedFiles));
        }
    }

    onFileSelect(event: any): void {
        const selectedFiles = event.target.files;
        if (selectedFiles) {
            this.addFiles(Array.from(selectedFiles));
            // Limpar o valor do input para permitir selecionar o mesmo arquivo novamente
            event.target.value = '';
        }
    }

    addFiles(newFiles: File[]): void {
        this.files = this.files.concat(newFiles);
    }

    onUpload(): void {
        if (this.files.length > 0) {
          const formData = new FormData();
          for (const file of this.files) {
            formData.append('files', file); // 'files' deve corresponder à chave esperada no Flask (request.files.getlist('files'))
          }
    
          this.uploadProgress = 0;
    
          this.http.post<any>('http://127.0.0.1:5000/upload', formData, {
            reportProgress: true,
            observe: 'events'
          })
          .subscribe({
            next: (event) => {
                if (event.type === HttpEventType.UploadProgress) {
                    if (event.total) {
                      this.uploadProgress = Math.round((100 * event.loaded) / event.total);
                      console.log(`Progresso do Upload: ${this.uploadProgress}%`);
                    }
                  } else if (event.type === HttpEventType.Response) {
                    console.log('Upload Completo!', event.body);
                    this.files = [];
                    this.uploadProgress = 0;
                  }
              },
              error: (err) => {
                console.error('Erro no Upload:', err);
                this.uploadProgress = 0;
              },
              complete: () => { }
          });
        } else {
          console.log("Nenhum arquivo selecionado para enviar.");
        }
      }

    onClearFiles(): void {
        this.files = [];
    }

    //#region old
    @ViewChild('appchatdisplay') appchatdisplay: ChatDisplayComponent | undefined;
    @ViewChild('tagSelection') tagSelection: TagSelectionComponent | undefined;

    private readonly model = 'llava:7b';

    progressbar = signal(74.5);
    tipoProgressBar = signal(TipoProgressBar.INFO);

    //configuracoes.configuracoes!.modo
    public configuracoes = {
        configuracoes: {
            modo: 'chat'
        }
    };


    protected valoresSelecionados: string[] = ['chat', 'generate'];
    protected valorSelecionado = 'generate';

    

    btnTeste3() {
        console.log('valorSelecionado: ', this.valorSelecionado);
        console.log('this.tagSelection?.valorSelecionado: ', this.tagSelection?.valorSelecionado);
    }
    btnClearTagSelection() {
        this.tagSelection?.clear();
        this.btnTeste3();
    }


    btnTeste1() {
        let prompt = `
        Crie uma classe Java para o jogo tic tac toe
        `;

        prompt = 'quanto é 1 + 1 ?';

        this.appchatdisplay?.loadingMessage();

        let index: number | undefined = -1;

        this.ollamaChatService.consultaOllama('chat', prompt, this.model, 0.7, [], [])
            .pipe(delay(1000))
            .subscribe({
                next: (res) => {
                    if (!index || index < 0) {
                        index = this.appchatdisplay?.adicionarMensagem(res);
                        return;
                    } else {
                        this.appchatdisplay?.updateMessage(index, res);
                    }
                },
                error: (err) => console.error(err),
                complete: () => { this.appchatdisplay?.removeLoadingMessage(); }
            });

    }

    btnTeste2() {

    }

    //--------------------
    // private images: Uint8Array[] = [];

    // onFileSelected(event: any): void {
    //     this.images = [];

    //     const files: FileList = event.target.files;
    //     for (let i = 0; i < files.length; i++) {
    //         const file = files[i];
    //         const reader = new FileReader();

    //         reader.onload = (e: any) => {
    //             const arrayBuffer = e.target.result;
    //             this.images.push(new Uint8Array(arrayBuffer));
    //         };

    //         reader.readAsArrayBuffer(file);
    //     }
    // }

    private images: string[] = [];

    onFileSelected(event: any): void {
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
    }

    // Converte Uint8Array para Base64 string
    arrayBufferToBase64(buffer: Uint8Array): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    onEnviar(): void {
        const requestData: GenerateRequest = {
            model: this.model,
            prompt: 'Descreva a imagem ?',
            images: this.images ?? []
        };

        this.generateRequest(requestData);
    }

    generateRequest(data: GenerateRequest): void {
        // Lógica para processar a solicitação
        console.log(data);

        this.appchatdisplay?.loadingMessage();

        let index: number | undefined = -1;

        this.ollamaChatService.consultaOllama('generate', data.prompt, data.model, 0.7, [], data.images)
            .pipe(delay(1000))
            .subscribe({
                next: (res) => {
                    if (!index || index < 0) {
                        index = this.appchatdisplay?.adicionarMensagem(res);
                        return;
                    } else {
                        this.appchatdisplay?.updateMessage(index, res);
                    }
                },
                error: (err) => console.error(err),
                complete: () => { this.appchatdisplay?.removeLoadingMessage(); }
            });

    }
    //#endregion

}