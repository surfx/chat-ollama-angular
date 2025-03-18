import { Component, Input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

export enum TipoProgressBar {
  INFO = 'info',
  SUCESSO = 'success',
  ALERTA = 'warning',
  ERRO = 'danger'
}

@Component({
  selector: 'app-progress-bar',
  imports: [DecimalPipe],
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss'
})
export class ProgressBarComponent {


  @Input() tipoProgressBar = signal(TipoProgressBar.INFO);
  @Input() progresso = signal(0.0);
  @Input() visivel = signal(true);

}