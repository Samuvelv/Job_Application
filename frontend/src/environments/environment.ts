// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
  
  // Application Configuration
  appConfig: {
    whatsappPhone: '919360454326',
    companyName: 'NTL Career Nexus',
  },
  
  // Real-time Translation API Configuration
  translation: {
    // API key should be set via environment variable or config service
    apiKey: '',
    apiEndpoint: 'https://api.openai.com/v1/messages',
    model: 'gpt-4-mini',
    timeoutMs: 10000,
    cacheTtlMs: 3600000, // 1 hour
  }
};
