import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import ptBr from '@angular/common/locales/pt';

registerLocaleData(ptBr);

bootstrapApplication(AppComponent, {
    providers: [
      ... appConfig.providers,
      { provide: LOCALE_ID, useValue: 'pt-BR' }
    ]
})
.catch(err => console.error(err));