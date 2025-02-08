import { Routes } from '@angular/router';
import { ChatOllamaOldComponent } from './components/chat-ollama-old/chat-ollama.component-old';
import { ChatOllamaPageComponent } from './components/chat-ollama-page/chat-ollama-page.component';

export const routes: Routes = [
  {
    path: '',
    component: ChatOllamaPageComponent
  },
  {
    path: 'old',
    component: ChatOllamaOldComponent
  }
];