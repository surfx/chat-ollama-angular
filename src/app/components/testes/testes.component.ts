import { Component, ViewChild } from '@angular/core';
import { delay } from 'rxjs';
import { OllamaChatService } from '../../services/ollama-chat.service';
import { ChatDisplayComponent } from '../auxiliar/chat-display/chat-display.component';
import { GenerateRequest } from 'ollama';


@Component({
    selector: 'app-testes',
    imports: [ChatDisplayComponent],
    templateUrl: './testes.component.html',
    styleUrl: './testes.component.scss'
})
export class TestesComponent {

    @ViewChild('appchatdisplay') appchatdisplay: ChatDisplayComponent | undefined;

    constructor(private ollamaChatService: OllamaChatService) {

    }

    btnTeste1() {
        let prompt = `
        Crie uma classe Java para o jogo tic tac toe
        `;

        prompt = 'quanto é 1 + 1 ?';

        this.appchatdisplay?.loadingMessage();

        let index: number | undefined = -1;

        this.ollamaChatService.consultaOllama('chat', prompt, 'deepseek-v2:16b', 0.7, [], [])
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
    images: string[] = [];

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
            model: 'deepseek-r1:7b',
            prompt: 'Sabe me dizer qual é o nome da atriz da imagem ?',
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