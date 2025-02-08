import { Component, signal } from '@angular/core';
import { TipoMensagem } from '../../../model/modelos';

@Component({
  selector: 'app-mensagens',
  imports: [],
  templateUrl: './mensagens.component.html',
  styleUrl: './mensagens.component.scss'
})
export class MensagensComponent {

  protected mensagem = signal<string>('');
  protected visivel = signal<boolean>(false);
  protected tipoMensagem: string = 'info';
  protected icon: string = 'fas fa-info-circle';

  public show(mensagem: string, tipo: TipoMensagem = TipoMensagem.INFO, timeout: number | undefined = 1500) {
    this.visivel.set(true);
    this.setMessage(mensagem);
    this.updateTipoMensagem(tipo);
    this.updateIcon(tipo);
    if (!!timeout && timeout > 0) setTimeout(() => { this.hide(); }, !timeout || timeout <= 0 ? 1500 : timeout);
  }

  public hide() {
    this.setMessage('');
    this.visivel.set(false);
  }

  //#region privado
  private updateTipoMensagem(tipo: TipoMensagem): void {
    switch (tipo) {
      case TipoMensagem.ALERTA: this.tipoMensagem = 'alerta'; break;
      case TipoMensagem.ERRO: this.tipoMensagem = 'erro'; break;
      case TipoMensagem.NEUTRO: this.tipoMensagem = 'neutro'; break;
      case TipoMensagem.SUCESSO: this.tipoMensagem = 'sucesso'; break;
      case TipoMensagem.INFO:
      default: this.tipoMensagem = 'info'; break;
    }
  }
  private updateIcon(tipo: TipoMensagem): void {
    switch (tipo) {
      case TipoMensagem.ALERTA: this.icon = 'fas fa-exclamation-triangle'; break;
      case TipoMensagem.ERRO: this.icon = 'fas fa-times-circle'; break;
      case TipoMensagem.NEUTRO: this.icon = 'fas fa-minus-circle'; break;
      case TipoMensagem.SUCESSO: this.icon = 'fas fa-check-circle'; break;
      case TipoMensagem.INFO:
      default: this.icon = 'fas fa-info-circle'; break;
    }
  }

  private setMessage(mensagem: string) { this.mensagem.set(mensagem); }
  //#endregion

}