import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-modal-rag',
  imports: [],
  templateUrl: './modal-rag.component.html',
  styleUrl: './modal-rag.component.scss'
})
export class ModalRagComponent {

  protected visivel = signal<boolean>(false);

  public show(): void {
    this.visivel.set(true);
  }

  public hide(): void {
    this.visivel.set(false);
  }

  protected salvar(): void {
    this.visivel.set(false);
  }

}

// Referência html e css: https://uiverse.io/vinodjangid07/silent-wasp-13