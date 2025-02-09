import { Routes } from '@angular/router';
import { ChatOllamaOldComponent } from './components/chat-ollama-old/chat-ollama.component-old';
import { ChatOllamaPageComponent } from './components/chat-ollama-page/chat-ollama-page.component';
import { TestesComponent } from './components/testes/testes.component';

export const routes: Routes = [
  {
    path: '',
    component: ChatOllamaPageComponent
  },
  {
    path: 'testes',
    component: TestesComponent
  },
  {
    path: 'old',
    component: ChatOllamaOldComponent
  }
];