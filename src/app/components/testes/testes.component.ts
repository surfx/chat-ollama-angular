import { Component, ViewChild } from '@angular/core';
import { ChatDisplayComponent } from '../auxiliar/chat-display/chat-display.component';

@Component({
    selector: 'app-testes',
    imports: [ChatDisplayComponent],
    templateUrl: './testes.component.html',
    styleUrl: './testes.component.scss'
})
export class TestesComponent {

    @ViewChild('appchatdisplay') appchatdisplay: ChatDisplayComponent | undefined;

    constructor() {

    }

    btnTeste() {
        if (!this.appchatdisplay) { return; }
        this.appchatdisplay.adicionarMensagem({
            is_ollama: true,
            mensagem: 'Olá, sou o ChatGPT. Como posso ajudar?'
        });

        this.appchatdisplay.adicionarMensagem({
            is_ollama: false,
            mensagem: 'Me dê a resposta do exemplo abaixo'
        });

        this.appchatdisplay.adicionarMensagem({
            is_ollama: true,
            mensagem: `
                \`\`\`css
                body {
                    color: red;
                }
                \`\`\`
            `
        });
    }

}