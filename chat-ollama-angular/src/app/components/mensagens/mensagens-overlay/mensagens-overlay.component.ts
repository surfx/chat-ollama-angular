import { Component, ViewChild } from '@angular/core';
import { TipoMensagem } from '../../../model/modelos';
import { MensagensComponent } from '../mensagens/mensagens.component';

@Component({
  selector: 'app-mensagens-overlay',
  imports: [MensagensComponent],
  templateUrl: './mensagens-overlay.component.html',
  styleUrl: './mensagens-overlay.component.scss'
})
export class MensagensOverlayComponent {

  @ViewChild('mensagemComponente') mensagemComponente: MensagensComponent | undefined;
  protected cssDisplay: string = '';

  public show(mensagem: string, tipo: TipoMensagem = TipoMensagem.INFO, timeout: number | undefined = 1500) {
    this.cssDisplay = 'show';
    this.mensagemComponente?.show(mensagem, tipo, timeout);
    if (!!timeout && timeout > 0) setTimeout(() => { this.hide(); }, !timeout || timeout <= 0 ? 1500 : timeout);
  }

  public hide() {
    this.cssDisplay = '';
    this.mensagemComponente?.hide();
  }

}