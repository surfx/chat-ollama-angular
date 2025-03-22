import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Configuracoes, TipoMensagem } from '../../../../model/modelos';
import { ConfiguracoesService } from '../../../../services/configuracoes.service';
import { MensagensComponent } from '../../../mensagens/mensagens/mensagens.component';

@Component({
  selector: 'app-modal-configuracao',
  imports: [
      CommonModule,
      FormsModule,
      MensagensComponent
    ],
  templateUrl: './modal-configuracao.component.html',
  styleUrl: './modal-configuracao.component.scss'
})
export class ModalConfiguracaoComponent {
  protected visivel = signal<boolean>(false);

  @Input() configuracoes: Partial<Configuracoes> | undefined;
  @Output() configuracoesSalvas = new EventEmitter<void>();

  @ViewChild('mensagemComponente') mensagemComponente: MensagensComponent | undefined;

  constructor(private configuracoesService: ConfiguracoesService) { }

  ngOnDestroy(): void {

  }

  public show(): void {
    this.visivel.set(true);

    setTimeout(() => {
      let txtUrlServico = document.getElementById('txtUrlServico') as HTMLInputElement;
      if (txtUrlServico) txtUrlServico.focus();
    }, 100);
  }

  public clickHide(event?: MouseEvent): void {
    if (event) this.hide();
  }

  public hide(): void {
    this.visivel.set(false);
  }

  protected salvar(): void {
    if (this.configuracoes) {
      this.configuracoesService.updateConfiguracao(1, this.configuracoes).subscribe({
        next: (res) => {
          this.configuracoesSalvas.emit();
          this.mensagemComponente?.show('Configurações Salvas', TipoMensagem.SUCESSO, 700);
          setTimeout(() => { this.hide(); }, 300);
        },
        error: (err) => this.mensagemComponente?.show('Erro ao salvar as configurações', TipoMensagem.ERRO, 1000),
        complete: () => { }
      });
    }
  }

}

// Referência html e css: https://uiverse.io/vinodjangid07/silent-wasp-13