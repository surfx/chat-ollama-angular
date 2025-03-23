import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

@Component({
  selector: 'app-tag-selection',
  imports: [],
  templateUrl: './tag-selection.component.html',
  styleUrl: './tag-selection.component.scss'
})
export class TagSelectionComponent {

  protected valor_selecionado = signal('');

  @Input() valoresSelecionados: string[] = [];
  @Input() set valorSelecionado(value: string) {
    this.valor_selecionado.set(value);
  }
  get valorSelecionado() {
    return this.valor_selecionado();
  }

  @Output() valorSelecionadoChange = new EventEmitter<string>();

  public clear() {
    this.valor_selecionado.set('');
    this.valorSelecionadoChange.emit('');
  }

  protected selectValor(value: string) {
    this.valor_selecionado.set(value);
    this.valorSelecionadoChange.emit(value);
  }

}