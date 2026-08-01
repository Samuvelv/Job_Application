// src/app/core/services/master-data.service.ts
import { Injectable, signal, computed } from '@angular/core';import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { BulkTranslationService } from './bulk-translation.service';

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
export interface MasterHobby        { id: number; name: string; }

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
  hobbies        = signal<MasterHobby[]>([]);

  // Cities are loaded on-demand per selected country
  private cityCache = new Map<number, MasterCity[]>();
  cities = signal<MasterCity[]>([]);

  private loaded = false;

  // ── Catalog-label translation ────────────────────────────────────────────
  // Fixed catalogs (countries, job titles, occupations, industries, degrees,
  // fields of study, notice periods, hobbies, languages — NOT cities, which
  // are proper nouns) are translated whenever the UI language changes.
  // Pre-generated static files (assets/master-data-i18n/{lang}.json) cover
  // almost everything with zero API calls; the live /translate endpoint is
  // only hit for catalog items that don't exist in that file yet (i.e. rows
  // added to master data after the static file was last generated).
  private translateRequestId = 0;
  private staticCatalogCache = new Map<string, Record<string, string>>();
  translatedLabels = signal<Record<string, string>>({});

  constructor(
    private http: HttpClient,
    private translate: TranslateService,
    private bulkTranslation: BulkTranslationService,
  ) {
    this.translate.onLangChange.subscribe((event) => {
      if (event.lang === 'en') {
        this.translateRequestId++;
        this.translatedLabels.set({});
      } else {
        this.translateAllCatalogs(event.lang);
      }
    });
  }

  /** Translated label for a catalog entry, falling back to the original if not yet translated. */
  translateLabel(prefix: string, id: number | string, fallback: string): string {
    return this.translatedLabels()[`${prefix}_${id}`] ?? fallback;
  }

  /** Loads and caches the pre-generated static catalog-translation file for a language. */
  private async loadStaticCatalogFile(lang: string): Promise<Record<string, string>> {
    if (this.staticCatalogCache.has(lang)) return this.staticCatalogCache.get(lang)!;
    try {
      const data = await firstValueFrom(
        this.http.get<Record<string, string>>(`assets/master-data-i18n/${lang}.json`),
      );
      this.staticCatalogCache.set(lang, data);
      return data;
    } catch {
      // No static file generated yet for this language — everything falls
      // through to the live API below.
      this.staticCatalogCache.set(lang, {});
      return {};
    }
  }

  private async translateAllCatalogs(lang: string): Promise<void> {
    const myRequestId = ++this.translateRequestId;
    if (lang === 'en') return;

    const fields: Record<string, string> = {};
    this.countries().forEach(c => { if (c.name) fields[`country_${c.id}`] = c.name; });
    this.jobTitles().forEach(j => { if (j.title) fields[`jobTitle_${j.id}`] = j.title; });
    this.occupations().forEach(o => { if (o.name) fields[`occupation_${o.id}`] = o.name; });
    this.industries().forEach(i => { if (i.name) fields[`industry_${i.id}`] = i.name; });
    this.languages().forEach(l => { if (l.name) fields[`language_${l.id}`] = l.name; });
    this.degrees().forEach(d => { if (d.name) fields[`degree_${d.id}`] = d.name; });
    this.fieldsOfStudy().forEach(f => { if (f.name) fields[`fieldOfStudy_${f.id}`] = f.name; });
    this.noticePeriods().forEach(n => { if (n.label) fields[`noticePeriod_${n.id}`] = n.label; });
    this.hobbies().forEach(h => { if (h.name) fields[`hobby_${h.id}`] = h.name; });

    if (Object.keys(fields).length === 0) return;

    try {
      const staticData = await this.loadStaticCatalogFile(lang);
      if (myRequestId !== this.translateRequestId) return;

      const result: Record<string, string> = {};
      const missing: Record<string, string> = {};
      for (const [key, englishVal] of Object.entries(fields)) {
        if (staticData[key]) result[key] = staticData[key];
        else missing[key] = englishVal;
      }

      // Only catalog rows added after the static file was generated (or,
      // before one exists at all for this language) reach the live API.
      if (Object.keys(missing).length > 0) {
        console.log(`[MasterDataService] ${Object.keys(missing).length} catalog item(s) not in the static "${lang}" file — translating live.`);
        const liveTranslated = await this.bulkTranslation.translateSection(missing, lang);
        if (myRequestId !== this.translateRequestId) return;
        Object.assign(result, liveTranslated);
      }

      this.translatedLabels.set(result);
    } catch (error) {
      console.error('Error translating master data catalogs:', error);
    }
  }

  /**
   * Invalidate the in-memory cache so the next loadAll() call re-fetches
   * from the server. Called by AdminMasterService after any mutation.
   */
  invalidate(): void {
    this.loaded = false;
  }

  /** Call once on app init (or lazily on first form load) */
  async loadAll(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;

    const [countries, jobTitles, occupations, industries, languages, degrees, fieldsOfStudy, currencies, noticePeriods, hobbies] =
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
        firstValueFrom(this.http.get<MasterHobby[]>(`${this.base}/hobbies`)),
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
    this.hobbies.set(hobbies);

    const lang = this.translate.currentLang || 'en';
    if (lang !== 'en') this.translateAllCatalogs(lang);
  }

  /** Load cities for a given country_id (cached) */
  async loadCities(countryId: number): Promise<void> {
    if (!countryId) { this.cities.set([]); return; }
    if (this.cityCache.has(countryId)) {
      this.cities.set(this.cityCache.get(countryId)!);
      return;
    }
    // Don't clear cities before fetch — avoid flickering the selected value away
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

  // ── Static-first resolution for candidate field values ──────────────────────
  // A candidate's job_title/occupation/industry/current_country/nationality/
  // hobbies/degree/field_of_study/languages are picked from these same fixed
  // catalogs, so their translations already exist in the static
  // master-data-i18n files. Consumers (candidate-profile, edit-request, etc.)
  // should resolve these values here instead of sending them to the live
  // /translate endpoint, which should only ever see genuine free text (bio,
  // company names, descriptions, cities, ...).

  private findCatalogId(category: MasterCatalogCategory, value: string): number | null {
    switch (category) {
      case 'country':      return this.countries().find(c => c.name === value)?.id ?? null;
      case 'jobTitle':      return this.jobTitles().find(j => j.title === value)?.id ?? null;
      case 'occupation':    return this.occupations().find(o => o.name === value)?.id ?? null;
      case 'industry':      return this.industries().find(i => i.name === value)?.id ?? null;
      case 'language':      return this.languages().find(l => l.name === value)?.id ?? null;
      case 'degree':        return this.degrees().find(d => d.name === value)?.id ?? null;
      case 'fieldOfStudy':  return this.fieldsOfStudy().find(f => f.name === value)?.id ?? null;
      case 'noticePeriod':  return this.noticePeriods().find(n => n.label === value)?.id ?? null;
      case 'hobby':         return this.hobbies().find(h => h.name === value)?.id ?? null;
    }
  }

  /**
   * Resolve a batch of candidate field values against the static
   * master-data-i18n file for `lang` — no live API call. `fields` maps an
   * arbitrary caller-defined key to the catalog category + English value.
   * Returns `resolved` (found in the static file) and `missing` (value isn't
   * a recognized catalog entry, or is a catalog row added after the static
   * file was generated) so the caller can still fall back to
   * BulkTranslationService.translateSection() for just the `missing` ones.
   */
  async resolveCatalogValues(
    fields: Record<string, { category: MasterCatalogCategory; value: string }>,
    lang: string,
  ): Promise<{ resolved: Record<string, string>; missing: Record<string, string> }> {
    const resolved: Record<string, string> = {};
    const missing: Record<string, string> = {};
    if (lang === 'en') return { resolved, missing };

    const staticData = await this.loadStaticCatalogFile(lang);
    for (const [key, { category, value }] of Object.entries(fields)) {
      if (!value) continue;
      const id = this.findCatalogId(category, value);
      const translated = id != null ? staticData[`${category}_${id}`] : undefined;
      if (translated) resolved[key] = translated;
      else missing[key] = value;
    }
    return { resolved, missing };
  }
}

export type MasterCatalogCategory =
  | 'country' | 'jobTitle' | 'occupation' | 'industry' | 'language'
  | 'degree' | 'fieldOfStudy' | 'noticePeriod' | 'hobby';
