// src/app/features/admin/edit-requests/edit-requests.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { EditRequestService } from '../../../core/services/edit-request.service';
import { ContactRequestService } from '../../../core/services/contact-request.service';
import { EditRequest, EditRequestType } from '../../../core/models/edit-request.model';
import { ContactRequest } from '../../../core/models/contact-request.model';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { EditRequestCardComponent } from '../../../shared/components/edit-request-card/edit-request-card.component';
import { ContactRequestCardComponent } from '../../../shared/components/contact-request-card/contact-request-card.component';

@Component({
  selector: 'app-edit-requests',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PageHeaderComponent, EmptyStateComponent, EditRequestCardComponent, ContactRequestCardComponent],
  styles: [`
    .filter-bar {
      background: var(--th-surface);
      border: 1px solid var(--th-border);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .filter-bar__row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: flex-end;
    }
    .filter-bar__group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1 1 160px;
      min-width: 140px;
    }
    .filter-bar__group--wide {
      flex: 2 1 220px;
    }
    .filter-bar__label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--th-muted);
    }
    .filter-bar__input {
      height: 38px;
      border-radius: 8px;
      border: 1px solid var(--th-border-strong);
      padding: 0 10px;
      font-size: 14px;
      background: var(--th-surface-2);
      color: var(--th-text);
      transition: border-color 0.15s, background 0.15s;
      width: 100%;
    }
    .filter-bar__input:focus {
      outline: none;
      border-color: var(--th-primary);
      background: var(--th-surface);
    }
    .filter-bar__select {
      height: 38px;
      border-radius: 8px;
      border: 1px solid var(--th-border-strong);
      padding: 0 10px;
      font-size: 14px;
      background: var(--th-surface-2);
      color: var(--th-text);
      width: 100%;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .filter-bar__select:focus {
      outline: none;
      border-color: var(--th-primary);
    }
    .filter-bar__select option {
      background: var(--th-surface);
      color: var(--th-text);
    }
    .filter-bar__clear {
      height: 38px;
      padding: 0 14px;
      border-radius: 8px;
      border: 1px solid var(--th-border-strong);
      background: transparent;
      color: var(--th-muted);
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      transition: all 0.15s;
      align-self: flex-end;
    }
    .filter-bar__clear:hover {
      border-color: var(--th-danger);
      color: var(--th-danger);
      background: var(--th-danger-soft);
    }
    .filter-bar__active-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--th-primary);
      color: #fff;
      font-size: 10px;
      font-weight: 700;
    }
  `],
  template: `
    <app-page-header
      title="Requests"
      [subtitle]="activeSection === 'edit' ? (editPagination.total + ' edit requests') : (contactPagination.total + ' contact requests')"
      icon="bi-inbox-fill"
    />

    <!-- Section toggle -->
    <div class="req-section-toggle mb-4">
      <button class="req-section-btn"
        [class.active]="activeSection === 'edit'"
        (click)="setSection('edit')">
        <i class="bi bi-pencil-square"></i>
        Candidate Edit Requests
        @if (editPendingCount > 0) {
          <span class="req-section-badge">{{ editPendingCount }}</span>
        }
      </button>
      <button class="req-section-btn"
        [class.active]="activeSection === 'contact'"
        (click)="setSection('contact')">
        <i class="bi bi-person-lines-fill"></i>
        Contact Info Requests
        @if (contactPendingCount > 0) {
          <span class="req-section-badge">{{ contactPendingCount }}</span>
        }
      </button>
    </div>

    <!-- ── EDIT REQUESTS SECTION ── -->
    @if (activeSection === 'edit') {

      <!-- Filter bar -->
      <div class="filter-bar">
        <div class="filter-bar__row">

          <!-- Search -->
          <div class="filter-bar__group filter-bar__group--wide">
            <span class="filter-bar__label"><i class="bi bi-search me-1"></i>Search candidate</span>
            <input
              class="filter-bar__input"
              type="text"
              placeholder="Search by candidate name…"
              [(ngModel)]="editSearch"
              (ngModelChange)="onEditSearchChange($event)"
            />
          </div>

          <!-- Request Type -->
          <div class="filter-bar__group">
            <span class="filter-bar__label"><i class="bi bi-tag me-1"></i>Request type</span>
            <select class="filter-bar__select" [(ngModel)]="editRequestType" (ngModelChange)="onEditFilterChange()">
              <option value="">All types</option>
              <option value="personal">Personal Info</option>
              <option value="professional">Professional</option>
              <option value="location">Location</option>
              <option value="salary">Salary</option>
              <option value="skills">Skills</option>
              <option value="languages">Languages</option>
              <option value="experience">Experience</option>
              <option value="education">Education</option>
            </select>
          </div>

          <!-- Date From -->
          <div class="filter-bar__group">
            <span class="filter-bar__label"><i class="bi bi-calendar me-1"></i>Date from</span>
            <input
              class="filter-bar__input"
              type="date"
              [(ngModel)]="editDateFrom"
              (ngModelChange)="onEditFilterChange()"
            />
          </div>

          <!-- Date To -->
          <div class="filter-bar__group">
            <span class="filter-bar__label"><i class="bi bi-calendar-check me-1"></i>Date to</span>
            <input
              class="filter-bar__input"
              type="date"
              [(ngModel)]="editDateTo"
              (ngModelChange)="onEditFilterChange()"
            />
          </div>

          <!-- Clear filters -->
          @if (editActiveFilterCount > 0) {
            <button class="filter-bar__clear" (click)="clearEditFilters()">
              <i class="bi bi-x-lg"></i>
              Clear
              <span class="filter-bar__active-badge">{{ editActiveFilterCount }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Status filter tabs -->
      <div class="nav-pills-custom mb-4">
        @for (tab of statusTabs; track tab.value) {
          <button class="nav-pill"
            [class.active]="editStatus === tab.value"
            (click)="setEditStatus(tab.value)">
            {{ tab.label }}
          </button>
        }
      </div>

      @if (editLoading) {
        <div class="loading-state">
          <div class="spinner-border"></div>
          <div class="loading-state__text">Loading requests…</div>
        </div>
      } @else if (editRequests.length === 0) {
        <app-empty-state
          icon="bi-inbox"
          title="No edit requests found"
          [subtitle]="editActiveFilterCount > 0 ? 'No results match your current filters. Try adjusting your search.' : 'Edit requests submitted by candidates will appear here.'"
        />
      } @else {
        <div class="row g-3">
          @for (req of editRequests; track req.id) {
            <div class="col-xxl-3 col-lg-4 col-md-6 col-12">
              <app-edit-request-card
                [request]="req"
                [isAdmin]="true"
                [isRecruiter]="false"
                (approved)="onEditApproved($event)"
                (rejected)="onEditRejected($event)"
                (cancelled)="onEditReviewCancelled()">
              </app-edit-request-card>
            </div>
          }
        </div>

        @if (editPagination.pages > 1) {
          <nav class="mt-4 d-flex justify-content-center">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" [class.disabled]="editPagination.page === 1">
                <button class="page-link" (click)="goToEditPage(editPagination.page - 1)">«</button>
              </li>
              @for (pg of editPageNumbers(); track pg) {
                <li class="page-item" [class.active]="pg === editPagination.page">
                  <button class="page-link" (click)="goToEditPage(pg)">{{ pg }}</button>
                </li>
              }
              <li class="page-item" [class.disabled]="editPagination.page === editPagination.pages">
                <button class="page-link" (click)="goToEditPage(editPagination.page + 1)">»</button>
              </li>
            </ul>
          </nav>
        }
      }
    }

    <!-- ── CONTACT REQUESTS SECTION ── -->
    @if (activeSection === 'contact') {

      <!-- Filter bar -->
      <div class="filter-bar">
        <div class="filter-bar__row">

          <!-- Search -->
          <div class="filter-bar__group filter-bar__group--wide">
            <span class="filter-bar__label"><i class="bi bi-search me-1"></i>Search</span>
            <input
              class="filter-bar__input"
              type="text"
              placeholder="Search by recruiter or candidate name…"
              [(ngModel)]="contactSearch"
              (ngModelChange)="onContactSearchChange($event)"
            />
          </div>

          <!-- Date From -->
          <div class="filter-bar__group">
            <span class="filter-bar__label"><i class="bi bi-calendar me-1"></i>Date from</span>
            <input
              class="filter-bar__input"
              type="date"
              [(ngModel)]="contactDateFrom"
              (ngModelChange)="onContactFilterChange()"
            />
          </div>

          <!-- Date To -->
          <div class="filter-bar__group">
            <span class="filter-bar__label"><i class="bi bi-calendar-check me-1"></i>Date to</span>
            <input
              class="filter-bar__input"
              type="date"
              [(ngModel)]="contactDateTo"
              (ngModelChange)="onContactFilterChange()"
            />
          </div>

          <!-- Clear filters -->
          @if (contactActiveFilterCount > 0) {
            <button class="filter-bar__clear" (click)="clearContactFilters()">
              <i class="bi bi-x-lg"></i>
              Clear
              <span class="filter-bar__active-badge">{{ contactActiveFilterCount }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Status filter tabs -->
      <div class="nav-pills-custom mb-4">
        @for (tab of statusTabs; track tab.value) {
          <button class="nav-pill"
            [class.active]="contactStatus === tab.value"
            (click)="setContactStatus(tab.value)">
            {{ tab.label }}
          </button>
        }
      </div>

      @if (contactLoading) {
        <div class="loading-state">
          <div class="spinner-border"></div>
          <div class="loading-state__text">Loading requests…</div>
        </div>
      } @else if (contactRequests.length === 0) {
        <app-empty-state
          icon="bi-person-lines-fill"
          title="No contact requests found"
          [subtitle]="contactActiveFilterCount > 0 ? 'No results match your current filters. Try adjusting your search.' : 'Contact info requests from recruiters will appear here.'"
        />
      } @else {
        <div class="row g-3">
          @for (req of contactRequests; track req.id) {
            <div class="col-xxl-3 col-lg-4 col-md-6 col-12">
              <app-contact-request-card
                [request]="req"
                [isAdmin]="true"
                [isRecruiter]="false"
                (approved)="onContactApproved($event)"
                (rejected)="onContactRejected($event)"
                (cancelled)="onContactReviewCancelled()">
              </app-contact-request-card>
            </div>
          }
        </div>

        @if (contactPagination.pages > 1) {
          <nav class="mt-4 d-flex justify-content-center">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" [class.disabled]="contactPagination.page === 1">
                <button class="page-link" (click)="goToContactPage(contactPagination.page - 1)">«</button>
              </li>
              @for (pg of contactPageNumbers(); track pg) {
                <li class="page-item" [class.active]="pg === contactPagination.page">
                  <button class="page-link" (click)="goToContactPage(pg)">{{ pg }}</button>
                </li>
              }
              <li class="page-item" [class.disabled]="contactPagination.page === contactPagination.pages">
                <button class="page-link" (click)="goToContactPage(contactPagination.page + 1)">»</button>
              </li>
            </ul>
          </nav>
        }
      }
    }
  `,
})
export class EditRequestsComponent implements OnInit, OnDestroy {
  activeSection: 'edit' | 'contact' = 'edit';

