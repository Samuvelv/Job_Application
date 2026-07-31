// src/app/features/candidate/volunteers/volunteer-public-profile.component.ts
import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule }       from '@angular/forms';
import { forkJoin, of }      from 'rxjs';
import { catchError, takeUntil }        from 'rxjs/operators';
import { Subject } from 'rxjs';

import { VolunteerService }               from '../../../core/services/volunteer.service';
import { VolunteerSupportRequestService } from '../../../core/services/volunteer-support-request.service';
import { BulkTranslationService }        from '../../../core/services/bulk-translation.service';
import { LanguageService }              from '../../../core/services/language.service';
import { Volunteer }                      from '../../../core/models/volunteer.model';
import { VolunteerSupportRequest }        from '../../../core/models/volunteer-support-request.model';

@Component({
  selector: 'app-volunteer-public-profile',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterLink, FormsModule],
  template: `
    <!-- Back link -->
    <div class="mb-4">
      <a routerLink="/candidate/volunteers" class="back-link">
        <i class="bi bi-arrow-left me-1"></i>{{ 'VOLUNTEER_PROFILE.back_to_volunteers' | translate }}
      </a>
    </div>

    <!-- Loading -->
    @if (loading) {
      <div class="loading-state">
        <div class="spinner-border text-primary"></div>
        <div class="loading-state__text">{{ 'VOLUNTEER_PROFILE.loading_profile' | translate }}</div>
      </div>
    }

    <!-- Error -->
    @if (error && !loading) {
      <div class="alert alert-danger">{{ error }}</div>
    }

    @if (volunteer && !loading) {
      <!-- Hero card -->
      <div class="vpp-hero card mb-4">
        <div class="card-body d-flex align-items-center gap-4 flex-wrap">
          <!-- Avatar / photo -->
          @if (volunteer.photo_url) {
            <img [src]="volunteer.photo_url" [alt]="volunteer.name"
                 class="vpp-avatar vpp-avatar--photo" />
          } @else {
            <div class="vpp-avatar vpp-avatar--initials">
              {{ initials(volunteer.name) }}
            </div>
          }

           <!-- Name + availability -->
           <div class="flex-grow-1">
             <h2 class="vpp-name mb-1">{{ volunteer.name }}</h2>
             @if (volunteer.role) {
               @if (isTranslatingRole()) {
                 <p class="text-muted mb-2" style="opacity:.6">{{ 'COMMON.translating' | translate }}…</p>
               } @else {
                 <p class="text-muted mb-2">{{ translatedRole() || volunteer.role }}</p>
               }
             }
            <span class="badge"
              [class.bg-success]="volunteer.availability === 'Active'"
              [class.bg-warning]="volunteer.availability !== 'Active'"
              [class.text-dark]="volunteer.availability !== 'Active'">
              <i class="bi bi-circle-fill me-1" style="font-size:8px;"></i>
              {{ (volunteer.availability ?? 'Active') === 'Active' ? ('VOLUNTEERS.active' | translate) : ('VOLUNTEER_PROFILE.unavailable' | translate) }}
            </span>
          </div>

          <!-- Request Support CTA (desktop) -->
          <div class="d-none d-md-block">
            <ng-container *ngTemplateOutlet="requestBtn"></ng-container>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <!-- Left column -->
        <div class="col-lg-7">

          <!-- Journey card -->
          @if (volunteer.nationality || volunteer.country_placed) {
            <div class="card mb-4">
              <div class="card-header fw-semibold">
                <i class="bi bi-geo-alt-fill me-2 text-primary"></i>{{ 'VOLUNTEER_PROFILE.journey' | translate }}
              </div>
              <div class="card-body">
                <div class="vpp-journey">
                  @if (volunteer.nationality) {
                    <div class="vpp-journey__step">
                      <div class="vpp-journey__label">{{ 'VOLUNTEER_PROFILE.from_label' | translate }}</div>
                      <div class="vpp-journey__value">{{ translatedFields()['nationality'] || volunteer.nationality }}</div>
                    </div>
                    <div class="vpp-journey__arrow"><i class="bi bi-arrow-right"></i></div>
                  }
                  @if (volunteer.country_placed) {
                    <div class="vpp-journey__step">
                      <div class="vpp-journey__label">{{ 'VOLUNTEER_PROFILE.placed_in_label' | translate }}</div>
                      <div class="vpp-journey__value">{{ translatedFields()['country_placed'] || volunteer.country_placed }}</div>
                    </div>
                  }
                </div>
                @if (volunteer.company_joined || volunteer.year_placed) {
                  <div class="mt-3 d-flex gap-4 flex-wrap text-muted small">
                    @if (volunteer.company_joined) {
                      <span><i class="bi bi-building me-1"></i>{{ volunteer.company_joined }}</span>
                    }
                    @if (volunteer.year_placed) {
                      <span><i class="bi bi-calendar3 me-1"></i>{{ 'VOLUNTEER_PROFILE.placed_in_year' | translate:{ year: volunteer.year_placed } }}</span>
                    }
                  </div>
                }
              </div>
            </div>
          }

           <!-- Success story -->
           @if (volunteer.success_story) {
             <div class="card mb-4">
               <div class="card-header fw-semibold">
                 <i class="bi bi-chat-quote-fill me-2 text-primary"></i>{{ 'VOLUNTEER_PROFILE.success_story' | translate }}
               </div>
               <div class="card-body">
                 @if (isTranslatingStory()) {
                   <div style="display:flex;align-items:center;gap:.5rem;color:var(--th-muted);font-size:.875rem">
                     <span style="display:inline-block;width:14px;height:14px;border:2px solid var(--th-primary);border-right:2px solid transparent;border-radius:50%;animation:spin .6s linear infinite"></span>
                     {{ 'VOLUNTEER_PROFILE.translating_story' | translate }}
                   </div>
                 } @else {
                   <p class="vpp-story">{{ translatedStory() || volunteer.success_story }}</p>
                 }
               </div>
             </div>
           }

          <!-- Languages -->
          @if (volunteer.languages?.length) {
            <div class="card mb-4">
              <div class="card-header fw-semibold">
                <i class="bi bi-translate me-2 text-primary"></i>{{ 'VOLUNTEER_PROFILE.languages_spoken' | translate }}
              </div>
              <div class="card-body d-flex flex-wrap gap-2">
                @for (lang of volunteer.languages; track lang; let $index = $index) {
                  <span class="badge rounded-pill bg-primary-subtle text-primary-emphasis px-3 py-2">
                    {{ translatedFields()['lang_' + $index] || lang }}
                  </span>
                }
              </div>
            </div>
          }
        </div>

        <!-- Right column -->
        <div class="col-lg-5">

          <!-- Request Support card -->
          <div class="card mb-4 vpp-support-card">
            <div class="card-header fw-semibold">
              <i class="bi bi-hand-thumbsup-fill me-2 text-primary"></i>{{ 'VOLUNTEER_PROFILE.request_support' | translate }}
            </div>
            <div class="card-body">
              @if (alreadyRequested) {
                <!-- Already submitted -->
                <div class="text-center py-3">
                  <i class="bi bi-check-circle-fill text-success" style="font-size:2.5rem;"></i>
                  <p class="mt-3 mb-1 fw-semibold">{{ 'VOLUNTEER_PROFILE.support_requested_title' | translate }}</p>
                  <p class="text-muted small">
                    {{ 'VOLUNTEER_PROFILE.support_requested_desc' | translate:{ name: volunteer.name } }}
                  </p>
                  @if (myRequest?.status === 'connected') {
                    <span class="badge bg-success mt-2">{{ 'VOLUNTEER_PROFILE.status_connected' | translate }}</span>
                  } @else if (myRequest?.status === 'closed') {
                    <span class="badge bg-secondary mt-2">{{ 'VOLUNTEER_PROFILE.status_closed' | translate }}</span>
                  } @else {
                    <span class="badge bg-warning text-dark mt-2">{{ 'VOLUNTEER_PROFILE.status_pending_review' | translate }}</span>
                  }
                </div>
              } @else {
                <!-- Request form -->
                <p class="text-muted small mb-3">
                  {{ 'VOLUNTEER_PROFILE.request_support_desc' | translate:{ name: volunteer.name } }}
                </p>
                <div class="mb-3">
                  <label class="form-label fw-medium">{{ 'VOLUNTEER_PROFILE.message_label' | translate }} <span class="text-muted">({{ 'FORMS.optional' | translate }})</span></label>
                  <textarea class="form-control" rows="4"
                    [placeholder]="'VOLUNTEER_PAGE.support_request_placeholder' | translate"
                    [(ngModel)]="message" maxlength="500"></textarea>
                  <div class="form-text text-end">{{ message.length }}/500</div>
                </div>
                @if (submitError) {
                  <div class="alert alert-danger py-2 small">
                    <i class="bi bi-exclamation-triangle me-1"></i>{{ submitError }}
                  </div>
                }
                <button class="btn btn-primary w-100" (click)="submitRequest()"
                  [disabled]="submitting">
                  @if (submitting) {
                    <span class="spinner-border spinner-border-sm me-2"></span>{{ 'VOLUNTEER_PROFILE.sending' | translate }}
                  } @else {
                    <i class="bi bi-send-fill me-2"></i>{{ 'VOLUNTEER_PROFILE.send_support_request' | translate }}
                  }
                </button>
              }
            </div>
          </div>

          <!-- Stats card -->
          @if (volunteer.candidates_helped) {
            <div class="card mb-4">
              <div class="card-body text-center">
                <div class="vpp-stat-number">{{ volunteer.candidates_helped }}</div>
                <div class="text-muted small">{{ 'VOLUNTEER_PROFILE.candidates_helped' | translate }}</div>
              </div>
            </div>
          }

        </div>
      </div>

      <!-- Mobile: Request support button -->
      <div class="d-md-none mb-4">
        <ng-container *ngTemplateOutlet="requestBtn"></ng-container>
      </div>
    }

    <!-- Shared request button template (used on hero and mobile) -->
    <ng-template #requestBtn>
      @if (volunteer) {
        @if (alreadyRequested) {
          <button class="btn btn-success" disabled>
            <i class="bi bi-check-circle-fill me-2"></i>{{ 'VOLUNTEER_PROFILE.support_requested_btn' | translate }}
          </button>
        } @else {
          <button class="btn btn-primary" (click)="scrollToForm()">
            <i class="bi bi-hand-thumbsup-fill me-2"></i>{{ 'VOLUNTEER_PROFILE.request_support' | translate }}
          </button>
        }
      }
    </ng-template>
  `,
  styles: [`
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .back-link {
      color: var(--bs-primary);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .back-link:hover { text-decoration: underline; }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 60px 0;
    }
    .loading-state__text { color: var(--th-text-secondary); }

    /* Hero card */
    .vpp-hero { border-radius: 12px; }
    .vpp-name { font-size: 1.6rem; font-weight: 700; color: var(--th-text); }

    /* Avatar */
    .vpp-avatar {
      width: 96px; height: 96px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
    .vpp-avatar--photo { border: 3px solid var(--th-primary); }
    .vpp-avatar--initials {
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, var(--th-primary), #8b5cf6);
      color: #fff;
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: 2px;
    }

    /* Journey */
    .vpp-journey {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .vpp-journey__label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--th-text-secondary);
      font-weight: 600;
    }
    .vpp-journey__value {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--th-text);
    }
    .vpp-journey__arrow { font-size: 1.5rem; color: var(--th-primary); }

    /* Success story */
    .vpp-story {
      font-size: 1rem;
      line-height: 1.8;
      color: var(--th-text-secondary);
      white-space: pre-line;
    }

    /* Support card */
    .vpp-support-card { position: static; }
    @media (min-width: 992px) {
      .vpp-support-card { position: sticky; top: 80px; }
    }

    /* Stat */
    .vpp-stat-number {
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--bs-primary);
    }
  `],
})
export class VolunteerPublicProfileComponent implements OnInit, OnDestroy {
  volunteer:    Volunteer | null = null;
  myRequests:   VolunteerSupportRequest[] = [];
  loading = true;
  error   = '';

