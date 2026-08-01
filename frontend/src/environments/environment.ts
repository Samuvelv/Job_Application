// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
  
  // Application Configuration
  appConfig: {
    whatsappPhone: '919360454326',
    companyName: 'NTL Career Nexus',
  },
  
  // Dynamic (candidate-data) translation request settings — actual translation
  // happens server-side via the backend /translate endpoint, not from the browser.
  // timeoutMs must comfortably cover GPT generation time for a full profile-sized
  // batch (bio + experience descriptions, etc.), which can run well past 10s
  // depending on payload size and network path to OpenAI — a too-tight timeout
  // fails identically on every retry since the timeout itself is the bottleneck.
  translation: {
    timeoutMs: 60000,
    cacheTtlMs: 3600000, // 1 hour
  }
};
