// src/app/features/recruiter/candidates/candidates.component.ts
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, of, Subject, takeUntil } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CandidateService, PaginatedCandidates } from '../../../core/services/candidate.service';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { InterestRequestService, InterestRequest } from '../../../core/services/interest-request.service';
import { Candidate, CandidateFilters } from '../../../core/models/candidate.model';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { CandidateFilterSidebarComponent } from '../../../shared/components/candidate-filter-sidebar/candidate-filter-sidebar.component';
import { RecruiterCandidateCardComponent } from '../../../shared/components/recruiter-candidate-card/recruiter-candidate-card.component';
import { BulkTranslationService } from '../../../core/services/bulk-translation.service';

@Component({
  selector: 'app-candidates',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TranslateModule,
    PageHeaderComponent, EmptyStateComponent,
    CandidateFilterSidebarComponent,
    RecruiterCandidateCardComponent,
  ],
  template: `
    <app-page-header
      [title]="'RECRUITER_CANDIDATES.title' | translate"
      [subtitle]="('RECRUITER_CANDIDATES.subtitle' | translate: { count: pagination.total })"
          icon="bi-person-lines-fill"
    />

    <!-- Top search bar -->
    <div class="cfs-topbar mb-3">
      <div class="cfs-topbar__search">
        <i class="bi bi-search"></i>
        <input type="text" class="form-control form-control-sm"
          [formControl]="searchCtrl"
          [placeholder]="'RECRUITER_CANDIDATES.search_placeholder' | translate"
          (keydown.enter)="doSearch()">
      </div>
      <div class="cfs-topbar__actions">
        <button type="button" class="filter-search-btn" (click)="doSearch()">
          <i class="bi bi-search"></i> {{ 'COMMON.search' | translate }}
        </button>
        <button type="button" class="cfs-toggle-sidebar-btn"
          [class.active]="sidebarVisible"
          (click)="toggleSidebar()">
          <i class="bi bi-sliders2"></i>
          <span class="d-none d-sm-inline">{{ 'COMMON.filters' | translate }}</span>
          @if (sidebarActiveCount > 0) {
            <span class="cfs-filter-badge">{{ sidebarActiveCount }}</span>
          }
        </button>
        @if (hasActiveFilters) {
          <button type="button" class="filter-clear-btn" (click)="clearAll()">
            <i class="bi bi-x-lg"></i> {{ 'COMMON.clear' | translate }}
          </button>
        }
      </div>
    </div>

    <!-- Filter sidebar -->
    <app-candidate-filter-sidebar
      #filterSidebar
      [showProfileStatus]="false"
      (filtersApplied)="onFiltersApplied($event)"
      (sidebarToggled)="onSidebarToggled($event)">
    </app-candidate-filter-sidebar>

    <!-- Results -->
    <div class="cfs-results">

      @if (loading) {
        <div class="loading-state">
          <div class="spinner-border"></div>
          <div class="loading-state__text">{{ 'RECRUITER_CANDIDATES.loading_results' | translate }}</div>
        </div>
      } @else if (candidates.length === 0) {
        <app-empty-state
      icon="bi-person-lines-fill"
          [title]="'RECRUITER_CANDIDATES.no_candidates' | translate"
          [subtitle]="'RECRUITER_CANDIDATES.no_candidates_sub' | translate"
        />
      } @else {
        @if (cardsTranslating) {
          <div class="d-flex align-items-center gap-2 mb-3" style="font-size:.8rem;color:var(--th-text-muted)">
            <span class="spinner-border spinner-border-sm"></span>
            {{ 'COMMON.translating' | translate }}…
          </div>
        }
        <div class="cl-grid">
          @for (emp of candidates; track emp.id) {
            <app-recruiter-candidate-card
              [candidate]="emp"
              [interestRequest]="interestMap.get(emp.id) ?? null"
              [isShortlisted]="shortlistedIds.has(emp.id)"
              [translated]="translatedCardsMap.get(emp.id) ?? null"
              (shortlist)="toggleShortlist(emp)"
              (requestInterest)="openRequestModal(emp)"
            />
          }
        </div>

        <!-- Pagination -->
        @if (pagination.pages > 1) {
          <nav class="mt-4 d-flex justify-content-center">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" [class.disabled]="pagination.page === 1">
                <button class="page-link" (click)="goToPage(pagination.page - 1)">«</button>
              </li>
              @for (pg of pageNumbers(); track pg) {
                <li class="page-item" [class.active]="pg === pagination.page">
                  <button class="page-link" (click)="goToPage(pg)">{{ pg }}</button>
                </li>
              }
              <li class="page-item" [class.disabled]="pagination.page === pagination.pages">
                <button class="page-link" (click)="goToPage(pagination.page + 1)">»</button>
              </li>
            </ul>
          </nav>
        }
      }

    </div>

    <!-- ── Interest Request Modal ── -->
    @if (modalCandidate) {
      <div class="modal-backdrop fade show" style="z-index:1050;" (click)="closeModal()"></div>
      <div class="modal d-block" style="z-index:1055;" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered" (click)="$event.stopPropagation()">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-send-fill me-2 text-primary"></i>
                {{ 'INTEREST_REQUESTS.request_modal_title' | translate }} — {{ modalCandidate.first_name }} {{ modalCandidate.last_name }}
              </h5>
              <button type="button" class="btn-close" (click)="closeModal()"></button>
            </div>
            <form [formGroup]="requestForm" (ngSubmit)="submitRequest()">
              <div class="modal-body">
                <div class="mb-3">
                  <label class="form-label fw-semibold">{{ 'INTEREST_REQUESTS.sector' | translate }} <span class="text-danger">*</span></label>
                  <input type="text" class="form-control" formControlName="sector"
                    [placeholder]="'INTEREST_REQUESTS.sector_placeholder' | translate">
                  @if (requestForm.get('sector')?.invalid && requestForm.get('sector')?.touched) {
                    <div class="text-danger small mt-1">{{ 'INTEREST_REQUESTS.sector_required' | translate }}</div>
                  }
                </div>
                <div class="mb-3">
                  <label class="form-label fw-semibold">{{ 'COMMON.country' | translate }} <span class="text-danger">*</span></label>
                  <input type="text" class="form-control" formControlName="country"
                    [placeholder]="'INTEREST_REQUESTS.country_placeholder' | translate">
                  @if (requestForm.get('country')?.invalid && requestForm.get('country')?.touched) {
                    <div class="text-danger small mt-1">{{ 'INTEREST_REQUESTS.country_required' | translate }}</div>
                  }
                </div>
                <div class="mb-3">
                  <label class="form-label fw-semibold">{{ 'COMMON.message' | translate }} <span class="text-danger">*</span></label>
                  <textarea class="form-control" rows="4" formControlName="message"
                    [placeholder]="'INTEREST_REQUESTS.message_placeholder' | translate"></textarea>
                  @if (requestForm.get('message')?.invalid && requestForm.get('message')?.touched) {
                    <div class="text-danger small mt-1">{{ 'INTEREST_REQUESTS.message_required' | translate }}</div>
                  }
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary btn-sm"
                  (click)="closeModal()" [disabled]="submitting">{{ 'COMMON.cancel' | translate }}</button>
                <button type="submit" class="btn btn-primary btn-sm"
                  [disabled]="requestForm.invalid || submitting">
                  @if (submitting) {
                    <span class="spinner-border spinner-border-sm me-1"></span>
                  }
                  {{ 'INTEREST_REQUESTS.submit_request' | translate }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }
  `,
})
export class CandidatesComponent implements OnInit, OnDestroy {
  @ViewChild('filterSidebar') filterSidebar!: CandidateFilterSidebarComponent;

