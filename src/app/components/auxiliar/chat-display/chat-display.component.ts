import { Component, Input, signal } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { ChatResponse, GenerateResponse, Message } from 'ollama';
import { UnifiedChatResponse } from '../../../model/modelos';

@Component({
    selector: 'app-chat-display',
    imports: [MarkdownModule],
    templateUrl: './chat-display.component.html',
    styleUrl: './chat-display.component.scss'
})
export class ChatDisplayComponent {

    @Input() mensagens: UnifiedChatResponse[] = [];

    protected readonly is_loading = signal(false);
    protected readonly loading_message = signal('');
    private readonly loadingImg = '<img src="/imagens/loading/ellipsis.svg" alt="" width="20" />';


    constructor() {

    }

    public getMensagens(): UnifiedChatResponse[] { return this.mensagens; }

    public adicionarMensagemGR(chatitem: Partial<GenerateResponse>): number {
        return this.adicionarMensagem(this.toUnifiedChatResponseFromGenerateResponse(chatitem));
    }

    public adicionarMensagemCH(chatitem: Partial<ChatResponse>): number {
        return this.adicionarMensagem(this.toUnifiedChatResponseFromChat(chatitem));
    }

    public adicionarMensagem(chatitem: Partial<UnifiedChatResponse>): number {
        if (!chatitem || !chatitem.message || !chatitem.message?.content) { return -1; }
        this.mensagens.push(chatitem as UnifiedChatResponse);
        this.scrollToLastMessage();
        return this.mensagens.length - 1;
    }

    public updateMessage(index: number, mensagem: Partial<UnifiedChatResponse>): void {
        if (!mensagem || !mensagem.message || !mensagem.message?.content) { return; }
        if (index < 0 || index >= this.mensagens.length) { return; }
        let conteudo = this.mensagens[index].message.content || '';
        this.mensagens[index].message.content = `${conteudo}${mensagem.message?.content || ''}`;
        if (!!mensagem.done) this.scrollToLastMessage();
    }

    public limparMensagens() {
        this.mensagens = [];
    }

    public loadingMessage(mensagem: string | undefined = undefined): void {
        this.loading_message.set(`${mensagem || "Analisando sua pergunta..."}${this.loadingImg}`);
        this.is_loading.set(true);
        this.scrollToLastMessage();
    }

    public removeLoadingMessage() {
        this.is_loading.set(false);
    }

    public getHistorico(): Message[] {
        return this.getMensagens().map(m => m.message);
    }

    public scrollToLastMessage() {
        if (!this.mensagens || this.mensagens.length <= 0) return;
        setTimeout(() => {
            window.document.getElementById(`chat-profile-pic-${this.mensagens.length - 1}`)?.scrollIntoView({ behavior: 'smooth' });
        }, 200);
    }


    //#region conversor
    private toUnifiedChatResponseFromGenerateResponse(generateResponse: Partial<GenerateResponse>): UnifiedChatResponse {
        return {
            model: generateResponse.model || '',
            created_at: generateResponse.created_at || new Date(),
            message: {
                role: 'assistant',
                content: generateResponse.response || '',
            },
            done: generateResponse.done || false,
            done_reason: generateResponse.done_reason || '',
            total_duration: generateResponse.total_duration || 0,
            load_duration: generateResponse.load_duration || 0,
            prompt_eval_count: generateResponse.prompt_eval_count || 0,
            prompt_eval_duration: generateResponse.prompt_eval_duration || 0,
            eval_count: generateResponse.eval_count || 0,
            eval_duration: generateResponse.eval_duration || 0
        };
    }

    private toUnifiedChatResponseFromChat(chatResponse: Partial<ChatResponse>): UnifiedChatResponse {
        return {
            model: chatResponse.model || '',
            created_at: chatResponse.created_at || new Date(),
            message: chatResponse.message || { role: 'assistant', content: '' },
            done: chatResponse.done || false,
            done_reason: chatResponse.done_reason || '',
            total_duration: chatResponse.total_duration || 0,
            load_duration: chatResponse.load_duration || 0,
            prompt_eval_count: chatResponse.prompt_eval_count || 0,
            prompt_eval_duration: chatResponse.prompt_eval_duration || 0,
            eval_count: chatResponse.eval_count || 0,
            eval_duration: chatResponse.eval_duration || 0
        };
    }
    //#endregion

    // private randomString(length: number): string {
    //     const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    //     let result = '';

    //     // Gera o primeiro caractere, que deve ser uma letra
    //     result += chars.charAt(Math.floor(Math.random() * 26));

    //     // Gera o restante da string
    //     for (let i = 1; i < length; i++) {
    //         result += chars.charAt(Math.floor(Math.random() * chars.length));
    //     }

    //     return result.toLowerCase();
    // }

}