  // Edit requests state
  editRequests: EditRequest[] = [];
  editPagination = { page: 1, limit: 10, total: 0, pages: 0 };
  editLoading = false;
  editStatus = 'pending';
  editReviewingId: string | null = null;
  editPendingCount = 0;

  // Edit filter state
  editSearch = '';
  editDateFrom = '';
  editDateTo = '';
  editRequestType: EditRequestType | '' = '';

  // Contact requests state
  contactRequests: ContactRequest[] = [];
  contactPagination = { page: 1, limit: 10, total: 0, pages: 0 };
  contactLoading = false;
  contactStatus = 'pending';
  contactReviewingId: string | null = null;
  contactPendingCount = 0;

  // Contact filter state
  contactSearch = '';
  contactDateFrom = '';
  contactDateTo = '';

  // Shared review form
  reviewForm: FormGroup;
  reviewSubmitting = false;

  statusTabs = [
    { label: 'Pending',  value: 'pending'  },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'All',      value: ''         },
  ];

  // Debounce subjects
  private editSearch$    = new Subject<string>();
  private contactSearch$ = new Subject<string>();
  private destroy$       = new Subject<void>();

  private readonly fieldLabels: Record<string, string> = {
    first_name: 'First Name', last_name: 'Last Name', phone: 'Phone',
    date_of_birth: 'Date of Birth', gender: 'Gender', bio: 'Bio',
    linkedin_url: 'LinkedIn', job_title: 'Job Title', occupation: 'Occupation',
    industry: 'Industry', years_experience: 'Yrs Experience',
    current_country: 'Country', current_city: 'City', nationality: 'Nationality',
    salary_min: 'Salary Min', salary_max: 'Salary Max',
    salary_currency: 'Currency', salary_type: 'Salary Type',
    skills: 'Skills', languages: 'Languages',
    experience: 'Work Experience', education: 'Education',
  };

  constructor(
    private fb: FormBuilder,
    private editRequestService: EditRequestService,
    private contactRequestService: ContactRequestService,
    private toast: ToastService,
  ) {
    this.reviewForm = this.fb.group({ admin_note: [''] });
  }

  ngOnInit(): void {
    // Wire up debounced search for edit section (300 ms)
    this.editSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      this.editPagination.page = 1;
      this.loadEditRequests();
    });

    // Wire up debounced search for contact section (300 ms)
    this.contactSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      this.contactPagination.page = 1;
      this.loadContactRequests();
    });

    this.loadEditRequests();
    this.loadContactRequests();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Section toggle ─────────────────────────────────────────────────────────

  setSection(section: 'edit' | 'contact'): void {
    this.activeSection = section;
    this.cancelReview();
  }

  // ── Edit filter helpers ────────────────────────────────────────────────────

  get editActiveFilterCount(): number {
    return [this.editSearch, this.editDateFrom, this.editDateTo, this.editRequestType]
      .filter(v => !!v).length;
  }

  onEditSearchChange(value: string): void {
    this.editSearch$.next(value);
  }

  onEditFilterChange(): void {
    this.editPagination.page = 1;
    this.loadEditRequests();
  }

  clearEditFilters(): void {
    this.editSearch      = '';
    this.editDateFrom    = '';
    this.editDateTo      = '';
    this.editRequestType = '';
    this.editPagination.page = 1;
    this.loadEditRequests();
  }

  // ── Contact filter helpers ─────────────────────────────────────────────────

  get contactActiveFilterCount(): number {
    return [this.contactSearch, this.contactDateFrom, this.contactDateTo]
      .filter(v => !!v).length;
  }

  onContactSearchChange(value: string): void {
    this.contactSearch$.next(value);
  }

  onContactFilterChange(): void {
    this.contactPagination.page = 1;
    this.loadContactRequests();
  }

  clearContactFilters(): void {
    this.contactSearch   = '';
    this.contactDateFrom = '';
    this.contactDateTo   = '';
    this.contactPagination.page = 1;
    this.loadContactRequests();
  }

  // ── Edit requests ──────────────────────────────────────────────────────────

  loadEditRequests(): void {
    this.editLoading = true;
    this.editRequestService.list({
      status:       (this.editStatus as any) || undefined,
      search:       this.editSearch       || undefined,
      date_from:    this.editDateFrom     || undefined,
      date_to:      this.editDateTo       || undefined,
      request_type: (this.editRequestType as EditRequestType) || undefined,
      page:         this.editPagination.page,
      limit:        this.editPagination.limit,
    }).subscribe({
      next: (res) => {
        this.editLoading    = false;
        this.editRequests   = res.data;
        this.editPagination = res.pagination;
      },
      error: () => (this.editLoading = false),
    });
    // Also load pending count for badge
    this.editRequestService.list({ status: 'pending', page: 1, limit: 1 }).subscribe({
      next: (res) => (this.editPendingCount = res.pagination.total),
    });
  }

  setEditStatus(status: string): void {
    this.editStatus          = status;
    this.editPagination.page = 1;
    this.loadEditRequests();
  }

  goToEditPage(page: number): void {
    if (page < 1 || page > this.editPagination.pages) return;
    this.editPagination.page = page;
    this.loadEditRequests();
  }

  editPageNumbers(): number[] {
    return this._pageNumbers(this.editPagination);
  }

  getEditChanges(req: EditRequest): { key: string; label: string; display: string }[] {
    const data = req.requested_data ?? {};
    return Object.entries(data)
      .filter(([k]) => k !== 'id' && k !== 'user_id')
      .map(([k, v]) => ({
        key:     k,
        label:   this.fieldLabels[k] ?? k,
        display: Array.isArray(v) ? JSON.stringify(v) : String(v ?? '—'),
      }));
  }

  startEditReview(id: string): void { this.editReviewingId = id; this.reviewForm.reset(); }

  confirmEditReview(id: string, status: 'approved' | 'rejected'): void {
    this.reviewSubmitting = true;
    const admin_note = this.reviewForm.value.admin_note || undefined;
    this.editRequestService.review(id, { status, admin_note }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.editReviewingId  = null;
        this.toast.success(`Request ${status}`);
        this.loadEditRequests();
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.toast.error(err?.error?.message ?? 'Failed to review');
      },
    });
  }

  // ── Contact requests ────────────────────────────────────────────────────────

  loadContactRequests(): void {
    this.contactLoading = true;
    this.contactRequestService.list({
      status:    this.contactStatus || undefined,
      search:    this.contactSearch    || undefined,
      date_from: this.contactDateFrom  || undefined,
      date_to:   this.contactDateTo    || undefined,
      page:      this.contactPagination.page,
      limit:     this.contactPagination.limit,
    }).subscribe({
      next: (res) => {
        this.contactLoading    = false;
        this.contactRequests   = res.data;
        this.contactPagination = res.pagination;
      },
      error: () => (this.contactLoading = false),
    });
    // Pending count for badge
    this.contactRequestService.list({ status: 'pending', page: 1, limit: 1 }).subscribe({
      next: (res) => (this.contactPendingCount = res.pagination.total),
    });
  }

  setContactStatus(status: string): void {
    this.contactStatus          = status;
    this.contactPagination.page = 1;
    this.loadContactRequests();
  }

  goToContactPage(page: number): void {
    if (page < 1 || page > this.contactPagination.pages) return;
    this.contactPagination.page = page;
    this.loadContactRequests();
  }

  contactPageNumbers(): number[] {
    return this._pageNumbers(this.contactPagination);
  }

  startContactReview(id: string): void { this.contactReviewingId = id; this.reviewForm.reset(); }

  confirmContactReview(id: string, status: 'approved' | 'rejected'): void {
    this.reviewSubmitting    = true;
    const admin_note = this.reviewForm.value.admin_note || undefined;
    this.contactRequestService.review(id, { status, admin_note }).subscribe({
      next: () => {
        this.reviewSubmitting    = false;
        this.contactReviewingId  = null;
        this.toast.success(`Request ${status}`);
        this.loadContactRequests();
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.toast.error(err?.error?.message ?? 'Failed to review');
      },
    });
  }

  onEditApproved(event: { id: string; adminNote?: string }): void {
    this.reviewSubmitting = true;
    this.editRequestService.review(event.id, { status: 'approved', admin_note: event.adminNote }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.toast.success('Request approved');
        this.loadEditRequests();
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.toast.error(err?.error?.message ?? 'Failed to review');
      },
    });
  }

  onEditRejected(event: { id: string; adminNote?: string }): void {
    this.reviewSubmitting = true;
    this.editRequestService.review(event.id, { status: 'rejected', admin_note: event.adminNote }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.toast.success('Request rejected');
        this.loadEditRequests();
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.toast.error(err?.error?.message ?? 'Failed to review');
      },
    });
  }

  onEditReviewCancelled(): void {
    this.reviewSubmitting = false;
  }

  onContactApproved(event: { id: string; adminNote?: string }): void {
    this.reviewSubmitting = true;
    this.contactRequestService.review(event.id, { status: 'approved', admin_note: event.adminNote }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.toast.success('Request approved');
        this.loadContactRequests();
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.toast.error(err?.error?.message ?? 'Failed to review');
      },
    });
  }

  onContactRejected(event: { id: string; adminNote?: string }): void {
    this.reviewSubmitting = true;
    this.contactRequestService.review(event.id, { status: 'rejected', admin_note: event.adminNote }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.toast.success('Request rejected');
        this.loadContactRequests();
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.toast.error(err?.error?.message ?? 'Failed to review');
      },
    });
  }

  onContactReviewCancelled(): void {
    this.reviewSubmitting = false;
  }

  // ── Shared ────────────────────────────────────────────────────────────────

  cancelReview(): void {
    this.editReviewingId    = null;
    this.contactReviewingId = null;
  }

  private _pageNumbers(p: { page: number; pages: number }): number[] {
    const start = Math.max(1, p.page - 2);
    const end   = Math.min(p.pages, p.page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
}
