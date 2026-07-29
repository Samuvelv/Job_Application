// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: '/api/v1',
  
  // Application Configuration
  appConfig: {
    whatsappPhone: '919360454326',
    companyName: 'NTL Career Nexus',
  },
  
  // Dynamic (candidate-data) translation request settings — actual translation
  // happens server-side via the backend /translate endpoint, not from the browser.
  translation: {
    timeoutMs: 10000,
    cacheTtlMs: 3600000, // 1 hour
  }
};
