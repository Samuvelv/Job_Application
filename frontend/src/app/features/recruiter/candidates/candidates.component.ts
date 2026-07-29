// src/app/features/recruiter/candidates/candidates.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
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
        <div class="cl-grid">
          @for (emp of candidates; track emp.id) {
            <app-recruiter-candidate-card
              [candidate]="emp"
              [interestRequest]="interestMap.get(emp.id) ?? null"
              [isShortlisted]="shortlistedIds.has(emp.id)"
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
export class CandidatesComponent implements OnInit {
  @ViewChild('filterSidebar') filterSidebar!: CandidateFilterSidebarComponent;

  candidates: Candidate[] = [];
  pagination = { page: 1, limit: 12, total: 0, pages: 0 };
  loading = false;
  shortlistedIds = new Set<string>();
  shortlisting: string | null = null;
  sidebarVisible = true;
  sidebarActiveCount = 0;
  hasActiveFilters = false;

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
