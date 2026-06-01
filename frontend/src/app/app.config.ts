// src/app/app.config.ts
import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { importProvidersFrom } from '@angular/core';

import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { LanguageService } from './core/services/language.service';

export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export function initLanguage(langSvc: LanguageService): () => Promise<void> {
  return () => langSvc.init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      // withFetch() intentionally removed.
      //
      // The Fetch API buffers the entire request body in memory before initiating
      // the TCP connection. For large video uploads (up to 200 MB) this causes
      // severe memory pressure and can crash the browser tab before a single byte
      // is sent. It also silently ignores Angular's reportProgress option, making
      // upload progress tracking impossible.
      //
      // XHR (the default) streams the file directly from disk, supports
      // reportProgress for progress bars, and handles large payloads correctly.
      withInterceptors([jwtInterceptor, errorInterceptor]),
    ),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'en',
        loader: {
          provide:    TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps:       [HttpClient],
        },
      }),
    ),
    {
      provide:    APP_INITIALIZER,
      useFactory: initLanguage,
      deps:       [LanguageService],
      multi:      true,
    },
  ],
};