  // request form
  message     = '';
  submitting  = false;
  submitError = '';

  private bulkTranslation = inject(BulkTranslationService);
  private languageService = inject(LanguageService);
  private translate = inject(TranslateService);
  private destroy$ = new Subject<void>();

  // Translation state
  currentLanguage = signal<string>('en');
  translatedRole = signal<string>('');
  translatedStory = signal<string>('');
  /** Translated nationality, country_placed, and lang_{i} entries. */
  translatedFields = signal<Record<string, string>>({});
  isTranslatingRole = signal(false);
  isTranslatingStory = signal(false);

  constructor(
    private route:          ActivatedRoute,
    private volunteerSvc:   VolunteerService,
    private supportSvc:     VolunteerSupportRequestService,
  ) {}

  ngOnInit(): void {
    // Listen to language changes
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.currentLanguage.set(event.lang);
        this.bulkTranslation.clearCache();
        this.resetAllTranslations();
        if (event.lang !== 'en' && this.volunteer) {
          this.translateAllSections();
        }
      });

    // Set initial language
    this.currentLanguage.set(this.translate.currentLang || 'en');

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error = this.translate.instant('VOLUNTEER_PROFILE.invalid_volunteer_id'); this.loading = false; return; }

    forkJoin({
      vol:  this.volunteerSvc.getById(id),
      mine: this.supportSvc.getMine().pipe(catchError(() => of({ supportRequests: [] }))),
    }).subscribe({
      next: ({ vol, mine }) => {
        this.volunteer  = vol.volunteer;
        this.myRequests = mine.supportRequests;
        this.loading    = false;

        // Translate if not English
        if (this.currentLanguage() !== 'en') {
          this.translateAllSections();
        }
      },
      error: (err) => {
        this.error   = err?.error?.message ?? this.translate.instant('VOLUNTEER_PROFILE.load_failed');
        this.loading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private resetAllTranslations(): void {
    this.translatedRole.set('');
    this.translatedStory.set('');
    this.translatedFields.set({});
  }

  private async translateAllSections(): Promise<void> {
    if (this.currentLanguage() === 'en' || !this.volunteer) return;
    await Promise.all([
      this.translateRoleSection(),
      this.translateStorySection(),
      this.translateFieldsSection(),
    ]);
  }

  /** Translates nationality, country_placed, and spoken language names in one combined call. */
  private async translateFieldsSection(): Promise<void> {
    const v = this.volunteer;
    if (!v || this.currentLanguage() === 'en') return;

    const requestedLang = this.currentLanguage();
    const fields: Record<string, string> = {};
    if (v.nationality) fields['nationality'] = v.nationality;
    if (v.country_placed) fields['country_placed'] = v.country_placed;
    v.languages?.forEach((lang, i) => { if (lang) fields[`lang_${i}`] = lang; });

    if (Object.keys(fields).length === 0) return;

    try {
      const translated = await this.bulkTranslation.translateSection(fields, requestedLang);
      if (this.currentLanguage() !== requestedLang) return;
      this.translatedFields.set(translated);
    } catch (error) {
      console.error('Error translating volunteer fields:', error);
    }
  }

  private async translateRoleSection(): Promise<void> {
    if (!this.volunteer?.role || this.currentLanguage() === 'en') return;
    
    this.isTranslatingRole.set(true);
    try {
      const translated = await this.bulkTranslation.translateSection(
        { role: this.volunteer.role },
        this.currentLanguage()
      );
      this.translatedRole.set(translated['role'] || '');
    } catch (error) {
      console.error('Error translating role section:', error);
    } finally {
      this.isTranslatingRole.set(false);
    }
  }

  private async translateStorySection(): Promise<void> {
    if (!this.volunteer?.success_story || this.currentLanguage() === 'en') return;
    
    this.isTranslatingStory.set(true);
    try {
      const translated = await this.bulkTranslation.translateSection(
        { story: this.volunteer.success_story },
        this.currentLanguage()
      );
      this.translatedStory.set(translated['story'] || '');
    } catch (error) {
      console.error('Error translating success story:', error);
    } finally {
      this.isTranslatingStory.set(false);
    }
  }

  /** True if an active (pending or connected) request exists for this volunteer */
  get alreadyRequested(): boolean {
    return this.myRequests.some(
      r => r.volunteer_id === this.volunteer?.id && r.status !== 'closed',
    );
  }

  /** The existing request (for status badge) */
  get myRequest(): VolunteerSupportRequest | undefined {
    return this.myRequests.find(
      r => r.volunteer_id === this.volunteer?.id && r.status !== 'closed',
    );
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  scrollToForm(): void {
    document.querySelector('.vpp-support-card')?.scrollIntoView({ behavior: 'smooth' });
  }

  submitRequest(): void {
    if (!this.volunteer) return;
    this.submitting  = true;
    this.submitError = '';

    this.supportSvc.create(this.volunteer.id, this.message || undefined).subscribe({
      next: (res) => {
        this.myRequests = [...this.myRequests, res.supportRequest];
        this.submitting = false;
        this.message    = '';
      },
      error: (err) => {
        this.submitting  = false;
        this.submitError = err?.error?.message ?? this.translate.instant('VOLUNTEER_PROFILE.submit_request_failed');
      },
    });
  }
}

