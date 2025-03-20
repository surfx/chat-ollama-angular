import { Routes } from '@angular/router';
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
  }
];