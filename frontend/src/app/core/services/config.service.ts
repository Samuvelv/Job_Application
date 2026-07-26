// src/app/core/services/config.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: Record<string, any> = {};

  constructor(private http: HttpClient) {}

  /**
   * Load configuration from API or config file
   */
  async loadConfig(): Promise<void> {
    try {
      // Try to load from config endpoint
      const config = await firstValueFrom(
        this.http.get<Record<string, any>>('/api/config')
      );
      this.config = config;
      console.log('✅ Config loaded from API');
    } catch (error) {
      console.warn('⚠️  Could not load config from API, using defaults');
      // Use defaults if API fails
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Get config value
   */
  get(key: string, defaultValue?: any): any {
    return this.config[key] ?? defaultValue;
  }

  /**
   * Get API key
   */
  getApiKey(): string {
    return this.config['OPENAI_API_KEY'] || '';
  }

  /**
   * Set API key (for testing or dynamic configuration)
   */
  setApiKey(apiKey: string): void {
    this.config['OPENAI_API_KEY'] = apiKey;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): Record<string, any> {
    return {
      OPENAI_API_KEY: localStorage.getItem('openai_api_key') || '',
    };
  }
}
