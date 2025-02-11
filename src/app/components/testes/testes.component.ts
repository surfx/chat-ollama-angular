import { Component, ViewChild } from '@angular/core';
import { ChatResponse, GenerateResponse } from 'ollama';
import { delay } from 'rxjs';
import { UnifiedChatResponse } from '../../model/modelos';
import { OllamaChatService } from '../../services/ollama-chat.service';
import { ChatDisplayComponent } from '../auxiliar/chat-display/chat-display.component';


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

    createUnifiedResponseFromGenerateResponse(generateResponse: GenerateResponse): UnifiedChatResponse {
        return {
            model: generateResponse.model,
            created_at: generateResponse.created_at,
            message: {
                role: 'assistant',
                content: generateResponse.response,
            },
            done: generateResponse.done,
            done_reason: generateResponse.done_reason,
            total_duration: generateResponse.total_duration,
            load_duration: generateResponse.load_duration,
            prompt_eval_count: generateResponse.prompt_eval_count,
            prompt_eval_duration: generateResponse.prompt_eval_duration,
            eval_count: generateResponse.eval_count,
            eval_duration: generateResponse.eval_duration,
        };
    }

    createUnifiedResponseFromChat(chatResponse: ChatResponse): UnifiedChatResponse {
        return {
            model: chatResponse.model,
            created_at: chatResponse.created_at,
            message: chatResponse.message,
            done: chatResponse.done,
            done_reason: chatResponse.done_reason,
            total_duration: chatResponse.total_duration,
            load_duration: chatResponse.load_duration,
            prompt_eval_count: chatResponse.prompt_eval_count,
            prompt_eval_duration: chatResponse.prompt_eval_duration,
            eval_count: chatResponse.eval_count,
            eval_duration: chatResponse.eval_duration,
        };
    }


    btnTeste1() {

        let prompt = `
        Crie uma classe Java para o jogo tic tac toe
        `;

        prompt = 'quanto é 1 + 1 ?';

        this.appchatdisplay?.loadingMessage();

        let index: number | undefined = -1;

        this.ollamaChatService.generateOllama(prompt, 'deepseek-v2:16b', 0.7)
            .pipe(delay(1000))
            .subscribe({
                next: (res) => {

                    let aux: UnifiedChatResponse = this.createUnifiedResponseFromGenerateResponse(res);

                    if (!index || index < 0) {
                        index = this.appchatdisplay?.adicionarMensagem(aux);
                        return;
                    } else {
                        this.appchatdisplay?.updateMessage(index, aux);
                    }

                },
                error: (err) => console.error(err),
                complete: () => { this.appchatdisplay?.removeLoadingMessage(); }
            });

    }

    btnTeste2() {

        let prompt = `
        Crie uma classe Java para o jogo tic tac toe
        `;

        prompt = 'quanto é 1 + 1 ?';


        this.appchatdisplay?.loadingMessage();

        let index: number | undefined = -1;

        this.ollamaChatService.chatOllama('quanto é 1 + 1 ?', 'deepseek-v2:16b', 0.7)
            .pipe(delay(1000))
            .subscribe({
                next: (res) => {
                    let aux: UnifiedChatResponse = this.createUnifiedResponseFromChat(res);
                    if (!index || index < 0) {
                        index = this.appchatdisplay?.adicionarMensagem(aux);
                        return;
                    } else {
                        this.appchatdisplay?.updateMessage(index, aux);
                    }
                },
                error: (err) => console.error(err),
                complete: () => {
                    this.appchatdisplay?.removeLoadingMessage();
                }
            });
    }


}