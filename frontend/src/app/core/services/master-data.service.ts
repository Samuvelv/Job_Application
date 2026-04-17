// src/app/core/services/master-data.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface MasterCountry {
  id: number;
  name: string;
  iso2: string;
  dial_code: string;
  flag_emoji: string;
}
export interface MasterCity         { id: number; name: string; }
export interface MasterJobTitle     { id: number; title: string; occupation_id: number; occupation_name: string; }
export interface MasterOccupation   { id: number; name: string; }
export interface MasterIndustry     { id: number; name: string; }
export interface MasterLanguage     { id: number; name: string; }
export interface MasterDegree       { id: number; name: string; }
export interface MasterFieldOfStudy { id: number; name: string; }
export interface MasterCurrency     { id: number; code: string; name: string; symbol: string; }
export interface MasterNoticePeriod { id: number; label: string; days: number; }

@Injectable({ providedIn: 'root' })
export class MasterDataService {
  private readonly base = `${environment.apiUrl}/master`;

  // ── Signals ─────────────────────────────────────────────────────────────────
  countries      = signal<MasterCountry[]>([]);
  jobTitles      = signal<MasterJobTitle[]>([]);
  occupations    = signal<MasterOccupation[]>([]);
  industries     = signal<MasterIndustry[]>([]);
  languages      = signal<MasterLanguage[]>([]);
  degrees        = signal<MasterDegree[]>([]);
  fieldsOfStudy  = signal<MasterFieldOfStudy[]>([]);
  currencies     = signal<MasterCurrency[]>([]);
  noticePeriods  = signal<MasterNoticePeriod[]>([]);

  // Cities are loaded on-demand per selected country
  private cityCache = new Map<number, MasterCity[]>();
  cities = signal<MasterCity[]>([]);

  private loaded = false;

  constructor(private http: HttpClient) {}

  /** Call once on app init (or lazily on first form load) */
  async loadAll(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;

    const [countries, jobTitles, occupations, industries, languages, degrees, fieldsOfStudy, currencies, noticePeriods] =
      await Promise.all([
        firstValueFrom(this.http.get<MasterCountry[]>(`${this.base}/countries`)),
        firstValueFrom(this.http.get<MasterJobTitle[]>(`${this.base}/job-titles`)),
        firstValueFrom(this.http.get<MasterOccupation[]>(`${this.base}/occupations`)),
        firstValueFrom(this.http.get<MasterIndustry[]>(`${this.base}/industries`)),
        firstValueFrom(this.http.get<MasterLanguage[]>(`${this.base}/languages`)),
        firstValueFrom(this.http.get<MasterDegree[]>(`${this.base}/degrees`)),
        firstValueFrom(this.http.get<MasterFieldOfStudy[]>(`${this.base}/fields-of-study`)),
        firstValueFrom(this.http.get<MasterCurrency[]>(`${this.base}/currencies`)),
        firstValueFrom(this.http.get<MasterNoticePeriod[]>(`${this.base}/notice-periods`)),
      ]);

    this.countries.set(countries);
    this.jobTitles.set(jobTitles);
    this.occupations.set(occupations);
    this.industries.set(industries);
    this.languages.set(languages);
    this.degrees.set(degrees);
    this.fieldsOfStudy.set(fieldsOfStudy);
    this.currencies.set(currencies);
    this.noticePeriods.set(noticePeriods);
  }

  /** Load cities for a given country_id (cached) */
  async loadCities(countryId: number): Promise<void> {
    if (!countryId) { this.cities.set([]); return; }
    if (this.cityCache.has(countryId)) {
      this.cities.set(this.cityCache.get(countryId)!);
      return;
    }
    const rows = await firstValueFrom(
      this.http.get<MasterCity[]>(`${this.base}/cities?country_id=${countryId}`)
    );
    this.cityCache.set(countryId, rows);
    this.cities.set(rows);
  }

  /** Utility: get occupation name for a job title id */
  getOccupationForJobTitle(jobTitleId: number | null): string {
    if (!jobTitleId) return '';
    const jt = this.jobTitles().find((j) => j.id === jobTitleId);
    return jt?.occupation_name ?? '';
  }

  /** Utility: get occupation_id for a job title id */
  getOccupationIdForJobTitle(jobTitleId: number | null): number | null {
    if (!jobTitleId) return null;
    const jt = this.jobTitles().find((j) => j.id === jobTitleId);
    return jt?.occupation_id ?? null;
  }
}