  candidates: Candidate[] = [];
  pagination = { page: 1, limit: 12, total: 0, pages: 0 };
  loading = false;
  shortlistedIds = new Set<string>();
  shortlisting: string | null = null;
  sidebarVisible = true;
  sidebarActiveCount = 0;
  hasActiveFilters = false;

  /** AI-translated preview fields per candidate ID, for the current UI language. */
  translatedCardsMap = new Map<string, Record<string, string>>();
  /** True while translateCandidateCards() has an in-flight /translate call. */
  cardsTranslating = false;
  private destroy$ = new Subject<void>();
  /** Monotonic token so a stale in-flight translation (from a prior page/filter/
   *  language state) can never overwrite the result of a newer one that resolved first. */
  private translateRequestId = 0;

  /** Map of candidateId → most-recent InterestRequest for this recruiter */
  interestMap = new Map<string, InterestRequest>();

  /** Interest request modal state */
  modalCandidate: Candidate | null = null;
  submitting = false;
  requestForm: FormGroup;

  searchCtrl = new FormControl('');
  private sidebarFilters: CandidateFilters = {};

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private candidateService: CandidateService,
    private recruiterService: RecruiterService,
    private interestRequestService: InterestRequestService,
    private toast: ToastService,
    private translate: TranslateService,
    private bulkTranslation: BulkTranslationService,
  ) {
    this.requestForm = this.fb.group({
      sector:  ['', Validators.required],
      country: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  ngOnInit(): void {
    this.loadShortlist();
    this.load();

    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.bulkTranslation.clearCache();
        this.translatedCardsMap = new Map();
        this.translateCandidateCards();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Translate the preview fields (job title, occupation, industry, city,
   * country, top target location, first 4 skill names) shown on each
   * candidate card in the current results page, in a single combined
   * /translate call rather than one call per card.
   */
  private async translateCandidateCards(): Promise<void> {
    const myRequestId = ++this.translateRequestId;

    const lang = this.translate.currentLang || 'en';
    if (lang === 'en' || this.candidates.length === 0) return;

    const requestedLang = lang;
    const allFields: Record<string, string> = {};

    for (const c of this.candidates) {
      if (c.job_title)      allFields[`${c.id}__job_title`] = c.job_title;
      if (c.occupation)     allFields[`${c.id}__occupation`] = c.occupation;
      if (c.industry)       allFields[`${c.id}__industry`] = c.industry;
      if (c.current_city)   allFields[`${c.id}__city`] = c.current_city;
      if (c.current_country) allFields[`${c.id}__country`] = c.current_country;
      const target = c.target_locations?.[0];
      if (target) allFields[`${c.id}__target`] = target;
      c.skills?.slice(0, 4).forEach((s, i) => {
        if (s.skill_name) allFields[`${c.id}__skill_${i}`] = s.skill_name;
      });
    }

    if (Object.keys(allFields).length === 0) return;

    this.cardsTranslating = true;
    try {
      const translated = await this.bulkTranslation.translateSection(allFields, requestedLang);
      if (myRequestId !== this.translateRequestId) return; // a newer request superseded this one

      const map = new Map<string, Record<string, string>>();
      for (const [key, value] of Object.entries(translated)) {
        const idx = key.lastIndexOf('__');
        if (idx === -1) continue;
        const candidateId = key.slice(0, idx);
        const field = key.slice(idx + 2);
        if (!map.has(candidateId)) map.set(candidateId, {});
        map.get(candidateId)![field] = value;
      }
      this.translatedCardsMap = map;
    } catch (error) {
      console.error('Error translating candidate card previews:', error);
    } finally {
      if (myRequestId === this.translateRequestId) this.cardsTranslating = false;
    }
  }

  toggleSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
    if (this.sidebarVisible) this.filterSidebar.openSidebar();
    else this.filterSidebar.closeSidebar();
  }

  onSidebarToggled(open: boolean): void { this.sidebarVisible = open; }

  onFiltersApplied(filters: CandidateFilters): void {
    this.sidebarFilters = filters;
    this.sidebarActiveCount = Object.keys(filters).length;
    this.hasActiveFilters = this.sidebarActiveCount > 0 || !!this.searchCtrl.value;
    this.pagination.page = 1;
    this.load();
  }

  doSearch(): void {
    this.hasActiveFilters = Object.keys(this.sidebarFilters).length > 0 || !!this.searchCtrl.value;
    this.pagination.page = 1;
    this.load();
  }

  clearAll(): void {
    this.searchCtrl.setValue('');
    this.sidebarFilters = {};
    this.sidebarActiveCount = 0;
    this.hasActiveFilters = false;
    this.filterSidebar?.clearAll();
    this.pagination.page = 1;
    this.load();
  }

  loadShortlist(): void {
    this.recruiterService.getShortlist().subscribe({
      next: (res) => {
        this.shortlistedIds = new Set(res.shortlist.map((e) => e.candidate_id));
      },
    });
  }

  load(): void {
    this.loading = true;
    const params: CandidateFilters = {
      ...this.sidebarFilters,
      search: this.searchCtrl.value || undefined,
      page:   this.pagination.page,
      limit:  this.pagination.limit,
    };

    forkJoin({
      candidates: this.candidateService.list(params).pipe(
        catchError(() => of(null as unknown as PaginatedCandidates)),
      ),
      requests: this.interestRequestService.getMyRequests().pipe(
        catchError(() => of({ requests: [] as InterestRequest[] })),
      ),
    }).subscribe(({ candidates, requests }) => {
      this.loading = false;
      if (candidates) {
        this.candidates   = candidates.data;
        this.pagination   = candidates.pagination;
        this.translatedCardsMap = new Map();
        this.translateCandidateCards();
      }
      // Build map: candidateId → most-recent request (sorted by created_at desc)
      const sorted = [...(requests?.requests ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      this.interestMap = new Map<string, InterestRequest>();
      for (const req of sorted) {
        if (!this.interestMap.has(req.candidate_id)) {
          this.interestMap.set(req.candidate_id, req);
        }
      }
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination.pages) return;
    this.pagination.page = page;
    this.load();
  }

  pageNumbers(): number[] {
    return Array.from({ length: this.pagination.pages }, (_, i) => i + 1);
  }

  toggleShortlist(emp: Candidate): void {
    if (this.shortlistedIds.has(emp.id)) {
      this.recruiterService.removeFromShortlist(emp.id).subscribe({
        next: () => {
          const updated = new Set(this.shortlistedIds);
          updated.delete(emp.id);
          this.shortlistedIds = updated;
          this.toast.success(this.translate.instant('SHORTLIST.removed_success', { name: `${emp.first_name} ${emp.last_name}` }));
        },
        error: (err) => {
          this.toast.error(err?.error?.message ?? this.translate.instant('SHORTLIST.remove_failed'));
        },
      });
    } else {
      this.recruiterService.addToShortlist(emp.id).subscribe({
        next: () => {
          this.shortlistedIds = new Set([...this.shortlistedIds, emp.id]);
          this.toast.success(this.translate.instant('SHORTLIST.added_success', { name: `${emp.first_name} ${emp.last_name}` }));
        },
        error: (err) => {
          this.toast.error(err?.error?.message ?? this.translate.instant('SHORTLIST.add_failed'));
        },
      });
    }
  }

  openRequestModal(candidate: Candidate): void {
    this.modalCandidate = candidate;
    this.requestForm.reset();
    this.submitting = false;
  }

  closeModal(): void {
    this.modalCandidate = null;
    this.requestForm.reset();
  }

  submitRequest(): void {
    if (this.requestForm.invalid || !this.modalCandidate) return;
    this.submitting = true;
    const { sector, country, message } = this.requestForm.value;
    this.interestRequestService.create({
      candidate_id: this.modalCandidate.id,
      sector,
      country,
      message,
    }).subscribe({
      next: (res) => {
        this.submitting = false;
        // Add the new request to the map so the card immediately shows "Pending"
        this.interestMap.set(res.request.candidate_id, res.request);
        this.toast.success(this.translate.instant('RECRUITER_CANDIDATES.interest_submitted'));
        this.closeModal();
      },
      error: (err) => {
        this.submitting = false;
        this.toast.error(err?.error?.message ?? this.translate.instant('RECRUITER_CANDIDATES.interest_submit_failed'));
      },
    });
  }
}
