import { Component, Input } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { ChatItemMessage } from '../../../model/modelos';

@Component({
    selector: 'app-chat-display',
    imports: [MarkdownModule],
    templateUrl: './chat-display.component.html',
    styleUrl: './chat-display.component.scss'
})
export class ChatDisplayComponent {

    @Input() mensagens: ChatItemMessage[] = [];

    private readonly loadingImg = '<img src="/imagens/loading/ellipsis.svg" alt="" width="20" />';

    constructor() {

    }

    public adicionarMensagem(mensagem: Partial<ChatItemMessage>) {
        let add: ChatItemMessage = {
            is_ollama: mensagem.is_ollama || false,
            mensagem: mensagem.mensagem || ''
        };
        this.mensagens.push(add);
        this.scrollToLastMessage();
    }

    public limparMensagens() {
        this.mensagens = [];
    }

    public loadingMessage(mensagem: string | undefined = undefined): void {
        this.mensagens.push({
            is_loading: true,
            is_ollama: true,
            mensagem: mensagem || `Analisando sua pergunta...${this.loadingImg}`
        });
        this.scrollToLastMessage();
    }

    public removeLoadingMessage() {
        this.mensagens = this.mensagens.filter(m => !m.is_loading);
    }

    private scrollToLastMessage() {
        if (!this.mensagens || this.mensagens.length <= 0) return;
        setTimeout(() => {
            window.document.getElementById(`chat-profile-pic-${this.mensagens.length-1}`)?.scrollIntoView({ behavior: 'smooth' });
        }, 200);
    }  

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