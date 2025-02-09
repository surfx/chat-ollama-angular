import { Component, Input, input } from '@angular/core';
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

    constructor() {

    }

    public adicionarMensagem(mensagem: ChatItemMessage) {
        this.mensagens.push(mensagem);
    }

    public limparMensagens() {
        this.mensagens = [];
    }

}