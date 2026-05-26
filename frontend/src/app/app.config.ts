// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

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
  ],
};
