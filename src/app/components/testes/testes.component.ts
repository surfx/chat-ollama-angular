import { AfterViewInit, Component, Input, signal, ViewChild } from '@angular/core';
import { GenerateRequest } from 'ollama';
import { delay } from 'rxjs';
import { OllamaChatService } from '../../services/ollama-chat.service';
import { ChatDisplayComponent } from '../auxiliar/chat-display/chat-display.component';
import { TagSelectionComponent } from '../auxiliar/tag-selection/tag-selection.component';


@Component({
    selector: 'app-testes',
    imports: [ChatDisplayComponent, TagSelectionComponent],
    templateUrl: './testes.component.html',
    styleUrl: './testes.component.scss'
})
export class TestesComponent {

    @ViewChild('appchatdisplay') appchatdisplay: ChatDisplayComponent | undefined;
    @ViewChild('tagSelection') tagSelection: TagSelectionComponent | undefined;


    private readonly model = 'llava:7b';

    //configuracoes.configuracoes!.modo
    public configuracoes = {
        configuracoes: {
            modo: 'chat'
        }
    };


    protected valoresSelecionados: string[] = ['chat', 'generate'];
    protected valorSelecionado = 'generate';

    constructor(private ollamaChatService: OllamaChatService) {

    }

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

}