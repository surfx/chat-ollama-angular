import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { OllamaChatService } from '../../services/ollama-chat.service';
import { ModelResponse } from 'ollama';
import { delay } from 'rxjs';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-chat-ollama',
  imports: [CommonModule],
  templateUrl: './chat-ollama.component.html',
  styleUrl: './chat-ollama.component.scss'
})
export class ChatOllamaComponent implements OnInit {

  private _ollamaChatService = inject(OllamaChatService);
  protected temperature = signal(0.7);
  protected modelos = signal<ModelResponse[]>([]);
  protected totalModelos = computed(() => this.modelos().length);
  public selectedModel: ModelResponse | string | null = null;

  ngOnInit(): void {
    this._ollamaChatService.listaModelos().pipe(delay(500)).subscribe(response => {
      this.modelos.set(response);
      if (response && response.length > 0) { this.selectedModel = response[0]; }
    });
  }

  protected onTempChanged(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.temperature.set(value);
  }


  protected onModelSelected(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedModelId = selectElement.value;

    if (selectedModelId === "loading") {
      this.selectedModel = "loading";
    } else {
      this.selectedModel = this.modelos().find(modelo => String(modelo.name) === selectedModelId) ?? null;
    }
  }

  protected generateResponse(): void {
    // this._ollamaChatService.teste().then(() => {
    //   console.log('teste ollama');
    // });

    console.log('selectedModel: ', this.selectedModel);
  }

}