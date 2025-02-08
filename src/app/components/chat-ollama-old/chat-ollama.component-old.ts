import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModelResponse } from 'ollama';
import { delay } from 'rxjs';
import { OllamaChatService } from '../../services/ollama-chat.service';

@Component({
  selector: 'app-chat-ollama-old',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-ollama.component-old.html',
  styleUrl: './chat-ollama.component-old.scss'
})
export class ChatOllamaOldComponent implements OnInit {

  private _ollamaChatService = inject(OllamaChatService);
  protected temperature = signal(0.7);
  protected modelos = signal<ModelResponse[]>([]);
  protected totalModelos = computed(() => this.modelos().length);
  public selectedModel: ModelResponse | string | null = null;

  public userPrompt: string = 'Crie um código http client rest em python';

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

    this._ollamaChatService.chatOllama(this.userPrompt, (this.selectedModel as ModelResponse).name, this.temperature()).subscribe(response => {
      document.getElementById('response')!.innerHTML = response;
    });

  }

}